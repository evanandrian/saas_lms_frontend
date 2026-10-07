import type { RequestView } from '$lib/api/generated/lms';
import { UPLOAD_LIMITS } from '$lib/utils/upload-limits';

export type { RequestView } from '$lib/api/generated/lms';

/** Jenis berkas & ukuran dokumen pengajuan (cermin backend `decodeDocument`). */
export const DOCUMENT_TYPES = ['image/png', 'image/jpeg', 'application/pdf'] as const;
export const MAX_DOCUMENT_BYTES = UPLOAD_LIMITS.documentBytes;
export const DOCUMENT_ACCEPT = 'image/png,image/jpeg,application/pdf';
const MS_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;

/** Nada chip status pengajuan (referensi: MENUNGGU/PERLU DOKUMEN/DISETUJUI/DITOLAK). */
export const REQUEST_TONE: Record<string, string> = {
	pending: 'lms-tone-warning',
	need_docs: 'lms-tone-info',
	approved: 'lms-tone-success',
	declined: 'lms-tone-danger'
};

export const isDecided = (r: Pick<RequestView, 'status'>) =>
	r.status === 'approved' || r.status === 'declined';

/** Sisa jam sampai batas waktu (negatif = lewat batas). */
export function hoursLeft(r: Pick<RequestView, 'due_at'>, now: number): number {
	return (new Date(r.due_at).getTime() - now) / MS_HOUR;
}

/** Sisa hari dibulatkan ke atas (referensi: "paling lambat N hari lagi"). */
export const daysLeft = (hours: number) => Math.ceil(hours / HOURS_PER_DAY);

/** Peninjau yang terakhir meminta dokumen (riwayat). */
export function docsRequestedBy(r: Pick<RequestView, 'log'>): string {
	return [...r.log].reverse().find((l) => l.action === 'docs_requested')?.actor ?? '';
}

export type DocumentReadResult =
	| { ok: true; file: { file_name: string; content_type: string; data: string } }
	| { ok: false; reason: 'format' | 'too_large' };

/** Membaca berkas pilihan pengguna menjadi base64 setelah cek jenis & ukuran. */
export function readDocument(file: File): Promise<DocumentReadResult> {
	if (!(DOCUMENT_TYPES as readonly string[]).includes(file.type)) {
		return Promise.resolve({ ok: false, reason: 'format' });
	}
	if (file.size > MAX_DOCUMENT_BYTES) return Promise.resolve({ ok: false, reason: 'too_large' });
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = () => {
			const data = String(reader.result).split(',')[1] ?? '';
			resolve({ ok: true, file: { file_name: file.name, content_type: file.type, data } });
		};
		reader.onerror = () => resolve({ ok: false, reason: 'format' });
		reader.readAsDataURL(file);
	});
}
