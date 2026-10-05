import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

/**
 * Integrasi auth ke backend LMS (FE-06) — server-only. Token tidak pernah sampai ke JavaScript browser:
 * disimpan di cookie HttpOnly host-only (ADR-019). Endpoint mengikuti backend lokal
 * (`/api/v1/auth/{login,refresh,me,logout}`); kontrak final tetap BLOCKED-02.
 *
 * Kebijakan sesi tunggal ditegakkan backend: login baru atau logout mencabut semua sesi user,
 * dan token yang sesinya dicabut ditolak dengan kode `session_revoked`.
 */
const ACCESS_TOKEN_COOKIE = 'lms_token';
const REFRESH_TOKEN_COOKIE = 'lms_refresh_token';
const AUTH_API_PATH = '/api/v1/auth';
/** Hanya saat dev bila `LMS_API_INTERNAL_URL` kosong; produksi wajib mengisi env (fail-closed). */
const DEV_API_FALLBACK_URL = 'http://localhost:8080';
const SESSION_REVOKED_CODE = 'session_revoked';
const HTTP_UNAUTHORIZED = 401;

const TOKEN_COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	secure: !dev
} as const;

type Fetch = typeof fetch;

export type LoginResult =
	| { readonly ok: true }
	| { readonly ok: false; readonly reason: 'invalid_credentials' | 'service_unavailable' };

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

/** Login baru otomatis mengakhiri sesi akun ini di perangkat lain (kebijakan backend). */
export async function loginWithPassword(
	fetcher: Fetch,
	cookies: Cookies,
	email: string,
	password: string
): Promise<LoginResult> {
	const url = authUrl('/login');
	if (!url) return { ok: false, reason: 'service_unavailable' };
	try {
		const response = await fetcher(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});
		if (!response.ok) {
			return {
				ok: false,
				reason:
					response.status === HTTP_UNAUTHORIZED ? 'invalid_credentials' : 'service_unavailable'
			};
		}
		const tokens = await readTokens(response);
		if (!tokens) return { ok: false, reason: 'service_unavailable' };
		storeTokens(cookies, tokens);
		return { ok: true };
	} catch {
		return { ok: false, reason: 'service_unavailable' };
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

/** Logout = akhiri sesi di semua perangkat (backend mencabut seluruh sesi user). */
export async function logoutEverywhere(fetcher: Fetch, cookies: Cookies): Promise<void> {
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
