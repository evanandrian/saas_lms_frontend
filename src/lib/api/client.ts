/**
 * Fetcher tunggal untuk generated client (ADR-021) — dipakai sebagai mutator Orval.
 *
 * - Browser: path relatif same-origin `/api/v1/...` (ADR-019), `baseUrl` dikosongkan.
 * - SSR: feature API server-only mengisi `baseUrl` (`LMS_API_INTERNAL_URL`), `fetch` dari event,
 *   dan `token` dari cookie HttpOnly. Modul ini sengaja tidak membaca env/cookie agar aman diimpor di mana pun.
 *
 * Respons HTTP non-2xx TIDAK dilempar: dikembalikan sebagai union bertipe `{ data, status, headers }`
 * sesuai kontrak, sehingga feature API memetakan kode error stabil. Hanya kegagalan jaringan yang dilempar.
 */
export interface LmsRequestInit extends RequestInit {
	baseUrl?: string;
	fetch?: typeof fetch;
	token?: string;
}

const NO_CONTENT_STATUSES = new Set([204, 205]);

export async function lmsFetch<T>(url: string, init: LmsRequestInit = {}): Promise<T> {
	const { baseUrl = '', fetch: fetcher = fetch, token, headers, ...requestInit } = init;
	const requestHeaders = new Headers(headers);
	if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
	if (requestInit.body !== undefined && !requestHeaders.has('Content-Type')) {
		requestHeaders.set('Content-Type', 'application/json');
	}

	const response = await fetcher(`${baseUrl.replace(/\/+$/, '')}${url}`, {
		...requestInit,
		headers: requestHeaders
	});
	const data = NO_CONTENT_STATUSES.has(response.status)
		? undefined
		: await response.json().catch(() => undefined);
	return { data, status: response.status, headers: response.headers } as T;
}
