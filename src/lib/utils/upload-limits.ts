/**
 * Batas unggahan lewat form action (satu sumber untuk feature & konfigurasi server).
 * Berkas dikirim sebagai base64 di dalam JSON, sehingga body request ±4/3 ukuran berkas.
 */
export const UPLOAD_LIMITS = {
	/** Foto profil (Pengaturan Akun). */
	photoBytes: 2 * 1024 * 1024,
	/** Dokumen pengajuan (Kotak Persetujuan). */
	documentBytes: 5 * 1024 * 1024
} as const;

const BASE64_RATIO = 4 / 3;
/** Cadangan untuk isian JSON lain dan pembungkus multipart form action. */
const ENVELOPE_BYTES = 256 * 1024;

/** Body terbesar yang dikirim aplikasi; `BODY_SIZE_LIMIT` adapter-node minimal sebesar ini. */
export const REQUIRED_BODY_BYTES = Math.ceil(
	Math.max(UPLOAD_LIMITS.photoBytes, UPLOAD_LIMITS.documentBytes) * BASE64_RATIO + ENVELOPE_BYTES
);

const UNIT: Readonly<Record<string, number>> = { K: 1024, M: 1024 ** 2, G: 1024 ** 3 };

/**
 * Membaca nilai `BODY_SIZE_LIMIT` dengan format adapter-node (`512K`, `8M`, `Infinity`, atau byte).
 * `null` = tidak diset / tidak valid (adapter-node memakai default 512K).
 */
export function parseBodySizeLimit(value: string | undefined): number | null {
	const raw = value?.trim().toUpperCase();
	if (!raw) return null;
	if (raw === 'INFINITY') return Number.POSITIVE_INFINITY;
	const match = /^(\d+)([KMG]?)$/.exec(raw);
	if (!match) return null;
	return Number(match[1]) * (match[2] ? (UNIT[match[2]] ?? 1) : 1);
}
