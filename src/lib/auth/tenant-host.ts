import { backendBaseUrl } from '$lib/auth/backend-auth';

/**
 * Resolusi host tenant (SAD `tenant_domain_s`, modul tenantreg): label subdomain → kode tenant.
 * Kode tenant (`sch_<NPSN>`, `tch_…`, `evt_…`) memakai underscore yang tidak sah di hostname, sehingga
 * subdomain BUKAN kode tenant; backend adalah otoritas pemetaannya (ADR-019).
 */
const TENANT_DOMAIN_PATH = '/api/v1/public/tenant-domains';
/** Selaras TTL cache backend (SAD: 60 detik); menghindari panggilan backend di setiap request. */
const CACHE_TTL_MS = 60_000;
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
/** Kode error stabil (SAD: 404 TENANT_NOT_FOUND); halaman error menampilkan "lembaga tidak ditemukan". */
export const TENANT_NOT_FOUND_CODE = 'tenant_not_found';

export type TenantHostResult =
	| { readonly status: 'found'; readonly tenantCode: string; readonly tenantName: string }
	| { readonly status: 'not_found' }
	| { readonly status: 'unavailable' };

type CachedResult = Exclude<TenantHostResult, { status: 'unavailable' }>;

const cache = new Map<string, { result: CachedResult; expires: number }>();

/** Khusus test. */
export function clearTenantHostCache(): void {
	cache.clear();
}

export async function resolveTenantHost(
	fetcher: typeof fetch,
	subdomain: string
): Promise<TenantHostResult> {
	const now = Date.now();
	const cached = cache.get(subdomain);
	if (cached && cached.expires > now) return cached.result;

	const result = await fetchTenantHost(fetcher, subdomain);
	// Backend tak terjangkau tidak di-cache: request berikutnya mencoba lagi.
	if (result.status !== 'unavailable') {
		cache.set(subdomain, { result, expires: now + CACHE_TTL_MS });
	}
	return result;
}

async function fetchTenantHost(
	fetcher: typeof fetch,
	subdomain: string
): Promise<TenantHostResult> {
	const base = backendBaseUrl();
	if (!base) return { status: 'unavailable' };
	try {
		const response = await fetcher(`${base}${TENANT_DOMAIN_PATH}/${encodeURIComponent(subdomain)}`);
		if (response.status === HTTP_NOT_FOUND) return { status: 'not_found' };
		if (response.status !== HTTP_OK) return { status: 'unavailable' };
		const body = (await response.json()) as {
			data?: { tenant_code?: string; tenant_name?: string };
		};
		const tenantCode = body.data?.tenant_code;
		if (!tenantCode) return { status: 'unavailable' };
		return { status: 'found', tenantCode, tenantName: body.data?.tenant_name ?? '' };
	} catch {
		return { status: 'unavailable' };
	}
}
