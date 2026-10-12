import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { backendFailure } from '$lib/api/backend-call';
import { LOCALES } from '$lib/i18n';

/**
 * Contract test kode error (DECISION 5): setiap kode error yang dideklarasikan OpenAPI untuk area admin
 * sekolah, endpoint kredensial publik, billing, dan cluster wajib punya pesan i18n di semua locale, FE
 * tidak meneruskan `message` backend, dan kode lama (`QUOTA_STUDENTS_EXCEEDED`) tidak lagi dipakai.
 * Kontrak FE (`contract/openapi.yaml`) harus identik dengan backend (`api/openapi.yaml`) bila tersedia.
 */

const CONTRACT = 'contract/openapi.yaml';
const BACKEND_CONTRACT = '../saas_lms_backend/api/openapi.yaml';
const LEGACY_CODES = ['QUOTA_STUDENTS_EXCEEDED'];
const SOURCE_DIRS = ['src'];
const SOURCE_EXT = /\.(ts|svelte|json)$/;
/** Klien generated menyalin deskripsi OpenAPI apa adanya; bukan jalur aktif penanganan error. */
const SOURCE_IGNORE = ['src/lib/api/generated/'];

const spec = readFileSync(CONTRACT, 'utf8');

/** Deskripsi satu respons komponen (`components.responses.<name>.description`). */
function responseDescription(name: string): string {
	const match = new RegExp(`^ {4}${name}:\\n {6}description: (.+)$`, 'm').exec(spec);
	if (!match?.[1]) throw new Error(`components.responses.${name} tidak ditemukan di ${CONTRACT}`);
	return match[1];
}

/** Kode dalam backtick (`kode`) pada deskripsi respons error. */
const backtickCodes = (text: string) => [...text.matchAll(/`([a-zA-Z_]+)`/g)].map((m) => m[1]!);

type Messages = Record<string, unknown>;
const messages = Object.fromEntries(
	LOCALES.map((locale) => [
		locale,
		JSON.parse(readFileSync(`src/lib/i18n/${locale}.json`, 'utf8')) as Messages
	])
);

/** Lookup ketat per locale (tanpa fallback `id` seperti `translate`). */
function hasMessage(locale: string, key: string): boolean {
	let node: unknown = messages[locale];
	for (const part of key.split('.')) {
		if (!node || typeof node !== 'object') return false;
		node = (node as Messages)[part];
	}
	return typeof node === 'string' && node.trim() !== '';
}

function expectMessages(keys: readonly string[]) {
	const missing = LOCALES.flatMap((locale) =>
		keys.filter((key) => !hasMessage(locale, key)).map((key) => `${locale}:${key}`)
	);
	expect(missing).toEqual([]);
}

describe('kontrak kode error ↔ i18n', () => {
	it('semua kode SchoolAdminError punya pesan school_admin.errors.* di semua locale', () => {
		const codes = backtickCodes(responseDescription('SchoolAdminError'));
		expect(codes).toEqual(
			expect.arrayContaining([
				'quota_students_exceeded',
				'rate_limited',
				'tenant_read_only',
				'tenant_terminated',
				'invoice_partially_paid',
				'tenant_maintenance'
			])
		);
		expectMessages(codes.map((code) => `school_admin.errors.${code}`));
	});

	it('status HTTP kode baru di SchoolAdminError sesuai handler backend', () => {
		const text = responseDescription('SchoolAdminError');
		const expected: Record<string, number> = {
			quota_students_exceeded: 402,
			invoice_partially_paid: 409,
			invitation_invalid: 410,
			tenant_terminated: 403,
			tenant_read_only: 423,
			tenant_maintenance: 503,
			rate_limited: 429
		};
		for (const [code, status] of Object.entries(expected)) {
			expect(text, code).toMatch(new RegExp(`\`${code}\` \\(${status}\\b`));
		}
	});

	it('429 rate_limited endpoint kredensial publik: pesan dengan & tanpa sisa menit', () => {
		expect(responseDescription('SchoolRateLimited')).toContain('`rate_limited`');
		expectMessages(['school_admin.errors.rate_limited', 'school_admin.errors.rate_limited_later']);
		for (const locale of LOCALES) {
			const node = (messages[locale]!.school_admin as Messages).errors as Messages;
			expect(String(node.rate_limited), locale).toContain('{minutes}');
		}
	});

	it('invoice_partially_paid (billing) & connection_failed (cluster) terpetakan di konsol terkait', () => {
		expect(responseDescription('BillingError')).toContain('invoice_partially_paid (409');
		expect(responseDescription('ClusterError')).toContain('`connection_failed` (422');
		expectMessages([
			'invoices.failure.invoice_partially_paid',
			'payments.errors.invoice_partially_paid',
			'clusters.failure.connection_failed',
			'clusters.test_error.connection_failed'
		]);
	});

	it('tenant_maintenance memakai halaman error penuh (common.error.maintenance_*)', () => {
		expectMessages([
			'common.error.maintenance_title',
			'common.error.maintenance_description',
			'common.error.maintenance_retry'
		]);
	});

	it('SESSION_FULL sengaja dipertahankan (kontrak sesi ujian lama) dan tetap ditangani FE', () => {
		expect(responseDescription('ExamSessionError')).toContain('`SESSION_FULL`');
		const join = readFileSync('src/routes/(auth)/join/+page.svelte', 'utf8');
		expect(join).toContain("'SESSION_FULL'");
	});
});

describe('kebocoran pesan backend & kode lama', () => {
	it('backendFailure hanya meneruskan kode stabil, bukan `message` backend', () => {
		const secret = 'pq: relation "student_t" does not exist (host=10.0.0.5)';
		for (const [status, code] of [
			[402, 'quota_students_exceeded'],
			[423, 'tenant_read_only'],
			[403, 'tenant_terminated'],
			[409, 'invoice_partially_paid'],
			[503, 'tenant_maintenance'],
			[429, 'rate_limited']
		] as const) {
			const out = backendFailure(status, { error: { code, message: secret } });
			expect(out.code).toBe(code);
			expect(JSON.stringify(out)).not.toContain(secret);
		}
		expect(backendFailure(429, { error: { code: 'rate_limited' } }).reason).toBe('too_many');
	});

	it('kode lama tidak tersisa di jalur aktif FE (src, i18n)', () => {
		const hits: string[] = [];
		const walk = (dir: string) => {
			for (const name of readdirSync(dir)) {
				const path = join(dir, name);
				if (SOURCE_IGNORE.some((prefix) => path.startsWith(prefix))) continue;
				if (statSync(path).isDirectory()) walk(path);
				else if (SOURCE_EXT.test(name)) {
					const text = readFileSync(path, 'utf8');
					for (const code of LEGACY_CODES) if (text.includes(code)) hits.push(`${path}:${code}`);
				}
			}
		};
		SOURCE_DIRS.forEach(walk);
		expect(hits).toEqual([]);
		for (const code of LEGACY_CODES) expect(spec).not.toContain(code);
	});
});

describe('paritas kontrak FE ↔ backend', () => {
	it.skipIf(!existsSync(BACKEND_CONTRACT))(
		'contract/openapi.yaml identik dengan backend api/openapi.yaml',
		() => {
			expect(readFileSync(BACKEND_CONTRACT, 'utf8') === spec).toBe(true);
		}
	);
});
