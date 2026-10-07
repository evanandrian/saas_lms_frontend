import { dev } from '$app/environment';
import type { BackendFailure, BackendResult } from '$lib/api/backend-call';
import { relayFile } from '$lib/api/backend-call';
import { hasBackendSession, storeBackendTokens } from '$lib/auth/backend-auth';
import { clientMeta } from '$lib/auth/finish-login';
import { fail, type Actions, type Cookies, type RequestEvent } from '@sveltejs/kit';
import {
	advanceStep,
	beginSignup,
	cancelOwnRegistration,
	checkNpsn,
	checkPayment,
	confirmSignupCode,
	fetchRegistrationFile,
	loadRegistration,
	loadSignupCatalog,
	loadSignupCities,
	removeFile,
	resendSignupCode,
	saveInstitution,
	savePlan,
	saveSetup,
	startPayment,
	submitApplication,
	uploadFile,
	type RegistrationApiContext,
	type SetupStep
} from './registration.api';

/**
 * Load & form action halaman Daftar & berlangganan (`/register`). Token tantangan OTP disimpan di
 * cookie HttpOnly (bukan di JavaScript browser); setelah OTP valid, sesi pemohon disimpan seperti login.
 */

const CHALLENGE_COOKIE = 'lms_signup_challenge';
const CHALLENGE_MAX_AGE_SECONDS = 15 * 60;
const COOKIE_OPTIONS = { path: '/', httpOnly: true, sameSite: 'lax', secure: !dev } as const;
const SETUP_STEPS: readonly SetupStep[] = ['profil', 'tahun', 'kelas', 'mapel'];

const HTTP_STATUS_BY_FAILURE: Record<BackendFailure, number> = {
	unauthenticated: 401,
	forbidden: 403,
	not_found: 404,
	conflict: 409,
	validation: 422,
	gone: 410,
	too_many: 429,
	unavailable: 503
};

export function registrationContext(event: RequestEvent): RegistrationApiContext {
	return {
		fetch: event.fetch,
		cookies: event.cookies,
		userAgent: event.request.headers.get('user-agent') ?? '',
		clientAddress: clientMeta(event).address
	};
}

export async function loadRegisterPage(event: RequestEvent) {
	const ctx = registrationContext(event);
	const catalog = await loadSignupCatalog(ctx);
	const state = hasBackendSession(event.cookies) ? await loadRegistration(ctx) : null;
	const registration = state?.ok && state.data.application ? state.data : null;
	const province = registration?.application?.province_code;
	const cities = province ? await loadSignupCities(ctx, province) : null;
	return {
		catalog: catalog.ok ? catalog.data : null,
		failure: catalog.ok ? null : catalog.reason,
		registration,
		cities: cities?.ok ? cities.data : [],
		challenge: readChallenge(event.cookies)
	};
}

interface StoredChallenge {
	token: string;
	channel: string;
	target: string;
	expiresAt: string;
	resendAt: string;
}

function writeChallenge(
	cookies: Cookies,
	c: {
		challenge_token: string;
		channel: string;
		target: string;
		expires_at: string;
		resend_available_at: string;
	}
) {
	const value: StoredChallenge = {
		token: c.challenge_token,
		channel: c.channel,
		target: c.target,
		expiresAt: c.expires_at,
		resendAt: c.resend_available_at
	};
	cookies.set(CHALLENGE_COOKIE, JSON.stringify(value), {
		...COOKIE_OPTIONS,
		maxAge: CHALLENGE_MAX_AGE_SECONDS
	});
	return publicChallenge(value);
}

function storedChallenge(cookies: Cookies): StoredChallenge | null {
	try {
		const raw = cookies.get(CHALLENGE_COOKIE);
		return raw ? (JSON.parse(raw) as StoredChallenge) : null;
	} catch {
		return null;
	}
}

const publicChallenge = (c: StoredChallenge) => ({
	channel: c.channel,
	target: c.target,
	expiresAt: c.expiresAt,
	resendAt: c.resendAt
});

function readChallenge(cookies: Cookies) {
	const c = storedChallenge(cookies);
	return c ? publicChallenge(c) : null;
}

async function readBody<T>(event: RequestEvent): Promise<T | null> {
	try {
		const form = await event.request.formData();
		const body: unknown = JSON.parse(String(form.get('body') ?? 'null'));
		return body && typeof body === 'object' ? (body as T) : null;
	} catch {
		return null;
	}
}

function respond<T>(result: BackendResult<T>) {
	if (result.ok) return { result: result.data };
	return fail(HTTP_STATUS_BY_FAILURE[result.reason], {
		reason: result.reason,
		code: result.code,
		issues: result.issues,
		remaining: result.remaining,
		retryAt: result.retryAt
	});
}

const invalidBody = () =>
	fail(400, {
		reason: 'validation',
		code: 'invalid_request',
		issues: [],
		remaining: null,
		retryAt: null
	});

type Handler<B> = (
	ctx: RegistrationApiContext,
	body: B,
	event: RequestEvent
) => Promise<BackendResult<unknown>>;

function action<B extends object = Record<string, never>>(handler: Handler<B>, needsBody = false) {
	return async (event: RequestEvent) => {
		const body = needsBody ? await readBody<B>(event) : ({} as B);
		if (!body) return invalidBody();
		return respond(await handler(registrationContext(event), body, event));
	};
}

const noChallenge = (): BackendResult<never> => ({
	ok: false,
	reason: 'gone',
	code: 'challenge_expired',
	issues: [],
	remaining: null,
	retryAt: null
});

/** Aksi `?/<nama>` dipanggil dari komponen wizard lewat `runPageAction`. */
export const registerActions: Actions = {
	cities: action<{ province: string }>(
		(ctx, body) => loadSignupCities(ctx, String(body.province ?? '')),
		true
	),
	account: action<Parameters<typeof beginSignup>[1]>(async (ctx, body, event) => {
		const result = await beginSignup(ctx, body);
		return result.ok ? { ok: true, data: writeChallenge(event.cookies, result.data) } : result;
	}, true),
	otpResend: action<{ channel: 'email' | 'whatsapp' }>(async (ctx, body, event) => {
		const stored = storedChallenge(event.cookies);
		if (!stored) return noChallenge();
		const result = await resendSignupCode(ctx, {
			challenge_token: stored.token,
			channel: body.channel
		});
		return result.ok ? { ok: true, data: writeChallenge(event.cookies, result.data) } : result;
	}, true),
	otpVerify: action<{ code: string }>(async (ctx, body, event) => {
		const stored = storedChallenge(event.cookies);
		if (!stored) return noChallenge();
		const result = await confirmSignupCode(ctx, {
			challenge_token: stored.token,
			code: String(body.code ?? '')
		});
		if (!result.ok) return result;
		if (!result.data.token || !result.data.refresh_token) return noChallenge();
		storeBackendTokens(event.cookies, {
			token: result.data.token,
			refreshToken: result.data.refresh_token
		});
		event.cookies.delete(CHALLENGE_COOKIE, COOKIE_OPTIONS);
		return loadRegistration({ ...ctx, cookies: event.cookies });
	}, true),
	npsn: action<{ npsn: string }>((ctx, body) => checkNpsn(ctx, String(body.npsn ?? '')), true),
	institution: action<Parameters<typeof saveInstitution>[1]>(
		(ctx, body) => saveInstitution(ctx, body),
		true
	),
	plan: action<Parameters<typeof savePlan>[1]>((ctx, body) => savePlan(ctx, body), true),
	upload: action<Parameters<typeof uploadFile>[1]>((ctx, body) => uploadFile(ctx, body), true),
	removeFile: action<{ id: string }>((ctx, body) => removeFile(ctx, String(body.id ?? '')), true),
	submit: action((ctx) => submitApplication(ctx)),
	cancel: action((ctx) => cancelOwnRegistration(ctx)),
	payment: action<Parameters<typeof startPayment>[1]>((ctx, body) => startPayment(ctx, body), true),
	paymentCheck: action((ctx) => checkPayment(ctx)),
	refresh: action((ctx) => loadRegistration(ctx)),
	step: action<{ step: string }>((ctx, body) => advanceStep(ctx, String(body.step ?? '')), true),
	setup: action<{ step: SetupStep; data: Parameters<typeof saveSetup>[2] }>((ctx, body) => {
		if (!SETUP_STEPS.includes(body.step)) return Promise.resolve(noChallenge());
		return saveSetup(ctx, body.step, body.data);
	}, true)
};

/** Pratinjau logo/dokumen milik pemohon (`/register/file?id=`). */
export async function proxyRegistrationFile(event: RequestEvent): Promise<Response> {
	const id = event.url.searchParams.get('id') ?? '';
	if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
	return relayFile(await fetchRegistrationFile(registrationContext(event), id));
}
