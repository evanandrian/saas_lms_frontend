import type { AccountArea } from '$lib/api/generated/lms';
import { relayFile } from '$lib/api/backend-call';
import { clientMeta } from '$lib/auth/finish-login';
import { fail, type Actions, type Cookies, type RequestEvent } from '@sveltejs/kit';
import {
	beginAccountLink,
	beginPasswordChange,
	cancelRequest,
	cancelPendingEmail,
	checkResetLink,
	fetchAccountFile,
	confirmPasswordCode,
	confirmTwoFactor,
	dismissRequest,
	loadAccountOverview,
	prepareDataExport,
	prepareTwoFactor,
	removeAccountLink,
	renewBackupCodes,
	requestResetLink,
	resendEmailLink,
	resendPasswordCode,
	saveAccountProfile,
	saveNotificationPreferences,
	savePrivacy,
	saveSecurityAlerts,
	sendNotificationTest,
	signOutOtherSessions,
	signOutSession,
	submitDeletionRequest,
	turnOffTwoFactor,
	uploadRequestDocument,
	type AccountApiContext,
	type AccountFailure,
	type AccountResult
} from './account.api';
import { isAccountTab, type AccountTab } from './account.model';

/**
 * Load & form action halaman Pengaturan Akun, dipakai bersama rute platform dan area sekolah.
 * Data selalu dari backend — tanpa fixture: belum masuk lewat backend → status kosong (StatePanel).
 */

const HTTP_STATUS_BY_FAILURE: Record<AccountFailure, number> = {
	unauthenticated: 401,
	forbidden: 403,
	not_found: 404,
	conflict: 409,
	validation: 422,
	gone: 410,
	too_many: 429,
	unavailable: 503
};

export const RESET_PARAM = 'reset';
export const TAB_PARAM = 'tab';

/**
 * Alur "Hubungkan akun" (OAuth): halaman asal disimpan di cookie HttpOnly saat mulai, lalu callback
 * menulis hasilnya sebagai notifikasi sekali tampil. Tidak ada token/hasil di URL.
 */
const LINK_RETURN_COOKIE = 'lms_oauth_link';
const ACCOUNT_NOTICE_COOKIE = 'lms_account_notice';
const LINK_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const NOTICE_COOKIE_MAX_AGE_SECONDS = 60;
const COOKIE_OPTIONS = { path: '/', httpOnly: true, sameSite: 'lax' } as const;

export interface AccountNotice {
	linked?: string;
	linkError?: string;
}

/** Halaman Pengaturan tempat "Hubungkan" ditekan; `null` = callback ini untuk masuk, bukan menghubungkan. */
export function consumeLinkReturn(cookies: Cookies): string | null {
	const value = cookies.get(LINK_RETURN_COOKIE);
	if (!value) return null;
	cookies.delete(LINK_RETURN_COOKIE, COOKIE_OPTIONS);
	return value.startsWith('/') && !value.startsWith('//') ? value : null;
}

export function writeAccountNotice(cookies: Cookies, notice: AccountNotice): void {
	cookies.set(ACCOUNT_NOTICE_COOKIE, JSON.stringify(notice), {
		...COOKIE_OPTIONS,
		maxAge: NOTICE_COOKIE_MAX_AGE_SECONDS
	});
}

function consumeAccountNotice(cookies: Cookies): AccountNotice {
	const value = cookies.get(ACCOUNT_NOTICE_COOKIE);
	if (!value) return {};
	cookies.delete(ACCOUNT_NOTICE_COOKIE, COOKIE_OPTIONS);
	try {
		const parsed = JSON.parse(value) as AccountNotice;
		return {
			linked: typeof parsed.linked === 'string' ? parsed.linked : undefined,
			linkError: typeof parsed.linkError === 'string' ? parsed.linkError : undefined
		};
	} catch {
		return {};
	}
}

export function apiContext(event: RequestEvent): AccountApiContext {
	return {
		fetch: event.fetch,
		cookies: event.cookies,
		userAgent: event.request.headers.get('user-agent') ?? '',
		clientAddress: clientMeta(event).address
	};
}

export async function loadAccountPage(event: RequestEvent, area: AccountArea) {
	const ctx = apiContext(event);
	const params = event.url.searchParams;
	const result = await loadAccountOverview(ctx, area);
	const resetToken = params.get(RESET_PARAM);
	let reset: { token: string; valid: boolean } | null = null;
	if (result.ok && resetToken) {
		const status = await checkResetLink(ctx, resetToken);
		reset = { token: resetToken, valid: status.ok && status.data.valid };
	}
	const tab = params.get(TAB_PARAM);
	const notice = consumeAccountNotice(event.cookies);
	return {
		overview: result.ok ? result.data : null,
		failure: result.ok ? null : result.reason,
		initialTab: (reset
			? 'password'
			: notice.linked || notice.linkError
				? 'linked'
				: isAccountTab(tab)
					? tab
					: 'profile') as AccountTab,
		reset,
		linked: notice.linked ?? null,
		linkError: notice.linkError ?? null
	};
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

function respond<T>(result: AccountResult<T>) {
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
		reason: 'validation' as AccountFailure,
		code: 'invalid_request',
		issues: [],
		remaining: null,
		retryAt: null
	});

type Handler<B> = (
	ctx: AccountApiContext,
	body: B,
	event: RequestEvent
) => Promise<AccountResult<unknown>>;

function action<B extends object = Record<string, never>>(handler: Handler<B>, needsBody = false) {
	return async (event: RequestEvent) => {
		const body = needsBody ? await readBody<B>(event) : ({} as B);
		if (!body) return invalidBody();
		return respond(await handler(apiContext(event), body, event));
	};
}

/** Aksi form; nama aksi = `?/<nama>` dipanggil dari `account.client.ts`. */
export function accountActions(area: AccountArea): Actions {
	return {
		profile: action<Parameters<typeof saveAccountProfile>[2]>(
			(ctx, body) => saveAccountProfile(ctx, area, body),
			true
		),
		emailResend: action((ctx) => resendEmailLink(ctx, area)),
		emailCancel: action((ctx) => cancelPendingEmail(ctx, area)),
		requestCancel: action<{ id: string }>((ctx, body) => cancelRequest(ctx, area, body.id), true),
		requestDismiss: action<{ id: string }>((ctx, body) => dismissRequest(ctx, area, body.id), true),
		requestUpload: action<{ id: string; file: Parameters<typeof uploadRequestDocument>[3] }>(
			(ctx, body) => uploadRequestDocument(ctx, area, body.id, body.file),
			true
		),
		passwordStart: action<Parameters<typeof beginPasswordChange>[1]>(
			(ctx, body) => beginPasswordChange(ctx, body),
			true
		),
		passwordResend: action<{ challenge_id: string }>(
			(ctx, body) => resendPasswordCode(ctx, body.challenge_id),
			true
		),
		passwordVerify: action<{ challenge_id: string; code: string }>(
			(ctx, body) => confirmPasswordCode(ctx, area, body.challenge_id, body.code),
			true
		),
		resetLink: action((ctx, _body, event) => requestResetLink(ctx, area, event.url.pathname)),
		twoFactorSetup: action<{ method: 'app' | 'whatsapp' }>(
			(ctx, body) => prepareTwoFactor(ctx, body.method),
			true
		),
		twoFactorVerify: action<{ code: string }>(
			(ctx, body) => confirmTwoFactor(ctx, area, body.code),
			true
		),
		backupCodes: action((ctx) => renewBackupCodes(ctx, area)),
		twoFactorDisable: action((ctx) => turnOffTwoFactor(ctx, area)),
		securityAlerts: action<Parameters<typeof saveSecurityAlerts>[2]>(
			(ctx, body) => saveSecurityAlerts(ctx, area, body),
			true
		),
		sessionRevoke: action<{ id: string }>((ctx, body) => signOutSession(ctx, area, body.id), true),
		sessionsRevokeOthers: action((ctx) => signOutOtherSessions(ctx, area)),
		notifications: action<Parameters<typeof saveNotificationPreferences>[2]>(
			(ctx, body) => saveNotificationPreferences(ctx, area, body),
			true
		),
		notificationsTest: action((ctx) => sendNotificationTest(ctx, area)),
		linkStart: action<{ provider: 'google' | 'belajar' }>(async (ctx, body, event) => {
			const result = await beginAccountLink(ctx, area, body.provider, event.url.pathname);
			if (result.ok) {
				event.cookies.set(LINK_RETURN_COOKIE, event.url.pathname, {
					...COOKIE_OPTIONS,
					maxAge: LINK_COOKIE_MAX_AGE_SECONDS
				});
			}
			return result;
		}, true),
		unlink: action<{ provider: 'google' | 'belajar' }>(
			(ctx, body) => removeAccountLink(ctx, area, body.provider),
			true
		),
		privacy: action<Parameters<typeof savePrivacy>[2]>(
			(ctx, body) => savePrivacy(ctx, area, body),
			true
		),
		exportCreate: action<Parameters<typeof prepareDataExport>[2]>(
			(ctx, body) => prepareDataExport(ctx, area, body),
			true
		),
		deletionRequest: action((ctx) => submitDeletionRequest(ctx, area))
	};
}

/** Meneruskan berkas akun (foto/unduh data/lampiran) dari backend; token tetap di cookie HttpOnly. */
export async function proxyAccountFile(
	event: RequestEvent,
	path: `/api/v1/account/${string}`
): Promise<Response> {
	return relayFile(await fetchAccountFile(apiContext(event), path));
}
