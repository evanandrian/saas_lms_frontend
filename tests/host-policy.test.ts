import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { HostContext } from '$lib/utils/host-context';
import { enforceHostAccess } from '$lib/utils/host-policy';

/**
 * Contract test kebijakan host (HOST-01..10, P0-2/P0-3): aturan prefiks path ↔ host di
 * `host-policy.ts` diuji terhadap perilaku yang diharapkan DAN terhadap `assertHostKind` yang
 * terpasang di route (lapis kedua) — keduanya wajib konsisten.
 */

const PUBLIC: HostContext = { kind: 'public' };
const PLATFORM: HostContext = { kind: 'platform' };
const TENANT: HostContext = { kind: 'tenant', subdomain: 'sekolah-ujian' };
const UNIFIED: HostContext = { kind: 'unified' };
const WWW: HostContext = { kind: 'www' };
const API: HostContext = { kind: 'api' };
const UNKNOWN: HostContext = { kind: 'unknown' };

function allowed(host: HostContext, path: string): boolean {
	try {
		enforceHostAccess(host, path);
		return true;
	} catch (e) {
		// `error()` SvelteKit melempar objek HttpError (bukan ekspor publik) — cek lewat status.
		expect((e as { status?: number }).status, path).toBe(404);
		return false;
	}
}

describe('HOST — kebijakan akses host terpusat', () => {
	it('HOST-01: host tak dikenal → semua path ditolak', () => {
		for (const path of ['/', '/login', '/console', '/app/admin', '/register']) {
			expect(allowed(UNKNOWN, path), path).toBe(false);
		}
	});

	it('HOST-02: host `api` → semua path ditolak', () => {
		for (const path of ['/', '/login', '/console', '/app/admin']) {
			expect(allowed(API, path), path).toBe(false);
		}
	});

	it('HOST-03: root domain publik → entry & auth lolos; route kerja ditolak', () => {
		expect(allowed(PUBLIC, '/')).toBe(true);
		expect(allowed(PUBLIC, '/login')).toBe(true);
		expect(allowed(PUBLIC, '/register/plan')).toBe(true);
		expect(allowed(PUBLIC, '/console')).toBe(false);
		expect(allowed(PUBLIC, '/app/admin')).toBe(false);
	});

	it('HOST-04: host platform → route platform lolos; route tenant/publik ditolak', () => {
		expect(allowed(PLATFORM, '/console')).toBe(true);
		expect(allowed(PLATFORM, '/settings/account')).toBe(true);
		expect(allowed(PLATFORM, '/platform/invoice')).toBe(true);
		expect(allowed(PLATFORM, '/app/admin')).toBe(false);
		expect(allowed(PLATFORM, '/register')).toBe(false);
		expect(allowed(PLATFORM, '/join')).toBe(false);
	});

	it('HOST-05: host tenant → route tenant lolos; route platform/publik ditolak', () => {
		expect(allowed(TENANT, '/app/admin')).toBe(true);
		expect(allowed(TENANT, '/app/teacher')).toBe(true);
		expect(allowed(TENANT, '/join')).toBe(true);
		expect(allowed(TENANT, '/console')).toBe(false);
		expect(allowed(TENANT, '/settings')).toBe(false);
		expect(allowed(TENANT, '/register')).toBe(false);
	});

	it('HOST-06: host gabungan dev (`unified`) → semua prefiks lolos', () => {
		for (const path of ['/', '/console', '/app/admin', '/register', '/join', '/select-context']) {
			expect(allowed(UNIFIED, path), path).toBe(true);
		}
	});

	it('HOST-07: kecocokan prefiks ketat — `/application` bukan bagian dari `/app`', () => {
		// Rule `/app` menolak route kerja di host yang salah…
		expect(allowed(PLATFORM, '/app')).toBe(false);
		expect(allowed(PLATFORM, '/app/admin')).toBe(false);
		// …tetapi TIDAK menangkap path mirip prefiks: path di luar aturan lolos ke router
		// (yang akan menjawab 404 karena route-nya memang tidak ada).
		expect(allowed(PLATFORM, '/application')).toBe(true);
		expect(allowed(TENANT, '/register')).toBe(false);
		expect(allowed(TENANT, '/registration')).toBe(true);
		expect(allowed(TENANT, '/app/admin')).toBe(true);
	});

	it('HOST-08: `www` ditolak di semua path (ditangani redirect sebelum kebijakan)', () => {
		for (const path of ['/', '/login', '/console']) {
			expect(allowed(WWW, path), path).toBe(false);
		}
	});

	it('HOST-09: select-context & access-denied hanya platform/tenant', () => {
		expect(allowed(PLATFORM, '/select-context')).toBe(true);
		expect(allowed(TENANT, '/access-denied')).toBe(true);
		expect(allowed(PUBLIC, '/select-context')).toBe(false);
		expect(allowed(PUBLIC, '/access-denied')).toBe(false);
	});
});

/** Ekstrak `assertHostKind(..., ['a', 'b'])` pertama dari berkas route. */
function assertKinds(file: string): string[] {
	const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
	const match = /assertHostKind\([^,]+,\s*\[([^\]]*)\]/.exec(source);
	expect(match, `assertHostKind tidak ditemukan di ${file}`).toBeTruthy();
	return (match?.[1] ?? '')
		.split(',')
		.map((kind) => kind.trim().replace(/^'|'$/g, ''))
		.filter(Boolean);
}

describe('HOST — konsistensi kebijakan sentral ↔ assertHostKind route', () => {
	const EXPECTED: readonly (readonly [string, readonly string[]])[] = [
		// file route, allowed yang dipasang di route (lapis kedua)
		['src/routes/(platform)/+layout.server.ts', ['platform', 'unified']],
		['src/routes/(school)/+layout.server.ts', ['tenant', 'unified']],
		['src/routes/(public)/register/+page.server.ts', ['public', 'unified']],
		['src/routes/(public)/select-context/+page.server.ts', ['platform', 'tenant', 'unified']],
		['src/routes/(public)/access-denied/+page.server.ts', ['platform', 'tenant', 'unified']],
		['src/routes/(auth)/join/+page.server.ts', ['public', 'tenant', 'unified']],
		['src/routes/+layout.server.ts', ['public', 'platform', 'tenant', 'unified']]
	];

	it('HOST-10: setiap assertHostKind route cocok dengan matriks kontrak', () => {
		for (const [file, kinds] of EXPECTED) {
			expect(assertKinds(file), file).toEqual([...kinds]);
		}
	});
});
