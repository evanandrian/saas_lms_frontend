import {
	GetSchoolAuditCategory,
	SchoolAuditActorRole,
	type SchoolAssessmentsInput,
	type SchoolExtraInput,
	type SchoolPlanAssessment,
	type SchoolPlanExtra,
	type SchoolPlanningView,
	type SchoolRemindOutcome,
	type SchoolReportRecipient,
	type SchoolReportRemindInput,
	type SchoolSetupState,
	type SchoolStudentRow,
	type SchoolSubjectItem,
	type SchoolSubjectsInput
} from '$lib/api/generated/lms';
import type { BackendIssue } from '$lib/api/backend-call';
import { formatNumber } from '$lib/utils/format';
import { initialsOf } from '$lib/utils/initials';
import type { PageActionOutcome } from '$lib/utils/page-action';

/**
 * Model UX Admin Sekolah: label status, pemetaan kode error backend → kunci i18n,
 * dan validasi cepat di klien (cermin aturan backend; backend tetap sumber kebenaran).
 */

type T = (key: string, params?: Readonly<Record<string, string | number>>) => string;

export const PREFIX = 'school_admin';

/** Kunci 12 bagian data sekolah (backend `Sec*`). */
export const REQUIRED_SECTIONS = ['profile', 'curriculum', 'year', 'classes', 'subjects'] as const;
export const OPTIONAL_SECTIONS = [
	'teachers',
	'students',
	'assign',
	'objectives',
	'assess',
	'schedule',
	'extras'
] as const;
export type SectionKey = (typeof REQUIRED_SECTIONS)[number] | (typeof OPTIONAL_SECTIONS)[number];

export const ACCOUNT_TONES = {
	active: 'success',
	invited: 'info',
	not_invited: 'warning',
	inactive: 'neutral'
} as const;
export type AccountStatus = keyof typeof ACCOUNT_TONES;

export const REPORT_STATUSES = ['draft', 'submitted', 'approved', 'locked'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const RELATIONS = ['father', 'mother', 'guardian'] as const;
export const WEEKDAYS = [1, 2, 3, 4, 5, 6] as const;

export const ATTENDANCE_STATUSES = ['present', 'sick', 'permit', 'absent'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Ambang warna presensi (referensi denah: ≥ 95 hijau tua, 90–94 hijau muda, < 90 oranye). */
export const ATTENDANCE_HIGH = 95;
export const ATTENDANCE_MID = 90;
export const SEAT_WARNING_RATIO = 0.9;
export const SEAT_SEGMENTS = 40;
export const LIST_LIMIT = 200;
/** Cermin backend `maxImportRows`: baris maksimal per berkas impor. */
export const MAX_IMPORT_ROWS = 2000;

export const RE = {
	email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
	nip: /^([0-9]{18}|[0-9]{16})$/,
	principalNip: /^[0-9]{18}$/,
	nis: /^[0-9]{4,20}$/,
	nisn: /^[0-9]{10}$/,
	phone: /^\+?[0-9]{9,15}$/,
	year: /^\d{4}\/\d{4}$/,
	code: /^[A-Z0-9_]{2,20}$/
} as const;

/** Nomor urut kode TP: bilangan bulat bertanda opsional (cermin `strconv.Atoi` backend). */
const OBJECTIVE_ORDER = /^[+-]?\d+$/;

/**
 * Prediksi kode TP baru "TP-<tingkat>.<max+1>" dari kode TP mapel×tingkat yang ada — cermin backend
 * `nextObjectiveCode` (bukan jumlah, agar tidak bentrok setelah penghapusan).
 */
export function nextObjectiveCode(grade: number | string, existing: readonly string[]): string {
	const prefix = `TP-${grade}.`;
	let max = 0;
	for (const code of existing) {
		if (!code.startsWith(prefix)) continue;
		const rest = code.slice(prefix.length);
		if (OBJECTIVE_ORDER.test(rest)) max = Math.max(max, Number(rest));
	}
	return `${prefix}${max + 1}`;
}

export const normalizePhone = (v: string) => v.replace(/[\s-]/g, '');

const HONORIFIC_PREFIX = /^(Dra?|Drs|H|Hj)\.\s*/;

/** Inisial avatar tanpa gelar depan (mis. "Dra. Siti Aminah" → "SA"); nama kosong → "?". */
export const initials = (name: string) => initialsOf(name.replace(HONORIFIC_PREFIX, '')) || '?';

export const percent = (part: number, total: number) =>
	total > 0 ? Math.round((part / total) * 100) : 0;

const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = 1024 * BYTES_PER_MB;

/** Pemakaian penyimpanan (MB) terhadap kuota paket (GB); kuota null/0 = tampilkan pemakaian saja. */
export function storageUsage(
	usage: { storage_bytes: number; storage_quota_bytes?: number | null },
	locale: string
): { used: string; quota: string | null; pct: number | null } {
	const used = formatNumber(usage.storage_bytes / BYTES_PER_MB, locale, {
		maximumFractionDigits: 1
	});
	if (!usage.storage_quota_bytes) return { used, quota: null, pct: null };
	return {
		used,
		quota: formatNumber(usage.storage_quota_bytes / BYTES_PER_GB, locale, {
			maximumFractionDigits: 1
		}),
		pct: percent(usage.storage_bytes, usage.storage_quota_bytes)
	};
}

export function attendanceBand(pct: number | null): 'high' | 'mid' | 'low' | 'unfilled' {
	if (pct === null) return 'unfilled';
	if (pct >= ATTENDANCE_HIGH) return 'high';
	if (pct >= ATTENDANCE_MID) return 'mid';
	return 'low';
}

/** Hari ISO lokal (YYYY-MM-DD) digeser n hari. */
export function shiftDate(iso: string, days: number): string {
	const d = new Date(`${iso}T00:00:00`);
	d.setDate(d.getDate() + days);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ===== Error backend =====

type Failure = Extract<PageActionOutcome<never>, { ok: false }>;

/** Kode isu field (`{field, code}`) → pesan; kode dengan parameter memakai format `kode:nilai`. */
export function issueMessage(t: T, code: string): string {
	const [base, arg = ''] = code.split(':');
	const key = `${PREFIX}.errors.${base}`;
	const text = t(key, { value: arg });
	return text === key ? t(`${PREFIX}.errors.generic`) : text;
}

/** Kode 429 endpoint kredensial publik (aktivasi murid, undangan akun). */
export const RATE_LIMITED_CODE = 'rate_limited';
const MINUTE_MS = 60_000;

/** Sisa menit (dibulatkan ke atas, min. 1) dari `details.retry_at` backend; tidak ada/invalid → null. */
export function retryMinutes(retryAt: string | null, now = Date.now()): number | null {
	if (!retryAt) return null;
	const at = Date.parse(retryAt);
	if (Number.isNaN(at)) return null;
	return Math.max(1, Math.ceil((at - now) / MINUTE_MS));
}

/** Pesan gagal halaman aktivasi/undangan; `rate_limited` menampilkan sisa menit bila diketahui. */
export function credentialFailureMessage(t: T, code: string, minutes: number | null): string {
	if (code !== RATE_LIMITED_CODE) return issueMessage(t, code);
	return minutes === null
		? t(`${PREFIX}.errors.rate_limited_later`)
		: t(`${PREFIX}.errors.rate_limited`, { minutes });
}

/** Peta field → pesan pertama untuk form. */
export function fieldErrors(t: T, failure: Failure): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of failure.issues) {
		if (!out[issue.field]) out[issue.field] = issueMessage(t, issue.code);
	}
	return out;
}

/** Pesan umum untuk toast/banner dari kegagalan aksi. */
export function failureMessage(t: T, failure: Failure): string {
	if (failure.issues.length) return issueMessage(t, failure.issues[0]?.code ?? '');
	const key = `${PREFIX}.errors.${failure.code}`;
	const text = t(key);
	return text === key ? t(`${PREFIX}.errors.generic`) : text;
}

/**
 * Toast "Ingatkan" presensi dari hasil nyata backend (`data.reminder`): jumlah wali kelas yang
 * diantrekan email + kelas yang dilewati beserta alasannya. Tanpa hasil (backend lama) → pesan umum.
 */
export function attendanceReminderMessage(
	t: T,
	outcome:
		| Pick<SchoolRemindOutcome, 'notified_teachers' | 'skipped_no_homeroom' | 'skipped_no_contact'>
		| null
		| undefined
): string {
	if (!outcome) return t(`${PREFIX}.attendance.reminded_label`);
	const parts = [t(`${PREFIX}.attendance.reminded`, { count: outcome.notified_teachers })];
	if (outcome.skipped_no_homeroom > 0) {
		parts.push(
			t(`${PREFIX}.attendance.reminded_no_homeroom`, { count: outcome.skipped_no_homeroom })
		);
	}
	if (outcome.skipped_no_contact > 0) {
		parts.push(
			t(`${PREFIX}.attendance.reminded_no_contact`, { count: outcome.skipped_no_contact })
		);
	}
	return parts.join(' ');
}

// ===== Prorata (cermin billing.ProrataAmount, SAD F12) =====
export const prorataAmount = (seats: number, unitPrice: number, months: number) =>
	seats * unitPrice * months;

// ===== File → base64 (impor & logo) =====
export function readFileBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = String(reader.result ?? '');
			resolve(result.slice(result.indexOf(',') + 1));
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

// ===== Celah data per bagian (banner "X belum lengkap") =====

export interface SectionLike {
	key: string;
	required: boolean;
	done: boolean;
	metrics: Record<string, number>;
	label: string;
}
export interface ProgressLike {
	progress: { done: number; total: number; req_done: number; req_total: number; missing: string[] };
	sections: SectionLike[];
}

/** Ringkasan jumlah per bagian (referensi `count`). */
export function sectionCount(t: T, section: SectionLike): string {
	const m = section.metrics;
	if (section.key === 'profile')
		return t(`${PREFIX}.sections.profile.${section.done ? 'count_done' : 'count_todo'}`);
	if (section.key === 'curriculum')
		return section.label
			? t(`${PREFIX}.sections.curriculum.name_${section.label}`)
			: t(`${PREFIX}.sections.curriculum.count_todo`);
	if (section.key === 'year' && !section.label) return t(`${PREFIX}.sections.year.count_todo`);
	const k = `${PREFIX}.sections.${section.key}.count`;
	return t(k, {
		classes: m.classes ?? 0,
		grades: m.grades ?? 0,
		subjects: m.subjects ?? 0,
		teachers: m.teachers ?? 0,
		students: m.students ?? 0,
		linked: m.linked ?? 0,
		assignments: m.assignments ?? 0,
		homerooms: m.homerooms ?? 0,
		objectives: m.objectives ?? 0,
		with: m.subjects_with ?? 0,
		types: m.types ?? 0,
		weight: m.weight ?? 0,
		periods: m.periods ?? 0,
		scheduled: m.scheduled ?? 0,
		extras: m.extras ?? 0,
		label: section.label
	});
}

/** Banner celah data untuk satu bagian; null bila bagian sudah lengkap / status tidak tersedia. */
export function sectionGap(
	t: T,
	progress: ProgressLike | null | undefined,
	key: SectionKey,
	setupPath: string,
	why?: string
) {
	const section = progress?.sections.find((s) => s.key === key);
	if (!section || section.done) return null;
	return {
		title: t(`${PREFIX}.gap.title`, { section: t(`${PREFIX}.sections.${key}.title`) }),
		text: `${why ?? t(`${PREFIX}.sections.${key}.why`)} · ${sectionCount(t, section)}`,
		action: t(`${PREFIX}.gap.action`),
		href: section.required ? setupPath : `${setupPath}?section=${key}`
	};
}

/** Dependensi load status 12 bagian (layout admin) — `invalidate` setelah data berubah. */
export const PROGRESS_DEPENDENCY_KEY = 'app:school-progress';

/** Kelas input form drawer (referensi: tinggi 42px, radius 10px). */
export const INPUT_CLASS =
	'lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-[42px] w-full rounded-[10px] px-3 text-sm';
export const inputClass = (error?: string, mono = false) =>
	`${error ? INPUT_CLASS.replace('border-lms-input-border', 'border-lms-danger-text') : INPUT_CLASS}${mono ? ' font-mono' : ''}`;

// ===== Aktivasi trial → berbayar (cermin billing.Calculate, siklus tahunan) =====
export const BASIS_POINTS = 10000;
export const SEATS_PER_CELL = 50;
export const SEAT_CELLS = 40;
export const STUDENTS_PER_GROUP = 32;

export interface ActivationQuote {
	monthly: number;
	subtotal: number;
	tax: number;
	total: number;
}

export function activationQuote(
	plan: { price_idr: number; tax_mode: string; billed_months: number },
	seats: number,
	vatBp: number
): ActivationQuote {
	const gross = plan.price_idr * seats * plan.billed_months;
	const inclusive = plan.tax_mode === 'incl';
	const subtotal = inclusive ? Math.floor((gross * BASIS_POINTS) / (BASIS_POINTS + vatBp)) : gross;
	const tax = inclusive
		? gross - subtotal
		: Math.floor((gross * vatBp + BASIS_POINTS / 2) / BASIS_POINTS);
	return { monthly: plan.price_idr * seats, subtotal, tax, total: subtotal + tax };
}

/**
 * Telepon tersimpan yang tidak dapat didekripsi (`phone_unavailable`, BV03-F1) bukan "tanpa telepon":
 * daftar menampilkan keterangan, bukan nilai kosong/ciphertext.
 */
interface PhoneRow {
	phone: string;
	phone_unavailable?: boolean;
}

/** Kontak di daftar wali: email, lalu telepon; telepon tak terbaca diberi keterangan, bukan "tanpa kontak". */
export function guardianContact(t: T, row: PhoneRow & { email: string }): string {
	if (row.email) return row.email;
	if (row.phone) return row.phone;
	return t(
		`${PREFIX}.${row.phone_unavailable ? 'fields.phone_unavailable' : 'guardians.no_contact'}`
	);
}

/** Catatan field telepon di formulir: telepon tak terbaca dipertahankan bila field dibiarkan kosong. */
export function phoneFieldNote(t: T, row: PhoneRow | null): string {
	return t(`${PREFIX}.fields.${row?.phone_unavailable ? 'phone_unavailable_note' : 'encrypted'}`);
}

/** Batas pesan pengingat rapor (cermin OpenAPI `SchoolReportRemindInput.message` maxLength). */
export const REMIND_MESSAGE_MAX = 500;

/**
 * Body pengingat rapor. `recipient_ids` SELALU eksplisit (pilihan pengguna): bila dihilangkan,
 * backend hanya mengirim ke wali kelas sehingga penerima akan menyempit diam-diam. Pesan kosong =
 * templat backend.
 */
export function remindBody(
	message: string,
	recipientIds: readonly string[]
): SchoolReportRemindInput {
	const text = message.trim().slice(0, REMIND_MESSAGE_MAX);
	return { ...(text ? { message: text } : {}), recipient_ids: [...recipientIds] };
}

/** Pilihan awal dialog pengingat: semua penerima ber-email terpilih, tanpa email tidak pernah. */
export function defaultRecipientPick(
	recipients: readonly SchoolReportRecipient[]
): Record<string, boolean> {
	return Object.fromEntries(recipients.map((r) => [r.teacher_id, r.has_email]));
}

/** ID penerima terpilih; penerima tanpa email dikecualikan walau tercentang. Nilai belum ada = false. */
export function selectedRecipientIds(
	recipients: readonly SchoolReportRecipient[],
	picked: Readonly<Record<string, boolean | undefined>>
): string[] {
	return recipients
		.filter((r) => r.has_email && picked[r.teacher_id] === true)
		.map((r) => r.teacher_id);
}

// ===== Riwayat perubahan (audit) =====

/** Kategori riwayat dari kontrak backend (urutan tab). */
export const AUDIT_CATEGORIES = Object.values(GetSchoolAuditCategory);
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];
/** Peran pelaku untuk filter & kolom riwayat (kontrak backend). */
export const AUDIT_ACTOR_ROLES = Object.values(SchoolAuditActorRole);
export type AuditActorRole = (typeof AUDIT_ACTOR_ROLES)[number];
/** Batas kata kunci pencarian riwayat (cermin OpenAPI `q` maxLength). */
export const AUDIT_QUERY_MAX = 100;
/** Rentang ekspor CSV maksimal, inklusif (cermin backend `auditExportMaxDays`). */
export const AUDIT_EXPORT_MAX_DAYS = 90;
/** Query halaman riwayat berisi kode galat ekspor dari proxy `/app/admin/audit/export`. */
export const AUDIT_EXPORT_ERROR_PARAM = 'export_error';
const AUDIT_EXPORT_FALLBACK_CODE = 'internal_error';
const SAFE_ERROR_CODE = /^[a-z0-9_]{1,64}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export interface AuditFilter {
	category: AuditCategory | '';
	from: string;
	to: string;
	q: string;
	actorRole: AuditActorRole | '';
}

/** Query ekspor CSV riwayat — hanya filter yang terisi. */
export function auditExportQuery(filter: AuditFilter): URLSearchParams {
	const query = new URLSearchParams();
	if (filter.category) query.set('category', filter.category);
	if (filter.from) query.set('from', filter.from);
	if (filter.to) query.set('to', filter.to);
	const q = filter.q.trim().slice(0, AUDIT_QUERY_MAX);
	if (q) query.set('q', q);
	if (filter.actorRole) query.set('actor_role', filter.actorRole);
	return query;
}

/** Tanggal lokal perangkat (YYYY-MM-DD). */
export function localIsoDate(date = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Hari kalender sejak epoch (UTC) agar selisih tidak terpengaruh DST; tanggal rusak → NaN. */
const epochDay = (iso: string) =>
	ISO_DATE.test(iso) ? Date.parse(`${iso}T00:00:00Z`) / MS_PER_DAY : NaN;

/**
 * Cermin `auditExportRange` backend: `to` kosong = hari ini, `from` kosong = 89 hari sebelum `to`;
 * valid bila from ≤ to dan rentang inklusif ≤ 90 hari. Backend tetap memvalidasi (zona sekolah).
 */
export function auditExportRangeValid(from: string, to: string, today: string): boolean {
	const end = epochDay(to || today);
	const start = from ? epochDay(from) : end - (AUDIT_EXPORT_MAX_DAYS - 1);
	if (Number.isNaN(start) || Number.isNaN(end)) return false;
	return start <= end && end - start < AUDIT_EXPORT_MAX_DAYS;
}

/** Kode galat ekspor untuk query halaman: isu field pertama, lalu kode error; hanya karakter aman. */
export function auditExportErrorCode(failure: { code: string; issues: readonly BackendIssue[] }) {
	const code = failure.issues[0]?.code || failure.code;
	return SAFE_ERROR_CODE.test(code) ? code : AUDIT_EXPORT_FALLBACK_CODE;
}

/** Pesan Toast galat ekspor: `errors.<kode>` bila ada, selain itu pesan ekspor umum. */
export function auditExportErrorMessage(t: T, code: string): string {
	const key = `${PREFIX}.errors.${code}`;
	const text = t(key);
	return text === key ? t(`${PREFIX}.audit.export_failed`) : text;
}

/** Label peran pelaku; peran di luar kontrak (mis. EVENT_ORGANIZER) → "Lainnya", bukan "Sistem". */
export function auditRoleLabel(t: T, role: string): string {
	return AUDIT_ACTOR_ROLES.includes(role as AuditActorRole)
		? t(`${PREFIX}.audit.role.${role}`)
		: t(`${PREFIX}.audit.role.other`);
}

/** Nilai input apa pun → string ter-trim (angka/undefined dari binding tidak melempar). */
const textOf = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Bilangan bulat min–max dari input number Svelte (number | null) atau string; null bila kosong,
 * bukan bilangan bulat, atau di luar rentang. Dasar `parseKktp` & `weightValid`.
 */
export function intInRange(
	raw: string | number | null | undefined,
	min: number,
	max: number
): number | null {
	if (raw === null || raw === undefined) return null;
	if (typeof raw === 'string' && !raw.trim()) return null;
	const value = Number(raw);
	return Number.isInteger(value) && value >= min && value <= max ? value : null;
}

// ===== Mata pelajaran (halaman Mapel & TP, wizard setup) =====
/** Cermin backend `SaveSubjects`: nama mapel minimal 2 karakter (rune). */
export const SUBJECT_NAME_MIN = 2;
export const KKTP_MAX = 100;

/** KKTP dari input; null bila kosong/bukan bilangan bulat 0–100. */
export const parseKktp = (raw: string | number | null | undefined): number | null =>
	intInRange(raw, 0, KKTP_MAX);

/** Kode masalah validasi mapel; dipetakan ke `errors.<kode>` (atau pesan ringkas wizard). */
export type SubjectIssue = 'code_invalid' | 'code_taken' | 'required';

/**
 * Validasi cepat tambah/ubah mapel, dipakai wizard setup & halaman Mapel (cermin `SaveSubjects`
 * backend: kode `RE.code`, nama ≥ 2 karakter). `existing` = kode yang sudah ada; null = kode
 * tidak divalidasi (mode ubah, kode terkunci).
 */
export function subjectIssues(
	f: { code: string; name: string },
	existing: readonly string[] | null
): Partial<Record<'code' | 'name', SubjectIssue>> {
	const issues: Partial<Record<'code' | 'name', SubjectIssue>> = {};
	if (existing) {
		const code = textOf(f.code).toUpperCase();
		if (!RE.code.test(code)) issues.code = 'code_invalid';
		else if (existing.includes(code)) issues.code = 'code_taken';
	}
	if ([...textOf(f.name)].length < SUBJECT_NAME_MIN) issues.name = 'required';
	return issues;
}

export interface SubjectRow extends SchoolSubjectItem {
	/** Id `subject_m` (null bila katalog belum dipakai sekolah). */
	id: string | null;
	objectives: number;
}

/** Baris tabel mapel: KKTP & status dari setup, id & jumlah TP dari perencanaan (cocok per kode). */
export function subjectRows(setup: SchoolSetupState, planning: SchoolPlanningView): SubjectRow[] {
	const idOf = new Map(planning.subjects.map((s) => [s.code, s.id]));
	const count = new Map<string, number>();
	for (const o of planning.objectives) count.set(o.subject_id, (count.get(o.subject_id) ?? 0) + 1);
	return setup.subjects.map((s) => {
		const id = idOf.get(s.code) ?? null;
		return { ...s, id, objectives: id ? (count.get(id) ?? 0) : 0 };
	});
}

/** Body `PUT /setup/subjects`: seluruh daftar; item ber-kode sama diganti, kode baru ditambah. */
export function subjectsPayload(
	items: readonly SchoolSubjectItem[],
	edit: SchoolSubjectItem | null
): SchoolSubjectsInput {
	const list = items.map((s) => ({ ...s }));
	if (edit) {
		const next = { ...edit, code: edit.code.trim().toUpperCase(), name: edit.name.trim() };
		const at = list.findIndex((s) => s.code === next.code);
		if (at >= 0) list[at] = next;
		else list.push(next);
	}
	return { subjects: list };
}

// ===== Beban mengajar (halaman Penugasan) =====
/** Beban wajib guru per minggu (referensi: ASN 24–40 JP); di luar rentang ditandai, tidak diblokir. */
export const TEACHING_LOAD_MIN_JP = 24;
export const TEACHING_LOAD_MAX_JP = 40;

export interface TeacherLoad {
	teacher_id: string;
	name: string;
	/** JP per minggu = jumlah sel jadwal pelajaran semester aktif. */
	jp: number;
	subjects: string[];
	classes: string[];
	flag: 'low' | 'ok' | 'high';
}

export function loadFlag(jp: number): TeacherLoad['flag'] {
	if (jp < TEACHING_LOAD_MIN_JP) return 'low';
	return jp > TEACHING_LOAD_MAX_JP ? 'high' : 'ok';
}

export function teacherLoads(planning: SchoolPlanningView): TeacherLoad[] {
	const subjectCode = new Map(planning.subjects.map((s) => [s.id, s.code]));
	const className = new Map(planning.classes.map((c) => [c.id, c.name]));
	const jp = new Map<string, number>();
	for (const c of planning.schedule) jp.set(c.teacher_id, (jp.get(c.teacher_id) ?? 0) + 1);
	return planning.teachers
		.map((t) => {
			const mine = planning.assignments.filter((a) => a.teacher_id === t.value);
			const hours = jp.get(t.value) ?? 0;
			return {
				teacher_id: t.value,
				name: t.label,
				jp: hours,
				subjects: [...new Set(mine.map((a) => subjectCode.get(a.subject_id) ?? ''))].filter(
					Boolean
				),
				classes: [...new Set(mine.map((a) => className.get(a.class_id) ?? ''))].filter(Boolean),
				flag: loadFlag(hours)
			};
		})
		.filter((l) => l.subjects.length || l.jp);
}

// ===== Asesmen & bobot =====
export const ASSESSMENT_AGGREGATIONS = ['average', 'latest', 'max'] as const;
export type AssessmentAggregation = (typeof ASSESSMENT_AGGREGATIONS)[number];
export const DEFAULT_AGGREGATION: AssessmentAggregation = 'average';
export const DECIMAL_OPTIONS = [0, 1, 2] as const;
export const REASON_MIN = 5;
export const REASON_MAX = 500;
export const ASSESSMENT_NAME_MIN = 2;
const PERCENT = 100;
const ASSESSMENT_CATEGORIES = ['formative', 'summative'] as const;
export const ASSESSMENT_CATEGORY_OPTIONS = ASSESSMENT_CATEGORIES;

/** Skor ilustrasi kartu "Contoh perhitungan" (bukan data murid). */
export const EXAMPLE_SCORES = [78, 72, 80, 85, 75] as const;
export const exampleSample = (codes: readonly string[]): Record<string, number> =>
	Object.fromEntries(codes.map((c, i) => [c, EXAMPLE_SCORES[i % EXAMPLE_SCORES.length]!]));

/** Bobot sah = bilangan bulat 0–100 (kontrak `weight` integer). */
export const weightValid = (raw: string | number | null | undefined): boolean =>
	intInRange(raw, 0, PERCENT) !== null;

/** Bobot untuk perhitungan: dibulatkan ke bilangan bulat, dijepit 0–100; kosong/bukan angka → 0. */
export function normalizeWeight(raw: string | number | null | undefined): number {
	if (raw === null || raw === undefined || (typeof raw === 'string' && !raw.trim())) return 0;
	const value = Number(raw);
	if (!Number.isFinite(value)) return 0;
	return Math.min(PERCENT, Math.max(0, Math.round(value)));
}

/** Digit pembulatan dari select/input; di luar opsi → 0. */
export function normalizeDecimals(raw: string | number | null | undefined): number {
	const value = Number(raw);
	return (DECIMAL_OPTIONS as readonly number[]).includes(value) ? value : 0;
}

const SCORE_SCALE = 100;

/**
 * Contoh perhitungan bobot (bukan nilai resmi). Half-up (BR-31) dengan aritmetika bilangan bulat:
 * skor diskalakan ke perseratus, bobot bulat, sehingga tidak ada galat floating point.
 */
export function weightExample(
	items: readonly { code: string; weight: number }[],
	sample: Readonly<Record<string, number>>,
	decimals: number
) {
	const parts = items
		.filter((i) => i.weight > 0)
		.map((i) => ({ code: i.code, score: sample[i.code] ?? 0, weight: i.weight }));
	// Σ dalam satuan 1/(100·100): skor×100 (bulat) × bobot (bulat).
	const scaled = parts.reduce((sum, p) => sum + Math.round(p.score * SCORE_SCALE) * p.weight, 0);
	const unit = SCORE_SCALE * PERCENT;
	const factor = 10 ** decimals;
	const total = Math.floor((scaled * factor + unit / 2) / unit) / factor;
	return { parts, total };
}

/** Alasan wajib bila kebijakan aktif sudah punya total bobot > 0 (cermin backend, R9). */
export const reasonRequired = (active: readonly { weight: number }[]): boolean =>
	active.reduce((sum, a) => sum + a.weight, 0) > 0;

export const reasonValid = (required: boolean, reason: string): boolean =>
	!required || reason.trim().length >= REASON_MIN;

export function assessmentsBody(
	items: readonly SchoolPlanAssessment[],
	decimals: number,
	reason: string
): SchoolAssessmentsInput {
	const trimmed = reason.trim();
	return {
		...(trimmed ? { reason: trimmed } : {}),
		decimal_places: normalizeDecimals(decimals),
		items: items.map((i) => ({ ...i, aggregation: i.aggregation ?? DEFAULT_AGGREGATION }))
	};
}

// ===== Ekstrakurikuler =====
export const EXTRA_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const EXTRA_NAME_MIN = 2;
export const EXTRA_NAME_MAX = 120;
export const EXTRA_PLACE_MAX = 120;
/** "HH:MM:SS" (mis. nilai `<input type="time">` ber-step detik) → "HH:MM". */
const CLOCK_WITH_SECONDS = /^(\d{2}:\d{2}):\d{2}$/;

export interface ExtraForm {
	name: string;
	coach_id: string;
	/** '' = tanpa jadwal; '1'..'6' = Senin..Sabtu. */
	schedule_day: string;
	start_time: string;
	end_time: string;
	place: string;
	is_mandatory: boolean;
}

/** Hari ekskul dari select/backend (angka atau string) → '1'..'6', selain itu ''. */
export function extraDay(v: unknown): string {
	const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
	return (WEEKDAYS as readonly number[]).includes(n) ? String(n) : '';
}

/** Jam ekskul dari input/backend → string ter-trim, detik dibuang; non-string → ''. */
export function extraClock(v: unknown): string {
	const s = textOf(v);
	return CLOCK_WITH_SECONDS.exec(s)?.[1] ?? s;
}

/** Form ekskul dari data backend (null = ekskul baru). */
export function extraForm(x: SchoolPlanExtra | null | undefined): ExtraForm {
	return {
		name: x?.name ?? '',
		coach_id: x?.coach_id ?? '',
		schedule_day: extraDay(x?.schedule_day),
		start_time: extraClock(x?.start_time),
		end_time: extraClock(x?.end_time),
		place: x?.place ?? '',
		is_mandatory: x?.is_mandatory ?? false
	};
}

/** Validasi cepat ekskul (cermin `parseExtraAttrs` + nama di backend). */
export function extraErrors(f: ExtraForm, t: T): Record<string, string> {
	const e: Record<string, string> = {};
	const name = textOf(f.name);
	const start = extraClock(f.start_time);
	const end = extraClock(f.end_time);
	if (name.length < EXTRA_NAME_MIN || name.length > EXTRA_NAME_MAX)
		e.name = t(`${PREFIX}.errors.required`);
	if (start && !EXTRA_TIME.test(start)) e.start_time = t(`${PREFIX}.errors.time_format`);
	if (end && !EXTRA_TIME.test(end)) e.end_time = t(`${PREFIX}.errors.time_format`);
	if (Boolean(start) !== Boolean(end)) e.start_time ??= t(`${PREFIX}.errors.required`);
	if (!e.start_time && !e.end_time && start && end && end <= start)
		e.end_time = t(`${PREFIX}.errors.before_start`);
	if (textOf(f.place).length > EXTRA_PLACE_MAX) e.place = t(`${PREFIX}.errors.too_long`);
	return e;
}

/**
 * Body simpan ekskul. PUT = penggantian penuh: SEMUA atribut selalu dikirim (kosong → `null`,
 * tidak pernah `undefined` yang hilang saat serialisasi JSON).
 */
export function extraBody(f: ExtraForm): SchoolExtraInput {
	const orNull = (v: string) => v || null;
	const day = extraDay(f.schedule_day);
	return {
		name: textOf(f.name),
		coach_id: textOf(f.coach_id),
		schedule_day: day ? Number(day) : null,
		start_time: orNull(extraClock(f.start_time)),
		end_time: orNull(extraClock(f.end_time)),
		place: orNull(textOf(f.place)),
		is_mandatory: f.is_mandatory === true
	};
}

/** Kandidat anggota: murid aktif yang belum menjadi anggota, cocok nama/NIS. */
export function memberCandidates(
	students: readonly SchoolStudentRow[],
	members: readonly { student_id: string }[],
	query: string
): SchoolStudentRow[] {
	const taken = new Set(members.map((m) => m.student_id));
	const q = textOf(query).toLowerCase();
	return students.filter(
		(s) =>
			s.active &&
			!taken.has(s.id) &&
			(!q || s.name.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q))
	);
}

/**
 * Pesan ConfirmDialog hapus ekskul (wizard & halaman Ekskul). Jumlah = anggota tahun ajaran aktif;
 * backend menghapus keanggotaan SEMUA tahun, jadi teks selalu menyebut riwayat ikut terhapus.
 */
export function extraDeleteMessage(t: T, members: number | null | undefined): string {
	const count = typeof members === 'number' && members > 0 ? members : 0;
	return count
		? t(`${PREFIX}.planning.extra_delete_members`, { count })
		: t(`${PREFIX}.planning.extra_delete_empty`);
}

/** Pilihan murid calon anggota, terikat ke satu ekskul (ganti ekskul → pilihan kosong). */
export interface MemberPicks {
	extraId: string;
	ids: Readonly<Record<string, boolean>>;
}

export const emptyPicks = (extraId = ''): MemberPicks => ({ extraId, ids: {} });

/** Pilihan untuk ekskul `extraId`: dipertahankan bila ekskul sama, selain itu kosong. */
export function picksFor(picks: MemberPicks, extraId: string): MemberPicks {
	return picks.extraId === extraId ? picks : emptyPicks(extraId);
}

export function togglePick(picks: MemberPicks, studentId: string, on: boolean): MemberPicks {
	return { extraId: picks.extraId, ids: { ...picks.ids, [studentId]: on } };
}

/**
 * Id murid tercentang yang dikirim: tidak bergantung pada kueri pencarian (pilihan bertahan saat
 * dicari ulang), tetap hanya murid aktif yang belum menjadi anggota.
 */
export function pickedIds(
	picks: MemberPicks,
	students: readonly SchoolStudentRow[],
	members: readonly { student_id: string }[]
): string[] {
	return memberCandidates(students, members, '')
		.filter((s) => picks.ids[s.id] === true)
		.map((s) => s.id);
}
