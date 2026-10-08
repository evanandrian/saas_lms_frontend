import type { HostContext } from './host-context';

/**
 * Observabilitas host di luar topologi (P1, ADR-019 §5): mencatat akses yang ditolak ke host
 * tidak dikenal atau `api.<root>` — sinyal salah konfigurasi ingress, scanner, atau probe.
 *
 * Konsisten dengan gaya logging server (`console.warn` di `hooks.server.ts`); tanpa rate
 * limiter eksternal, dedupe per hostname+pathname membatasi kebisingan log per proses.
 */

export const UNKNOWN_HOST_REASON = {
	unknown: 'di luar topologi ADR-019',
	api: 'host api.<root> (harus ditangani ingress)'
} as const;

const MAX_REPORTED_KEYS = 500;
const reportedKeys = new Set<string>();
let resolvedCount = 0;

export interface UnknownHostAccess {
	readonly reason: string;
	readonly hostname: string;
	readonly pathname: string;
}

/**
 * Mencatat akses ke host `unknown`/`api`; mengembalikan catatan bila ini laporan pertama untuk
 * hostname+pathname tersebut, `null` bila host tidak relevan atau sudah pernah dilaporkan.
 */
export function noteUnknownHost(
	host: HostContext,
	hostname: string,
	pathname: string
): UnknownHostAccess | null {
	if (host.kind !== 'unknown' && host.kind !== 'api') return null;
	const key = `${hostname}${pathname}`;
	if (reportedKeys.has(key)) return null;
	if (reportedKeys.size >= MAX_REPORTED_KEYS) reportedKeys.clear();
	reportedKeys.add(key);
	resolvedCount++;
	const access: UnknownHostAccess = {
		reason: UNKNOWN_HOST_REASON[host.kind],
		hostname,
		pathname
	};
	console.warn(
		`[hooks.server] Akses ditolak: host ${access.reason} — ${access.hostname}${access.pathname}`
	);
	return access;
}

/** Total laporan unik yang pernah dicatat (untuk metrik ringan). */
export function unknownHostReportCount(): number {
	return resolvedCount;
}

/** Mengosongkan jejak dedupe (dipakai setup test agar tiap kasus independen). */
export function resetUnknownHostReports(): void {
	reportedKeys.clear();
	resolvedCount = 0;
}
