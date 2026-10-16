import {
	SchoolAnnouncementAudience,
	SchoolAnnouncementRejectReason,
	SchoolAnnouncementStatus,
	type AnnouncementFeedItem,
	type SchoolAnnouncement,
	type SchoolAnnouncementInput
} from '$lib/api/generated/lms';
import {
	charCount,
	lengthIssue,
	lengthMessage
} from '$lib/features/school-admin/school-admin.model';

/**
 * Model UX Pengumuman (Admin Sekolah Fase 3): batas & perapian teks (cermin `announcement_model.go`, dihitung
 * per code point), pemilihan sasaran, aksi per status, label sasaran, dan penggabungan hitungan pending.
 * Pesan validasi memakai kunci `school_admin.errors.*` yang sama dengan isu backend.
 */

type T = (key: string, params?: Readonly<Record<string, string | number>>) => string;

export const PREFIX = 'announcements';

export const TITLE_MIN = 5;
export const TITLE_MAX = 80;
export const BODY_MIN = 20;
export const BODY_MAX = 1000;
export const NOTE_MAX = 500;
export const ARCHIVE_REASON_MIN = 5;
export const ARCHIVE_REASON_MAX = 200;
/** Item feed yang tampil di kartu beranda/widget sebelum "Muat lebih banyak". */
export const FEED_PREVIEW = 3;
/** Ukuran halaman feed backend (keyset). */
export const FEED_PAGE = 20;
/** Batas panjang kursor yang diteruskan ke backend (kursor opak base64url). */
export const CURSOR_MAX = 200;

export const ANNOUNCEMENT_STATUSES = Object.values(SchoolAnnouncementStatus);
export type AnnouncementStatus = SchoolAnnouncementStatus;
export const STATUS_TABS = ['all', ...ANNOUNCEMENT_STATUSES] as const;
export type StatusTab = (typeof STATUS_TABS)[number];
export const GENERAL_AUDIENCES = ['all', 'teacher', 'student', 'guardian'] as const;
export const REJECT_REASONS = Object.values(SchoolAnnouncementRejectReason);
export type RejectReason = SchoolAnnouncementRejectReason;
export const REJECT_OTHER: RejectReason = 'other';

/** Properti Unicode White_Space = himpunan `unicode.IsSpace` Go (U+FEFF bukan spasi, beda dengan `\s` JS). */
const GO_SPACE = /\p{White_Space}+/gu;
const EDGE_SPACE = /^ | $/g;
const EDGE_NEWLINES = /^\n+|\n+$/g;

/** Satu baris: spasi berlebih dirapikan (cermin `clean` Go = strings.Fields + join). */
export const cleanLine = (s: unknown): string =>
	typeof s === 'string' ? s.replace(GO_SPACE, ' ').replace(EDGE_SPACE, '') : '';

/** Isi multi-baris: baris baru dipertahankan, spasi per baris dirapikan (cermin `cleanMultiline` Go). */
export function cleanMultiline(s: unknown): string {
	if (typeof s !== 'string') return '';
	return s.replace(/\r\n?/g, '\n').split('\n').map(cleanLine).join('\n').replace(EDGE_NEWLINES, '');
}

export interface AnnouncementForm {
	title: string;
	body: string;
	audience: SchoolAnnouncementAudience | '';
	grade_level_id: string;
	class_id: string;
}

export type AnnouncementField = 'title' | 'body' | 'audience' | 'grade_level_id' | 'class_id';

export const emptyForm = (): AnnouncementForm => ({
	title: '',
	body: '',
	audience: '',
	grade_level_id: '',
	class_id: ''
});

/** Form dari pengumuman yang diubah/diperbaiki. */
export const formOf = (a: SchoolAnnouncement): AnnouncementForm => ({
	title: a.title,
	body: a.body,
	audience: a.audience,
	grade_level_id: a.grade_level_id ?? '',
	class_id: a.class_id ?? ''
});

/** Validasi klien = isu server (`required`, `min_chars:<n>`, `max_chars:<n>`). */
export function announcementErrors(
	f: AnnouncementForm,
	t: T
): Partial<Record<AnnouncementField, string>> {
	const e: Partial<Record<AnnouncementField, string>> = {};
	const title = lengthIssue(cleanLine(f.title), TITLE_MIN, TITLE_MAX);
	if (title) e.title = lengthMessage(t, title, TITLE_MIN, TITLE_MAX);
	const body = lengthIssue(cleanMultiline(f.body), BODY_MIN, BODY_MAX);
	if (body) e.body = lengthMessage(t, body, BODY_MIN, BODY_MAX);
	if (!f.audience) e.audience = t('school_admin.errors.required');
	else if (f.audience === 'guardian_grade' && !f.grade_level_id)
		e.grade_level_id = t('school_admin.errors.required');
	else if (f.audience === 'class' && !f.class_id) e.class_id = t('school_admin.errors.required');
	return e;
}

/** Body simpan: teks dirapikan; id tingkat/kelas hanya untuk sasaran yang memakainya. */
export function announcementBody(f: AnnouncementForm): SchoolAnnouncementInput {
	const audience = (f.audience || 'all') as SchoolAnnouncementAudience;
	return {
		title: cleanLine(f.title),
		body: cleanMultiline(f.body),
		audience,
		...(audience === 'guardian_grade' ? { grade_level_id: f.grade_level_id } : {}),
		...(audience === 'class' ? { class_id: f.class_id } : {})
	};
}

const GRADE_KEY = 'grade:';
const CLASS_KEY = 'class:';

/** Nilai select "Penerima" berkelompok: sasaran umum, `grade:<id>`, atau `class:<id>`. */
export function audienceKey(f: Pick<AnnouncementForm, 'audience' | 'grade_level_id' | 'class_id'>) {
	if (f.audience === 'guardian_grade') return `${GRADE_KEY}${f.grade_level_id}`;
	if (f.audience === 'class') return `${CLASS_KEY}${f.class_id}`;
	return f.audience;
}

export function audienceFromKey(
	key: string
): Pick<AnnouncementForm, 'audience' | 'grade_level_id' | 'class_id'> {
	if (key.startsWith(GRADE_KEY))
		return {
			audience: 'guardian_grade',
			grade_level_id: key.slice(GRADE_KEY.length),
			class_id: ''
		};
	if (key.startsWith(CLASS_KEY))
		return { audience: 'class', grade_level_id: '', class_id: key.slice(CLASS_KEY.length) };
	const general = (GENERAL_AUDIENCES as readonly string[]).includes(key);
	return {
		audience: general ? (key as SchoolAnnouncementAudience) : '',
		grade_level_id: '',
		class_id: ''
	};
}

/** "Semua warga sekolah", "Orang tua Kelas X", "Kelas X-A", … (label tingkat/kelas dari backend). */
export function audienceText(
	t: T,
	a: Pick<AnnouncementFeedItem, 'audience' | 'audience_label'>
): string {
	if (a.audience === 'guardian_grade')
		return t(`${PREFIX}.audience.guardian_grade_of`, { label: a.audience_label });
	if (a.audience === 'class') return t(`${PREFIX}.audience.class_of`, { label: a.audience_label });
	return t(`${PREFIX}.audience.${a.audience}`);
}

export type AnnouncementAction = 'edit' | 'submit' | 'delete' | 'withdraw' | 'fix' | 'archive';

/** Aksi admin per status (tabel transisi spec; `archived` final). */
export function statusActions(status: AnnouncementStatus): AnnouncementAction[] {
	switch (status) {
		case 'draft':
			return ['edit', 'submit', 'delete'];
		case 'pending':
			return ['withdraw'];
		case 'rejected':
			return ['fix'];
		case 'published':
			return ['archive'];
		default:
			return [];
	}
}

/** Validasi alasan arsip (5–200). */
export function archiveReasonError(reason: string, t: T): string {
	const issue = lengthIssue(cleanLine(reason), ARCHIVE_REASON_MIN, ARCHIVE_REASON_MAX);
	return issue ? lengthMessage(t, issue, ARCHIVE_REASON_MIN, ARCHIVE_REASON_MAX) : '';
}

/** Validasi tolak kepala sekolah: alasan wajib; catatan wajib bila "Lainnya"; ≤ 500. */
export function rejectErrors(
	reason: RejectReason | '',
	note: string,
	t: T
): Partial<Record<'reason_code' | 'note', string>> {
	const e: Partial<Record<'reason_code' | 'note', string>> = {};
	const text = cleanMultiline(note);
	if (!reason) e.reason_code = t('school_admin.errors.required');
	if (reason === REJECT_OTHER && !text) e.note = t('school_admin.errors.required');
	if (charCount(text) > NOTE_MAX) e.note = lengthMessage(t, 'too_long', 0, NOTE_MAX);
	return e;
}

/** Validasi catatan persetujuan (opsional, ≤ 500). */
export const approveNoteError = (note: string, t: T): string =>
	charCount(cleanMultiline(note)) > NOTE_MAX ? lengthMessage(t, 'too_long', 0, NOTE_MAX) : '';

/**
 * Badge "Persetujuan": pengajuan akun (null bila bukan peninjau) + pengumuman menunggu (null bila bukan
 * kepala sekolah / gagal dimuat). Keduanya null → badge tidak tampil.
 */
export function combinedPending(accounts: number | null, announcements: number | null) {
	if (accounts === null && announcements === null) return null;
	return (accounts ?? 0) + (announcements ?? 0);
}

const TIME_ZONE = 'Asia/Jakarta';

/** "16 Okt 2026, 08.30" (WIB). */
export const formatAnnouncementTime = (iso: string, locale = 'id-ID') =>
	new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: TIME_ZONE
	}).format(new Date(iso));

/** Gabung halaman feed berikutnya tanpa duplikat (id sama diabaikan). */
export function appendUnique<X extends { id: string }>(
	list: readonly X[],
	next: readonly X[]
): X[] {
	const seen = new Set(list.map((x) => x.id));
	return [...list, ...next.filter((x) => !seen.has(x.id))];
}
