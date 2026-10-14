import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Resolusi host tenant (SAD `tenant_domain_s`): subdomain → kode tenant lewat
 * `GET /api/v1/public/tenant-domains/{domain}` (kontrak diverifikasi terhadap backend lokal:
 * 200 `{data:{domain,tenant_code,tenant_name,status}}`, 404 `{error:{code:'tenant_not_found'}}`).
 */
vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('$env/dynamic/private', () => ({ env: { LMS_API_INTERNAL_URL: 'http://backend.test' } }));

const { resolveTenantHost, clearTenantHostCache } = await import('$lib/auth/tenant-host');

function stubFetch(responses: Record<string, { status: number; body?: unknown }>) {
	const calls: string[] = [];
	const fetcher = vi.fn(async (input: RequestInfo | URL) => {
		const url = String(input);
		calls.push(url);
		const domain = url.split('/').pop() ?? '';
		const hit = responses[domain];
		if (!hit) throw new TypeError('network down');
		return new Response(hit.body === undefined ? null : JSON.stringify(hit.body), {
			status: hit.status
		});
	});
	return { fetcher: fetcher as unknown as typeof fetch, calls };
}

const FOUND = {
	status: 200,
	body: {
		data: {
			domain: 'test-school-mat',
			tenant_code: 'test_school_mat',
			tenant_name: 'SMA Uji',
			status: 'active'
		}
	}
};
const MISSING = { status: 404, body: { error: { code: 'tenant_not_found' } } };

describe('resolveTenantHost', () => {
	beforeEach(() => clearTenantHostCache());

	it('TH-01: subdomain terdaftar → kode tenant (underscore) dari backend', async () => {
		const { fetcher, calls } = stubFetch({ 'test-school-mat': FOUND });
		await expect(resolveTenantHost(fetcher, 'test-school-mat')).resolves.toEqual({
			status: 'found',
			tenantCode: 'test_school_mat',
			tenantName: 'SMA Uji'
		});
		expect(calls).toEqual(['http://backend.test/api/v1/public/tenant-domains/test-school-mat']);
	});

	it('TH-02: subdomain tidak terdaftar → not_found', async () => {
		const { fetcher } = stubFetch({ nope: MISSING });
		await expect(resolveTenantHost(fetcher, 'nope')).resolves.toEqual({ status: 'not_found' });
	});

	it('TH-03: backend tak terjangkau / 5xx → unavailable (bukan 404), tidak di-cache', async () => {
		const down = stubFetch({});
		await expect(resolveTenantHost(down.fetcher, 'test-school-mat')).resolves.toEqual({
			status: 'unavailable'
		});
		const error = stubFetch({ 'test-school-mat': { status: 500 } });
		await expect(resolveTenantHost(error.fetcher, 'test-school-mat')).resolves.toEqual({
			status: 'unavailable'
		});
		const up = stubFetch({ 'test-school-mat': FOUND });
		await expect(resolveTenantHost(up.fetcher, 'test-school-mat')).resolves.toMatchObject({
			status: 'found'
		});
	});

	it('TH-04: hasil (positif & negatif) di-cache; backend dipanggil sekali per subdomain', async () => {
		const { fetcher, calls } = stubFetch({ 'test-school-mat': FOUND, nope: MISSING });
		for (let i = 0; i < 3; i++) {
			await resolveTenantHost(fetcher, 'test-school-mat');
			await resolveTenantHost(fetcher, 'nope');
		}
		expect(calls).toHaveLength(2);
	});
});
