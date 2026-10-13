import { describe, expect, it, vi } from 'vitest';

/**
 * SEC-01: relay berkas backend → browser. Relay lama hanya meneruskan 4 header sehingga CSP sandbox
 * backend hilang dan SVG pemohon tampil inline di origin konsol platform. Fixture inert (tidak dirender).
 */
vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('$env/dynamic/private', () => ({ env: { LMS_API_INTERNAL_URL: 'http://backend.test' } }));

const { relayFile } = await import('$lib/api/backend-call');

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><script>/*inert*/</script></svg>';
const SANDBOX_CSP = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

function upstream(body: string | null, headers: Record<string, string>, status = 200): Response {
	return new Response(body, { status, headers });
}

describe('relayFile — header keamanan berkas (SEC-01)', () => {
	it('meneruskan CSP dari backend', () => {
		const res = relayFile(
			upstream('x', {
				'content-type': 'application/octet-stream',
				'content-disposition': 'attachment; filename="logo.svg"',
				'content-security-policy': SANDBOX_CSP
			})
		);
		expect(res.headers.get('content-security-policy')).toBe(SANDBOX_CSP);
	});

	it('SVG dari upstream tidak pernah inline: dinetralkan menjadi biner + attachment + sandbox', async () => {
		const res = relayFile(
			upstream(SVG, {
				'content-type': 'image/svg+xml',
				'content-disposition': 'inline; filename="logo.svg"'
			})
		);
		expect(res.headers.get('content-type')).toBe('application/octet-stream');
		expect(res.headers.get('content-disposition')).toBe('attachment; filename="logo.svg"');
		expect(res.headers.get('content-security-policy')).toBe(SANDBOX_CSP);
		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
		expect(await res.text()).toBe(SVG);
	});

	it.each([
		'text/html; charset=utf-8',
		'application/xhtml+xml',
		'text/xml',
		'application/xml',
		'application/javascript',
		'text/javascript'
	])('tipe aktif %s dinetralkan', (type) => {
		const res = relayFile(upstream('x', { 'content-type': type }));
		expect(res.headers.get('content-type')).toBe('application/octet-stream');
		expect(res.headers.get('content-disposition')).toBe('attachment');
		expect(res.headers.get('content-security-policy')).toBe(SANDBOX_CSP);
	});

	it('tanpa content-type dianggap tidak tepercaya', () => {
		// Body null: `Response` dengan body string otomatis memberi `text/plain`.
		const res = relayFile(new Response(null, { status: 200 }));
		expect(res.headers.get('content-type')).toBe('application/octet-stream');
		expect(res.headers.get('content-disposition')).toBe('attachment');
	});

	it('gambar raster valid tetap inline + nosniff + sandbox default', () => {
		const res = relayFile(
			upstream('png', {
				'content-type': 'image/png',
				'content-disposition': 'inline; filename="logo.png"',
				'cache-control': 'private, max-age=300'
			})
		);
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toBe('image/png');
		expect(res.headers.get('content-disposition')).toBe('inline; filename="logo.png"');
		expect(res.headers.get('cache-control')).toBe('private, max-age=300');
		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
		expect(res.headers.get('content-security-policy')).toBe(SANDBOX_CSP);
	});

	it('PDF tetap inline tanpa sandbox (penampil PDF / iframe pratinjau)', () => {
		const res = relayFile(
			upstream('%PDF', {
				'content-type': 'application/pdf',
				'content-disposition': 'inline; filename="rapor.pdf"'
			})
		);
		expect(res.headers.get('content-type')).toBe('application/pdf');
		expect(res.headers.get('content-disposition')).toBe('inline; filename="rapor.pdf"');
		expect(res.headers.get('content-security-policy')).toBeNull();
		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
	});

	it('unduhan non-inline (CSV/XLSX) tetap tipe aslinya tetapi selalu attachment', () => {
		const csv = relayFile(
			upstream('a,b', {
				'content-type': 'text/csv; charset=utf-8',
				'content-disposition': 'attachment; filename="audit.csv"'
			})
		);
		expect(csv.headers.get('content-type')).toBe('text/csv; charset=utf-8');
		expect(csv.headers.get('content-disposition')).toBe('attachment; filename="audit.csv"');

		const xlsx = relayFile(
			upstream('PK', {
				'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'content-disposition': 'inline; filename="template.xlsx"'
			})
		);
		expect(xlsx.headers.get('content-disposition')).toBe('attachment; filename="template.xlsx"');
	});

	it('header upstream lain tidak diteruskan', () => {
		const res = relayFile(
			upstream('png', {
				'content-type': 'image/png',
				'set-cookie': 'a=b',
				'x-internal-host': 'db-01'
			})
		);
		expect(res.headers.get('set-cookie')).toBeNull();
		expect(res.headers.get('x-internal-host')).toBeNull();
	});

	it('error upstream dan tanpa sesi → tanpa body dan tanpa konten aktif', async () => {
		for (const [res, status] of [
			[relayFile(upstream(SVG, { 'content-type': 'image/svg+xml' }, 404)), 404],
			[relayFile(upstream('{"error":{}}', { 'content-type': 'application/json' }, 403)), 403],
			[relayFile(null), 401]
		] as const) {
			expect(res.status).toBe(status);
			expect(res.headers.get('content-type')).toBeNull();
			expect(await res.text()).toBe('');
		}
	});
});
