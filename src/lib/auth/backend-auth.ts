import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

/**
 * Integrasi auth ke backend LMS (FE-06) — server-only. Token tidak pernah sampai ke JavaScript browser:
 * disimpan di cookie HttpOnly host-only (ADR-019). Endpoint mengikuti backend lokal
 * (`/api/v1/auth/{login,login/2fa,refresh,me,logout,oauth/*}`); kontrak final tetap BLOCKED-02.
 *
 * Multi-sesi (keputusan pemilik 6 Okt 2026): setiap login = satu perangkat; logout mengakhiri sesi
 * perangkat ini saja. Sesi yang dikeluarkan dari Pengaturan Akun ditolak dengan `session_revoked`.
 */
const ACCESS_TOKEN_COOKIE = 'lms_token';
const REFRESH_TOKEN_COOKIE = 'lms_refresh_token';
const AUTH_API_PATH = '/api/v1/auth';
/** Hanya saat dev bila `LMS_API_INTERNAL_URL` kosong; produksi wajib mengisi env (fail-closed). */
const DEV_API_FALLBACK_URL = 'http://localhost:8080';
const SESSION_REVOKED_CODE = 'session_revoked';
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_LOCKED = 423;
const HTTP_TOO_MANY = 429;
const LOGIN_CHALLENGE_COOKIE = 'lms_login_challenge';
const LOGIN_CHALLENGE_MAX_AGE_SECONDS = 5 * 60;

const TOKEN_COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	secure: !dev
} as const;

type Fetch = typeof fetch;

/** Tantangan verifikasi 2 langkah saat login (disimpan di cookie HttpOnly, bukan di URL/JS). */
export interface LoginChallenge {
	readonly method: 'app' | 'whatsapp';
	readonly target: string;
	readonly expiresAt: string;
	readonly resendAt: string;
	readonly email: string;
}

export type LoginResult =
	| { readonly ok: true }
	| {
			readonly ok: false;
			readonly reason: 'two_factor_required';
			readonly challenge: LoginChallenge;
	  }
	| { readonly ok: false; readonly reason: 'account_locked'; readonly retryAt: string | null }
	| {
			readonly ok: false;
			readonly reason: 'invalid_credentials' | 'service_unavailable' | 'suspended';
	  };

export type SecondFactorResult =
	| { readonly ok: true; readonly email: string }
	| { readonly ok: false; readonly reason: 'invalid_code'; readonly remaining: number }
	| { readonly ok: false; readonly reason: 'resend_too_soon'; readonly challenge: LoginChallenge }
	| {
			readonly ok: false;
			readonly reason: 'challenge_expired' | 'account_locked' | 'service_unavailable';
	  };

/** Perangkat klien yang diteruskan SSR ke backend (riwayat login & daftar sesi). */
export interface ClientMeta {
	readonly userAgent: string;
	readonly address: string;
}

/**
 * - `active`: token valid (mungkin baru diperbarui lewat refresh);
 * - `revoked`: sesi diakhiri karena logout atau login di perangkat lain;
 * - `expired`: token kedaluwarsa dan tidak dapat diperbarui;
 * - `unavailable`: backend tidak terjangkau (fail-closed tanpa menghapus cookie);
 * - `none`: belum pernah masuk lewat backend.
 */
export type BackendSessionStatus = 'active' | 'revoked' | 'expired' | 'unavailable' | 'none';

function apiBaseUrl(): string {
	return (env.LMS_API_INTERNAL_URL || (dev ? DEV_API_FALLBACK_URL : '')).replace(/\/+$/, '');
}

/** URL internal backend untuk panggilan publik tanpa token (mis. tautan verifikasi email). */
export function backendBaseUrl(): string {
	return apiBaseUrl();
}

function authUrl(path: string): string | null {
	const base = apiBaseUrl();
	return base ? `${base}${AUTH_API_PATH}${path}` : null;
}

/**
 * Akses SSR ke API backend untuk feature API (ADR-019 §2): URL internal + access token dari cookie
 * HttpOnly. `null` bila belum masuk lewat backend atau URL backend tidak dikonfigurasi (fail-closed).
 */
export function backendApiAccess(cookies: Cookies): { baseUrl: string; token: string } | null {
	const baseUrl = apiBaseUrl();
	const token = cookies.get(ACCESS_TOKEN_COOKIE);
	return baseUrl && token ? { baseUrl, token } : null;
}

async function readErrorCode(response: Response): Promise<string | null> {
	try {
		const body: unknown = await response.json();
		const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
		return typeof code === 'string' ? code : null;
	} catch {
		return null;
	}
}

async function readTokens(
	response: Response
): Promise<{ token: string; refreshToken: string } | null> {
	try {
		const body = (await response.json()) as {
			data?: { token?: unknown; refresh_token?: unknown };
		} | null;
		const token = body?.data?.token;
		const refreshToken = body?.data?.refresh_token;
		return typeof token === 'string' && typeof refreshToken === 'string'
			? { token, refreshToken }
			: null;
	} catch {
		return null;
	}
}

/** Menyimpan sesi yang diterbitkan modul lain (mis. verifikasi OTP pendaftaran lembaga). */
export function storeBackendTokens(
	cookies: Cookies,
	tokens: { token: string; refreshToken: string }
): void {
	storeTokens(cookies, tokens);
}

function storeTokens(cookies: Cookies, tokens: { token: string; refreshToken: string }): void {
	cookies.set(ACCESS_TOKEN_COOKIE, tokens.token, TOKEN_COOKIE_OPTIONS);
	cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, TOKEN_COOKIE_OPTIONS);
}

export function hasBackendSession(cookies: Cookies): boolean {
	return Boolean(cookies.get(ACCESS_TOKEN_COOKIE));
}

export function clearBackendTokens(cookies: Cookies): void {
	cookies.delete(ACCESS_TOKEN_COOKIE, TOKEN_COOKIE_OPTIONS);
	cookies.delete(REFRESH_TOKEN_COOKIE, TOKEN_COOKIE_OPTIONS);
}

function clientHeaders(client: ClientMeta | null): Record<string, string> {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (client?.userAgent) headers['User-Agent'] = client.userAgent;
	if (client?.address) headers['X-Forwarded-For'] = client.address;
	return headers;
}

type TokenOrChallenge = {
	token?: unknown;
	refresh_token?: unknown;
	two_factor_required?: unknown;
	challenge_token?: unknown;
	method?: unknown;
	target?: unknown;
	expires_at?: unknown;
	resend_available_at?: unknown;
	purpose?: unknown;
	return_to?: unknown;
	provider?: unknown;
};

async function readData(response: Response): Promise<TokenOrChallenge | null> {
	try {
		const body = (await response.json()) as { data?: TokenOrChallenge } | null;
		return body?.data ?? null;
	} catch {
		return null;
	}
}

async function readErrorDetails(
	response: Response
): Promise<{ code: string | null; remaining: number | null; retryAt: string | null }> {
	try {
		const body = (await response.json()) as {
			error?: { code?: unknown; details?: { remaining?: unknown; retry_at?: unknown } };
		} | null;
		const details = body?.error?.details;
		return {
			code: typeof body?.error?.code === 'string' ? body.error.code : null,
			remaining: typeof details?.remaining === 'number' ? details.remaining : null,
			retryAt: typeof details?.retry_at === 'string' ? details.retry_at : null
		};
	} catch {
		return { code: null, remaining: null, retryAt: null };
	}
}

/** Respons login berhasil: token → cookie; tantangan 2 langkah → cookie tantangan. */
function acceptLoginData(
	cookies: Cookies,
	data: TokenOrChallenge | null,
	email: string
): LoginResult {
	if (data?.two_factor_required === true && typeof data.challenge_token === 'string') {
		const challenge: LoginChallenge = {
			method: data.method === 'whatsapp' ? 'whatsapp' : 'app',
			target: typeof data.target === 'string' ? data.target : '',
			expiresAt: typeof data.expires_at === 'string' ? data.expires_at : '',
			resendAt: typeof data.resend_available_at === 'string' ? data.resend_available_at : '',
			email
		};
		cookies.set(
			LOGIN_CHALLENGE_COOKIE,
			JSON.stringify({ ...challenge, token: data.challenge_token }),
			{
				...TOKEN_COOKIE_OPTIONS,
				maxAge: LOGIN_CHALLENGE_MAX_AGE_SECONDS
			}
		);
		return { ok: false, reason: 'two_factor_required', challenge };
	}
	if (typeof data?.token === 'string' && typeof data.refresh_token === 'string') {
		storeTokens(cookies, { token: data.token, refreshToken: data.refresh_token });
		return { ok: true };
	}
	return { ok: false, reason: 'service_unavailable' };
}

async function loginFailure(response: Response): Promise<LoginResult> {
	if (response.status === HTTP_LOCKED) {
		return {
			ok: false,
			reason: 'account_locked',
			retryAt: (await readErrorDetails(response)).retryAt
		};
	}
	if (response.status === HTTP_FORBIDDEN) return { ok: false, reason: 'suspended' };
	return {
		ok: false,
		reason: response.status === HTTP_UNAUTHORIZED ? 'invalid_credentials' : 'service_unavailable'
	};
}

/** Login kata sandi. Multi-sesi: sesi di perangkat lain tetap berjalan. */
export async function loginWithPassword(
	fetcher: Fetch,
	cookies: Cookies,
	email: string,
	password: string,
	client: ClientMeta | null = null
): Promise<LoginResult> {
	const url = authUrl('/login');
	if (!url) return { ok: false, reason: 'service_unavailable' };
	try {
		const response = await fetcher(url, {
			method: 'POST',
			headers: clientHeaders(client),
			body: JSON.stringify({ email, password })
		});
		if (!response.ok) return loginFailure(response);
		return acceptLoginData(cookies, await readData(response), email);
	} catch {
		return { ok: false, reason: 'service_unavailable' };
	}
}

/** Tantangan 2 langkah yang sedang berjalan (tanpa token). */
export function readLoginChallenge(cookies: Cookies): LoginChallenge | null {
	const stored = readStoredChallenge(cookies);
	if (!stored) return null;
	const { token: _token, ...challenge } = stored;
	void _token;
	return challenge;
}

export function clearLoginChallenge(cookies: Cookies): void {
	cookies.delete(LOGIN_CHALLENGE_COOKIE, TOKEN_COOKIE_OPTIONS);
}

function readStoredChallenge(cookies: Cookies): (LoginChallenge & { token: string }) | null {
	try {
		const parsed: unknown = JSON.parse(cookies.get(LOGIN_CHALLENGE_COOKIE) ?? 'null');
		const value = parsed as (LoginChallenge & { token?: unknown }) | null;
		return value && typeof value.token === 'string'
			? (value as LoginChallenge & { token: string })
			: null;
	} catch {
		return null;
	}
}

/** Menyelesaikan login dengan kode aplikasi/WhatsApp atau kode cadangan. */
export async function completeSecondFactor(
	fetcher: Fetch,
	cookies: Cookies,
	code: string,
	client: ClientMeta | null
): Promise<SecondFactorResult> {
	const stored = readStoredChallenge(cookies);
	const url = authUrl('/login/2fa');
	if (!stored) return { ok: false, reason: 'challenge_expired' };
	if (!url) return { ok: false, reason: 'service_unavailable' };
	try {
		const response = await fetcher(url, {
			method: 'POST',
			headers: clientHeaders(client),
			body: JSON.stringify({ challenge_token: stored.token, code })
		});
		if (!response.ok) {
			const details = await readErrorDetails(response);
			if (details.code === 'invalid_code') {
				return { ok: false, reason: 'invalid_code', remaining: details.remaining ?? 0 };
			}
			if (details.code === 'challenge_expired') clearLoginChallenge(cookies);
			return {
				ok: false,
				reason:
					details.code === 'challenge_expired'
						? 'challenge_expired'
						: response.status === HTTP_LOCKED
							? 'account_locked'
							: 'service_unavailable'
			};
		}
		const result = acceptLoginData(cookies, await readData(response), stored.email);
		if (!result.ok) return { ok: false, reason: 'service_unavailable' };
		clearLoginChallenge(cookies);
		return { ok: true, email: stored.email };
	} catch {
		return { ok: false, reason: 'service_unavailable' };
	}
}

/** Kirim ulang kode WhatsApp untuk tantangan login (jeda 30 detik). */
export async function resendSecondFactor(
	fetcher: Fetch,
	cookies: Cookies
): Promise<SecondFactorResult> {
	const stored = readStoredChallenge(cookies);
	const url = authUrl('/login/2fa/resend');
	if (!stored) return { ok: false, reason: 'challenge_expired' };
	if (!url) return { ok: false, reason: 'service_unavailable' };
	try {
		const response = await fetcher(url, {
			method: 'POST',
			headers: clientHeaders(null),
			body: JSON.stringify({ challenge_token: stored.token })
		});
		if (response.status === HTTP_TOO_MANY) {
			const details = await readErrorDetails(response);
			return {
				ok: false,
				reason: 'resend_too_soon',
				challenge: { ...stored, resendAt: details.retryAt ?? stored.resendAt }
			};
		}
		if (!response.ok) return { ok: false, reason: 'challenge_expired' };
		const result = acceptLoginData(cookies, await readData(response), stored.email);
		return result.ok === false && result.reason === 'two_factor_required'
			? { ok: false, reason: 'resend_too_soon', challenge: result.challenge }
			: { ok: false, reason: 'service_unavailable' };
	} catch {
		return { ok: false, reason: 'service_unavailable' };
	}
}

/** Penyedia OAuth yang sudah dikonfigurasi backend (tombol "Masuk dengan Google"). */
export async function configuredOAuthProviders(fetcher: Fetch): Promise<string[]> {
	const url = authUrl('/oauth/providers');
	if (!url) return [];
	try {
		const response = await fetcher(url);
		if (!response.ok) return [];
		const body = (await response.json()) as {
			data?: { provider?: unknown; configured?: unknown }[];
		};
		return (body.data ?? []).flatMap((p) =>
			p.configured === true && typeof p.provider === 'string' ? [p.provider] : []
		);
	} catch {
		return [];
	}
}

/** URL persetujuan penyedia untuk masuk dengan akun terhubung; `null` bila tidak tersedia. */
export async function startOAuthSignIn(fetcher: Fetch, provider: string): Promise<string | null> {
	const url = authUrl(`/oauth/${encodeURIComponent(provider)}/start`);
	if (!url) return null;
	try {
		const response = await fetcher(url, { method: 'POST', headers: clientHeaders(null) });
		if (!response.ok) return null;
		const body = (await response.json()) as { data?: { authorize_url?: unknown } };
		return typeof body.data?.authorize_url === 'string' ? body.data.authorize_url : null;
	} catch {
		return null;
	}
}

export type OAuthCallbackResult =
	| { readonly kind: 'login'; readonly result: LoginResult }
	| { readonly kind: 'link'; readonly provider: string; readonly returnTo: string }
	| { readonly kind: 'error'; readonly code: string };

/** Callback penyedia: masuk (akun sudah terhubung) atau menghubungkan akun ke sesi saat ini. */
export async function completeOAuthCallback(
	fetcher: Fetch,
	cookies: Cookies,
	code: string,
	state: string,
	client: ClientMeta | null
): Promise<OAuthCallbackResult> {
	const url = authUrl('/oauth/complete');
	if (!url) return { kind: 'error', code: 'service_unavailable' };
	const headers = clientHeaders(client);
	const token = cookies.get(ACCESS_TOKEN_COOKIE);
	if (token) headers.Authorization = `Bearer ${token}`;
	try {
		const response = await fetcher(url, {
			method: 'POST',
			headers,
			body: JSON.stringify({ code, state })
		});
		if (!response.ok) {
			if (response.status === HTTP_LOCKED)
				return { kind: 'login', result: await loginFailure(response) };
			return { kind: 'error', code: (await readErrorDetails(response)).code ?? 'oauth_failed' };
		}
		const data = await readData(response);
		if (data?.purpose === 'link') {
			return {
				kind: 'link',
				provider: typeof data.provider === 'string' ? data.provider : '',
				returnTo: typeof data.return_to === 'string' ? data.return_to : ''
			};
		}
		return { kind: 'login', result: acceptLoginData(cookies, data, '') };
	} catch {
		return { kind: 'error', code: 'service_unavailable' };
	}
}

async function refreshTokens(fetcher: Fetch, cookies: Cookies): Promise<boolean> {
	const url = authUrl('/refresh');
	const refreshToken = cookies.get(REFRESH_TOKEN_COOKIE);
	if (!url || !refreshToken) return false;
	const response = await fetcher(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ refresh_token: refreshToken })
	});
	if (!response.ok) return false;
	const tokens = await readTokens(response);
	if (!tokens) return false;
	storeTokens(cookies, tokens);
	return true;
}

/** Memastikan sesi backend masih berlaku; dipanggil hooks per request bila cookie token ada. */
export async function verifyBackendSession(
	fetcher: Fetch,
	cookies: Cookies
): Promise<BackendSessionStatus> {
	const token = cookies.get(ACCESS_TOKEN_COOKIE);
	const url = authUrl('/me');
	if (!token) return 'none';
	if (!url) return 'unavailable';
	try {
		const response = await fetcher(url, { headers: { Authorization: `Bearer ${token}` } });
		if (response.ok) return 'active';
		if (response.status !== HTTP_UNAUTHORIZED) return 'unavailable';
		if ((await readErrorCode(response)) === SESSION_REVOKED_CODE) return 'revoked';
		return (await refreshTokens(fetcher, cookies)) ? 'active' : 'expired';
	} catch {
		return 'unavailable';
	}
}

/** Logout = akhiri sesi perangkat ini (multi-sesi); perangkat lain dikeluarkan dari Pengaturan Akun. */
export async function logoutCurrentDevice(fetcher: Fetch, cookies: Cookies): Promise<void> {
	const token = cookies.get(ACCESS_TOKEN_COOKIE);
	const url = authUrl('/logout');
	if (token && url) {
		// Kegagalan jaringan tidak menghalangi penghapusan cookie lokal.
		await fetcher(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(
			() => undefined
		);
	}
	clearBackendTokens(cookies);
}

/** Identitas + peran keanggotaan aktif akun yang sedang masuk (`/auth/me`), untuk memetakan sesi frontend. */
export interface BackendIdentity {
	readonly id: string;
	readonly email: string;
	readonly fullName: string;
	readonly roles: { readonly tenantCode: string; readonly roleCode: string }[];
}

export async function fetchBackendRoles(
	fetcher: Fetch,
	cookies: Cookies
): Promise<BackendIdentity | null> {
	const token = cookies.get(ACCESS_TOKEN_COOKIE);
	const url = authUrl('/me');
	if (!token || !url) return null;
	try {
		const response = await fetcher(url, { headers: { Authorization: `Bearer ${token}` } });
		if (!response.ok) return null;
		const body = (await response.json()) as {
			data?: {
				id?: unknown;
				email?: unknown;
				full_name?: unknown;
				roles?: { tenant_code?: unknown; role_code?: unknown }[];
			};
		};
		return {
			id: typeof body.data?.id === 'string' ? body.data.id : '',
			email: typeof body.data?.email === 'string' ? body.data.email : '',
			fullName: typeof body.data?.full_name === 'string' ? body.data.full_name : '',
			roles: (body.data?.roles ?? []).flatMap((r) =>
				typeof r.tenant_code === 'string' && typeof r.role_code === 'string'
					? [{ tenantCode: r.tenant_code, roleCode: r.role_code }]
					: []
			)
		};
	} catch {
		return null;
	}
}
