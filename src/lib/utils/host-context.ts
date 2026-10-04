import { error } from '@sveltejs/kit';

/**
 * Subdomain cadangan yang tidak pernah diperlakukan sebagai tenant (ADR-019 §1).
 * Validasi registrasi tenant di backend harus konsisten dengan daftar ini (OQ-5).
 */
export const RESERVED_SUBDOMAINS = {
	WWW: 'www',
	PLATFORM: 'platform',
	API: 'api'
} as const;

export type HostKind = 'public' | 'www' | 'platform' | 'api' | 'tenant' | 'unified' | 'unknown';

/**
 * Konteks host hasil inspeksi request. `subdomain` hanya label host untuk routing/UX;
 * identitas dan status tenant tetap ditentukan backend (otoritas final, ADR-019).
 */
export type HostContext =
	| { readonly kind: Exclude<HostKind, 'tenant'> }
	| { readonly kind: 'tenant'; readonly subdomain: string };

/**
 * Host gabungan KHUSUS DEVELOPMENT (FE-05R, keputusan pemilik produk): root domain dev (`localhost`)
 * melayani login, konsol platform, dan area sekolah sekaligus; area & tenant ditentukan sesi, bukan host.
 * Hanya dipasang `hooks.server.ts` saat `dev`. Produksi tetap memakai subdomain (ADR-019).
 */
export const UNIFIED_DEV_HOST: HostContext = Object.freeze({ kind: 'unified' });

/** Satu label DNS (huruf kecil); subdomain bertingkat (`a.b.<root>`) otomatis ditolak. */
const DNS_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function normalizeHostname(value: string): string {
	return value.trim().toLowerCase().replace(/\.$/, '');
}

export function resolveHostContext(hostname: string, rootDomain: string): HostContext {
	const host = normalizeHostname(hostname);
	const root = normalizeHostname(rootDomain);

	if (!root) return { kind: 'unknown' };
	if (host === root) return { kind: 'public' };

	const suffix = `.${root}`;
	if (!host.endsWith(suffix)) return { kind: 'unknown' };

	const label = host.slice(0, -suffix.length);
	if (!DNS_LABEL_PATTERN.test(label)) return { kind: 'unknown' };

	switch (label) {
		case RESERVED_SUBDOMAINS.WWW:
			return { kind: 'www' };
		case RESERVED_SUBDOMAINS.PLATFORM:
			return { kind: 'platform' };
		case RESERVED_SUBDOMAINS.API:
			return { kind: 'api' };
		default:
			return { kind: 'tenant', subdomain: label };
	}
}

/** Route yang diminta di host yang salah diperlakukan sebagai tidak ada (ADR-019 §4). */
export function assertHostKind(host: HostContext, allowed: readonly HostKind[]): void {
	if (!allowed.includes(host.kind)) {
		error(404, { message: 'Not Found' });
	}
}

/**
 * URL absolut di host publik (root domain) dari request di host lain, mis. tautan pendaftaran
 * dari halaman login tenant. Protokol dan port mengikuti request saat ini.
 */
export function buildPublicUrl(currentUrl: URL, rootDomain: string, pathname: string): string {
	return buildHostUrl(currentUrl, rootDomain, null, pathname);
}

/**
 * URL absolut di host lain dalam topologi ADR-019: `subdomain` = `null` untuk root domain,
 * `platform` untuk konsol, atau subdomain tenant. Protokol dan port mengikuti request saat ini.
 */
export function buildHostUrl(
	currentUrl: URL,
	rootDomain: string,
	subdomain: string | null,
	pathname: string
): string {
	const root = normalizeHostname(rootDomain);
	const host = subdomain ? `${subdomain}.${root}` : root;
	const port = currentUrl.port ? `:${currentUrl.port}` : '';
	return new URL(pathname, `${currentUrl.protocol}//${host}${port}`).href;
}
