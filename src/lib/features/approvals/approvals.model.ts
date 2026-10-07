import type { InboxItem } from '$lib/api/generated/lms';

export type { Inbox, InboxItem } from '$lib/api/generated/lms';

/** Jenis pengajuan di kotak ini (referensi: nama lengkap, nomor identitas, hapus akun). */
export const REQUEST_KINDS = ['name', 'identity', 'deletion'] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const INBOX_TABS = ['pending', 'docs', 'done'] as const;
export type InboxTab = (typeof INBOX_TABS)[number];

export const DECISIONS = ['approve', 'reject', 'docs'] as const;
export type Decision = (typeof DECISIONS)[number];

/** Pilihan alasan penolakan & dokumen per jenis (kunci i18n `approvals.reject.*`, `approvals.docs.*`). */
export const REJECT_OPTIONS: Record<RequestKind, readonly string[]> = {
	name: ['not_official', 'unreadable', 'other'],
	identity: ['not_dapodik', 'unreadable', 'other'],
	deletion: ['pending_tasks', 'need_principal', 'other']
};
export const DOCUMENT_OPTIONS: Record<RequestKind, readonly string[]> = {
	name: ['ktp', 'sk_ijazah', 'birth_certificate'],
	identity: ['identity_card', 'ktp', 'dapodik_proof'],
	deletion: ['transfer_letter', 'resignation_letter']
};
export const OTHER_REASON = 'other';
export const OTHER_REASON_MIN = 10;
/** Pengajuan dianggap "BARU" dalam 10 menit pertama. */
const NEW_WINDOW_MS = 10 * 60_000;
const MS_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;

export const isDone = (x: Pick<InboxItem, 'status'>) =>
	x.status === 'approved' || x.status === 'declined';

export function inTab(x: InboxItem, tab: InboxTab): boolean {
	if (tab === 'pending') return x.status === 'pending';
	if (tab === 'docs') return x.status === 'need_docs';
	return isDone(x);
}

export const hoursLeft = (x: Pick<InboxItem, 'due_at'>, now: number) =>
	(new Date(x.due_at).getTime() - now) / MS_HOUR;

export const isNew = (x: Pick<InboxItem, 'created_at'>, now: number) =>
	now - new Date(x.created_at).getTime() < NEW_WINDOW_MS;

/** Chip batas waktu/keputusan (referensi). */
export type DeadlineChip =
	| { key: 'approved' | 'declined' | 'waiting' | 'self'; tone: string }
	| { key: 'overdue_days' | 'overdue_hours' | 'left_hours' | 'left_days'; tone: string; n: number };

export function deadlineChip(x: InboxItem, now: number): DeadlineChip {
	if (x.status === 'approved') return { key: 'approved', tone: 'lms-tone-success' };
	if (x.status === 'declined') return { key: 'declined', tone: 'lms-tone-danger' };
	if (x.status === 'need_docs') return { key: 'waiting', tone: 'lms-tone-info' };
	if (x.self) return { key: 'self', tone: 'bg-lms-surface-muted text-lms-muted' };
	const h = hoursLeft(x, now);
	if (h < 0) {
		const over = Math.ceil(-h);
		return over >= HOURS_PER_DAY
			? { key: 'overdue_days', tone: 'lms-tone-danger', n: Math.floor(-h / HOURS_PER_DAY) }
			: { key: 'overdue_hours', tone: 'lms-tone-danger', n: over };
	}
	if (h < HOURS_PER_DAY) return { key: 'left_hours', tone: 'lms-tone-warning', n: Math.ceil(h) };
	return {
		key: 'left_days',
		tone: 'bg-lms-surface-muted text-lms-foreground',
		n: Math.floor(h / HOURS_PER_DAY)
	};
}

/** Urutan referensi: menunggu = batas terdekat dulu; selesai = keputusan terbaru dulu. */
export function sortItems(items: InboxItem[], tab: InboxTab, now: number): InboxItem[] {
	return [...items].sort((a, b) =>
		tab === 'done'
			? new Date(b.decided_at ?? 0).getTime() - new Date(a.decided_at ?? 0).getTime()
			: hoursLeft(a, now) - hoursLeft(b, now)
	);
}

export function initials(name: string): string {
	return name
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0])
		.join('')
		.toUpperCase();
}

const TIME_ZONE = 'Asia/Jakarta';

/** "26 Sep 14.05" untuk riwayat. */
export function logTime(iso: string): string {
	const d = new Date(iso);
	return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: TIME_ZONE })} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE })}`;
}

export type Ago = { key: 'just_now' } | { key: 'hours' | 'days'; n: number };

export function ago(iso: string, now: number): Ago {
	const h = Math.floor((now - new Date(iso).getTime()) / MS_HOUR);
	if (h < 1) return { key: 'just_now' };
	if (h < HOURS_PER_DAY) return { key: 'hours', n: h };
	return { key: 'days', n: Math.floor(h / HOURS_PER_DAY) };
}
