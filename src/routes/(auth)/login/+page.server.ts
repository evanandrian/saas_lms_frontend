import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import { resolvePostAuthDestination } from '$lib/auth/dashboard-routing';
import {
	clearLoginChallenge,
	completeSecondFactor,
	configuredOAuthProviders,
	loginWithPassword,
	readLoginChallenge,
	resendSecondFactor,
	startOAuthSignIn
} from '$lib/auth/backend-auth';
import { clientMeta, finishLogin } from '$lib/auth/finish-login';
import {
	clearReauthEmail,
	consumeSessionEnded,
	readReauthEmail,
	writeSessionMeta
} from '$lib/auth/session-meta';
import { APP_PATHS, LOGIN_MODE_PARAM, LOGIN_MODES } from '$lib/utils/app-paths';
import { assertHostKind, buildPublicUrl } from '$lib/utils/host-context';
import { error, fail, redirect, type Cookies } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const SEE_OTHER_STATUS = 303;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_UNAUTHORIZED = 401;
const HTTP_SERVICE_UNAVAILABLE = 503;
const HTTP_FORBIDDEN = 403;
const HTTP_LOCKED = 423;
const HTTP_GONE = 410;
const OAUTH_ERROR_PARAM = 'oauth_error';

/** Kode error form login; teks ditampilkan halaman lewat i18n (`auth.login.errors.*`). */
type LoginErrorCode =
	| 'missing_fields'
	| 'invalid_credentials'
	| 'service_unavailable'
	| 'account_locked'
	| 'suspended'
	| 'invalid_code'
	| 'challenge_expired'
	| 'oauth_unavailable';

function challengeFailure(
	cookies: Cookies,
	status: number,
	code: LoginErrorCode,
	remaining: number | null = null
) {
	return fail(status, {
		email: '',
		error: code,
		remaining,
		challenge: readLoginChallenge(cookies)
	});
}

export const load: PageServerLoad = async ({ locals, url, cookies, fetch }) => {
	// Login = entry aplikasi di semua host yang dilayani (ADR-019 Revisi 1).
	assertHostKind(locals.host, ['public', 'platform', 'tenant', 'unified']);
	const rootDomain = env.PUBLIC_LMS_ROOT_DOMAIN ?? '';
	const mode = url.searchParams.get(LOGIN_MODE_PARAM);
	if (mode === LOGIN_MODES.OTHER) clearReauthEmail(cookies);
	return {
		// Pendaftaran lembaga berada di host publik (root domain).
		registerUrl: buildPublicUrl(url, rootDomain, APP_PATHS.REGISTER),
		// Peserta tryout (kode sesi) dilayani di host publik/tenant, bukan konsol platform.
		showTryoutLink: locals.host.kind !== 'platform',
		// Email tidak pernah ditaruh di URL; dibaca dari cookie HttpOnly yang ditulis saat keluar.
		reauthEmail: mode === LOGIN_MODES.REAUTH ? readReauthEmail(cookies) : null,
		sessionEnded: consumeSessionEnded(cookies),
		// Verifikasi 2 langkah yang sedang berjalan (token di cookie HttpOnly).
		challenge: readLoginChallenge(cookies),
		oauthProviders: await configuredOAuthProviders(fetch),
		oauthError: url.searchParams.get(OAUTH_ERROR_PARAM),
		// Pengenalan akun saat mengetik hanya untuk dev (risiko user enumeration; pola FE-04 D2).
		devAccounts: dev ? (await import('./accounts.fixture')).devAccounts : null
	};
};

/**
 * Aksi masuk nyata menunggu kontrak auth (BLOCKED-02). Aksi di bawah hanya sesi contoh dev;
 * tujuan setelah masuk selalu diminta ke Dashboard Routing Policy, bukan ditentukan halaman ini.
 */
export const actions: Actions = {
	login: async (event) => {
		const { request, cookies, fetch } = event;
		const form = await request.formData();
		const email = form.get('email');
		const password = form.get('password');

		const loginFailure = (status: number, code: LoginErrorCode) =>
			fail(status, {
				email: typeof email === 'string' ? email : '',
				error: code,
				remaining: null,
				challenge: null
			});

		if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
			return loginFailure(HTTP_BAD_REQUEST, 'missing_fields');
		}

		// Multi-sesi: sesi akun ini di perangkat lain tetap berjalan.
		const result = await loginWithPassword(fetch, cookies, email, password, clientMeta(event));
		if (!result.ok) {
			if (result.reason === 'two_factor_required') {
				return { email, error: null, remaining: null, challenge: result.challenge };
			}
			const status =
				result.reason === 'invalid_credentials'
					? HTTP_UNAUTHORIZED
					: result.reason === 'account_locked'
						? HTTP_LOCKED
						: result.reason === 'suspended'
							? HTTP_FORBIDDEN
							: HTTP_SERVICE_UNAVAILABLE;
			return loginFailure(status, result.reason);
		}
		return finishLogin(event, email);
	},
	twoFactor: async (event) => {
		const code = String((await event.request.formData()).get('code') ?? '').trim();
		if (!code) return challengeFailure(event.cookies, HTTP_BAD_REQUEST, 'invalid_code');
		const result = await completeSecondFactor(event.fetch, event.cookies, code, clientMeta(event));
		if (result.ok) return finishLogin(event, result.email);
		if (result.reason === 'invalid_code') {
			return challengeFailure(event.cookies, HTTP_UNAUTHORIZED, 'invalid_code', result.remaining);
		}
		if (result.reason === 'resend_too_soon')
			return challengeFailure(event.cookies, HTTP_BAD_REQUEST, 'invalid_code');
		return challengeFailure(
			event.cookies,
			result.reason === 'challenge_expired'
				? HTTP_GONE
				: result.reason === 'account_locked'
					? HTTP_LOCKED
					: HTTP_SERVICE_UNAVAILABLE,
			result.reason
		);
	},
	twoFactorResend: async ({ fetch, cookies }) => {
		const result = await resendSecondFactor(fetch, cookies);
		if (!result.ok && result.reason === 'resend_too_soon') {
			return { email: '', error: null, remaining: null, challenge: result.challenge };
		}
		return challengeFailure(cookies, HTTP_GONE, 'challenge_expired');
	},
	twoFactorCancel: async ({ cookies }) => {
		clearLoginChallenge(cookies);
		redirect(SEE_OTHER_STATUS, APP_PATHS.LOGIN);
	},
	oauth: async ({ request, fetch }) => {
		const provider = String((await request.formData()).get('provider') ?? '');
		const authorizeUrl = await startOAuthSignIn(fetch, provider);
		if (!authorizeUrl) {
			return fail(HTTP_SERVICE_UNAVAILABLE, {
				email: '',
				error: 'oauth_unavailable' as LoginErrorCode,
				remaining: null,
				challenge: null
			});
		}
		redirect(SEE_OTHER_STATUS, authorizeUrl);
	},
	devSignIn: async ({ locals, request, cookies }) => {
		// Ternary `dev ? import : null` agar modul sesi contoh tereliminasi dari build produksi.
		const devSession = dev ? await import('$lib/auth/dev-session.fixture') : null;
		if (!devSession) error(HTTP_NOT_FOUND, { message: 'Not Found' });
		assertHostKind(locals.host, ['platform', 'tenant', 'unified']);
		const form = await request.formData();
		const personaId = form.get('persona');
		if (typeof personaId !== 'string') error(HTTP_BAD_REQUEST, { message: 'Bad Request' });

		const session = devSession.writeDevSession(cookies, personaId);
		if (session.status !== 'authenticated') error(HTTP_BAD_REQUEST, { message: 'Bad Request' });
		writeSessionMeta(cookies, null);

		redirect(SEE_OTHER_STATUS, resolvePostAuthDestination(session, locals.host));
	},
	devSignOut: async ({ cookies }) => {
		const devSession = dev ? await import('$lib/auth/dev-session.fixture') : null;
		if (!devSession) error(HTTP_NOT_FOUND, { message: 'Not Found' });
		devSession.clearDevSession(cookies);
		redirect(SEE_OTHER_STATUS, APP_PATHS.LOGIN);
	}
};
