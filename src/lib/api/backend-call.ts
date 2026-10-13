import { backendApiAccess, backendBaseUrl } from '$lib/auth/backend-auth';
import type { Cookies } from '@sveltejs/kit';

/**
 * Pemanggil generated client untuk feature API server-only (ADR-019/021): token dari cookie HttpOnly,
 * User-Agent & alamat klien diteruskan agar backend mencatat perangkat yang benar, dan error backend
 * dipetakan ke alasan stabil untuk UI. Dipakai Pengaturan Akun dan Kotak Persetujuan.
 */
export interface BackendContext {
	fetch: typeof fetch;
	cookies: Cookies;
	userAgent: string;
	clientAddress: string;
}

export type BackendFailure =
	| 'unauthenticated'
	| 'forbidden'
	| 'not_found'
	| 'conflict'
	| 'validation'
	| 'gone'
	| 'too_many'
	| 'unavailable';

export interface BackendIssue {
	field: string;
	code: string;
}

export interface BackendFailureResult {
	ok: false;
	reason: BackendFailure;
	code: string;
	issues: BackendIssue[];
	remaining: number | null;
	retryAt: string | null;
}

export type BackendResult<T> = { ok: true; data: T } | BackendFailureResult;

export type BackendRequestInit = {
	baseUrl: string;
	token: string;
	fetch: typeof fetch;
	headers: Record<string, string>;
};

const FAILURE_BY_STATUS: Readonly<Record<number, BackendFailure>> = {
	400: 'validation',
	401: 'unauthenticated',
	403: 'forbidden',
	404: 'not_found',
	409: 'conflict',
	410: 'gone',
	422: 'validation',
	429: 'too_many'
};

type GeneratedResponse = { status: number; data: unknown };
type ErrorBody = { error?: { code?: string; details?: unknown } } | undefined;

export function backendFailure(status: number, body: unknown): BackendFailureResult {
	const error = (body as ErrorBody)?.error;
	const details = error?.details;
	const object =
		details && !Array.isArray(details) && typeof details === 'object'
			? (details as { remaining?: unknown; retry_at?: unknown })
			: null;
	return {
		ok: false,
		reason: FAILURE_BY_STATUS[status] ?? 'unavailable',
		code: error?.code ?? 'internal_error',
		issues: Array.isArray(details) ? (details as BackendIssue[]) : [],
		remaining: typeof object?.remaining === 'number' ? object.remaining : null,
		retryAt: typeof object?.retry_at === 'string' ? object.retry_at : null
	};
}

export const backendUnavailable = (reason: BackendFailure): BackendFailureResult => ({
	ok: false,
	reason,
	code: reason,
	issues: [],
	remaining: null,
	retryAt: null
});

function forwardedHeaders(
	ctx: Pick<BackendContext, 'userAgent' | 'clientAddress'>
): Record<string, string> {
	const headers: Record<string, string> = {};
	if (ctx.userAgent) headers['User-Agent'] = ctx.userAgent;
	if (ctx.clientAddress) headers['X-Forwarded-For'] = ctx.clientAddress;
	return headers;
}

export async function callBackend<T>(
	ctx: BackendContext,
	request: (init: BackendRequestInit) => Promise<GeneratedResponse>
): Promise<BackendResult<T>> {
	const access = backendApiAccess(ctx.cookies);
	if (!access) return backendUnavailable('unauthenticated');
	try {
		const response = await request({ ...access, fetch: ctx.fetch, headers: forwardedHeaders(ctx) });
		if (response.status >= 200 && response.status < 300) {
			return { ok: true, data: (response.data as { data?: T } | undefined)?.data as T };
		}
		return backendFailure(response.status, response.data);
	} catch {
		return backendUnavailable('unavailable');
	}
}

/**
 * Endpoint publik backend (`/api/v1/public/*`): tanpa token, tetap meneruskan User-Agent & alamat klien.
 * Dipakai Daftar & berlangganan (sebelum akun aktif) dan peserta tamu sesi ujian.
 */
export async function callPublic<T>(
	ctx: Pick<BackendContext, 'fetch' | 'userAgent' | 'clientAddress'>,
	request: (init: BackendRequestInit) => Promise<GeneratedResponse>
): Promise<BackendResult<T>> {
	const baseUrl = backendBaseUrl();
	if (!baseUrl) return backendUnavailable('unavailable');
	try {
		const response = await request({
			baseUrl,
			token: '',
			fetch: ctx.fetch,
			headers: forwardedHeaders(ctx)
		});
		if (response.status >= 200 && response.status < 300) {
			return { ok: true, data: (response.data as { data?: T } | undefined)?.data as T };
		}
		return backendFailure(response.status, response.data);
	} catch {
		return backendUnavailable('unavailable');
	}
}

/**
 * Berkas biner (foto, unduhan, lampiran) — generated client mem-parse JSON, sehingga berkas dibaca
 * langsung dari backend dengan token cookie lewat `fetch` milik event.
 */
export async function fetchBackendFile(
	ctx: BackendContext,
	path: `/api/v1/${string}`
): Promise<Response | null> {
	const access = backendApiAccess(ctx.cookies);
	if (!access) return null;
	try {
		return await ctx.fetch(`${access.baseUrl}${path}`, {
			headers: { Authorization: `Bearer ${access.token}`, ...forwardedHeaders(ctx) }
		});
	} catch {
		return null;
	}
}

const FILE_HEADERS = [
	'content-type',
	'content-disposition',
	'cache-control',
	'x-content-type-options',
	'content-security-policy'
] as const;

/** Tipe yang boleh tampil inline di origin aplikasi; tipe lain selalu diunduh. */
const INLINE_FILE_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf']);

/** Tipe yang dapat menjalankan skrip bila dirender (SVG, HTML, XML, JS) — dinetralkan menjadi biner. */
const ACTIVE_FILE_TYPE = /(^|\/|\+)(svg|html|xhtml|xml|javascript|ecmascript)(\+|$)/;

/** Sama dengan CSP berkas backend; PDF dikecualikan karena penampil PDF menolak dokumen ber-sandbox. */
const FILE_SANDBOX_CSP = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

function asAttachment(disposition: string | null): string {
	const value = disposition?.replace(/^\s*inline\b/i, 'attachment') ?? '';
	return value.startsWith('attachment') ? value : 'attachment';
}

/**
 * Meneruskan respons berkas backend ke browser (token tetap di cookie HttpOnly). Header keamanan
 * backend ikut diteruskan, dan tipe dari upstream tidak dipercaya begitu saja (SEC-01): konten aktif
 * atau tanpa tipe tidak pernah dirender inline di origin konsol.
 */
export function relayFile(upstream: Response | null): Response {
	if (!upstream) return new Response(null, { status: 401 });
	if (!upstream.ok) return new Response(null, { status: upstream.status });
	const headers = new Headers();
	for (const name of FILE_HEADERS) {
		const value = upstream.headers.get(name);
		if (value) headers.set(name, value);
	}
	const type = (headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
	if (!INLINE_FILE_TYPES.has(type)) {
		if (!type || ACTIVE_FILE_TYPE.test(type))
			headers.set('content-type', 'application/octet-stream');
		headers.set('content-disposition', asAttachment(headers.get('content-disposition')));
	}
	headers.set('x-content-type-options', 'nosniff');
	if (type !== 'application/pdf' && !headers.has('content-security-policy')) {
		headers.set('content-security-policy', FILE_SANDBOX_CSP);
	}
	return new Response(upstream.body, { status: 200, headers });
}
