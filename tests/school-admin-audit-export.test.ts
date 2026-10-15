import type { RequestEvent } from '@sveltejs/kit';
import { isRedirect } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * PF7(b): proxy `/app/admin/audit/export` — sukses diteruskan sebagai lampiran CSV; galat backend
 * (non-2xx JSON) TIDAK diteruskan sebagai berkas melainkan redirect ke halaman dengan `export_error`.
 */
vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('$env/dynamic/private', () => ({ env: { LMS_API_INTERNAL_URL: 'http://backend.test' } }));
const fetchAuditExport =
	vi.fn<(ctx: unknown, query: URLSearchParams) => Promise<Response | null>>();
vi.mock('$lib/features/school-admin/school-admin.api', () => ({ fetchAuditExport }));

const { proxyAuditExport } = await import('$lib/features/school-admin/school-admin.server');

function event(search: string): RequestEvent {
	return {
		url: new URL(`http://app.test/app/admin/audit/export${search}`),
		fetch,
		cookies: { get: () => undefined },
		request: new Request('http://app.test/app/admin/audit/export'),
		getClientAddress: () => '127.0.0.1'
	} as unknown as RequestEvent;
}

async function redirectOf(search: string): Promise<string> {
	try {
		await proxyAuditExport(event(search));
	} catch (error) {
		if (isRedirect(error)) return error.location;
		throw error;
	}
	throw new Error('expected redirect');
}

const jsonError = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('proxyAuditExport', () => {
	beforeEach(() => fetchAuditExport.mockReset());

	it('meneruskan hanya filter valid ke backend', async () => {
		fetchAuditExport.mockResolvedValue(
			new Response('waktu\n', { headers: { 'content-type': 'text/csv; charset=utf-8' } })
		);
		await proxyAuditExport(
			event('?category=bogus&from=2026-10-01&q=%20rapor%20&actor_role=EVENT_ORGANIZER&x=1')
		);
		expect(fetchAuditExport.mock.calls[0]?.[1].toString()).toBe('from=2026-10-01&q=rapor');
	});

	it('sukses → lampiran CSV', async () => {
		fetchAuditExport.mockResolvedValue(
			new Response('waktu,pelaku\n', {
				headers: {
					'content-type': 'text/csv; charset=utf-8',
					'content-disposition': 'attachment; filename="riwayat.csv"'
				}
			})
		);
		const res = await proxyAuditExport(event(''));
		expect(res.status).toBe(200);
		expect(res.headers.get('content-disposition')).toBe('attachment; filename="riwayat.csv"');
		expect(await res.text()).toBe('waktu,pelaku\n');
	});

	it('422 rentang → redirect dengan kode galat', async () => {
		fetchAuditExport.mockResolvedValue(
			jsonError(422, { error: { code: 'audit_export_range_invalid', message: 'x' } })
		);
		expect(await redirectOf('?from=2026-01-01&to=2026-10-15')).toBe(
			'/app/admin/audit?export_error=audit_export_range_invalid'
		);
	});

	it('422 validasi → kode isu pertama', async () => {
		fetchAuditExport.mockResolvedValue(
			jsonError(422, {
				error: { code: 'validation_failed', details: [{ field: 'q', code: 'too_long' }] }
			})
		);
		expect(await redirectOf('')).toBe('/app/admin/audit?export_error=too_long');
	});

	it('body bukan JSON → internal_error', async () => {
		fetchAuditExport.mockResolvedValue(new Response('', { status: 500 }));
		expect(await redirectOf('')).toBe('/app/admin/audit?export_error=internal_error');
	});

	it('tanpa sesi → unauthenticated', async () => {
		fetchAuditExport.mockResolvedValue(null);
		expect(await redirectOf('')).toBe('/app/admin/audit?export_error=unauthenticated');
	});
});
