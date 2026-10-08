import { error } from '@sveltejs/kit';
import type { HostContext, HostKind } from './host-context';

/**
 * Kebijakan akses host terpusat (P0-2, ADR-019 §4): satu sumber keputusan *prefiks path → host
 * yang boleh membukanya*, dievaluasi `hooks.server.ts` SEBELUM route load — sehingga route tanpa
 * `+page.server.ts`/layout (mis. proxy `register/file`) ikut terproteksi.
 *
 * Panggilan `assertHostKind` di route tetap dipertahankan sebagai lapis kedua (defense-in-depth);
 * keduanya wajib konsisten — diverifikasi contract test HOST-01..10.
 */

/** Semua host yang dilayani SvelteKit; `api` dan `unknown` selalu 404 (sama dengan root layout). */
const ROOT_ALLOWED: readonly HostKind[] = ['public', 'platform', 'tenant', 'unified'];

interface HostPathRule {
	/** Prefiks path tepat atau diakhiri `/` (`/app` → `/app`, `/app/admin`); bukan `/apple`. */
	readonly prefix: string;
	readonly allowed: readonly HostKind[];
}

/**
 * Kumpulan route group saat ini:
 * - `(platform)` → `['platform','unified']`; `(school)` & `(join)` → `['tenant','unified']`;
 * - `(public)` register → `['public','unified']`; select-context & access-denied → platform/tenant;
 * - `(auth)` join → public/tenant; sisanya (login, verify-email, …) cukup aturan ROOT.
 */
const PATH_RULES: readonly HostPathRule[] = [
	{ prefix: '/console', allowed: ['platform', 'unified'] },
	{ prefix: '/settings', allowed: ['platform', 'unified'] },
	{ prefix: '/platform', allowed: ['platform', 'unified'] },
	{ prefix: '/app', allowed: ['tenant', 'unified'] },
	{ prefix: '/register', allowed: ['public', 'unified'] },
	{ prefix: '/join', allowed: ['public', 'tenant', 'unified'] },
	{ prefix: '/select-context', allowed: ['platform', 'tenant', 'unified'] },
	{ prefix: '/access-denied', allowed: ['platform', 'tenant', 'unified'] },
	{ prefix: '/account', allowed: ['platform', 'tenant', 'unified'] },
	{ prefix: '/approvals', allowed: ['platform', 'tenant', 'unified'] }
];

function matchesPrefix(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function notFound(): never {
	error(404, { message: 'Not Found' });
}

/** Tolak host di luar topologi atau host yang salah untuk prefiks path yang diminta (404). */
export function enforceHostAccess(host: HostContext, pathname: string): void {
	if (!ROOT_ALLOWED.includes(host.kind)) notFound();
	const rule = PATH_RULES.find(({ prefix }) => matchesPrefix(pathname, prefix));
	if (rule && !rule.allowed.includes(host.kind)) notFound();
}
