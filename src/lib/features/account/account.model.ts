import type {
	AccountArea,
	AccountOverview,
	ClientInfo,
	ExportCategory,
	OAuthProvider,
	UpdateProfileRequest
} from '$lib/api/generated/lms';
import { UPLOAD_LIMITS } from '$lib/utils/upload-limits';

export type {
	AccountArea,
	AccountIssue,
	AccountOverview,
	ClientInfo,
	ExportCategory,
	ExportFormat,
	LoginView,
	NotificationEventView,
	OAuthProvider,
	PasswordChallenge,
	QuietHours,
	SessionView,
	TwoFactorSetup
} from '$lib/api/generated/lms';

/** Tab halaman (referensi `startTab`). */
export const ACCOUNT_TABS = [
	'profile',
	'password',
	'security',
	'sessions',
	'history',
	'notif',
	'linked',
	'privacy'
] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];

export function isAccountTab(value: string | null): value is AccountTab {
	return value !== null && (ACCOUNT_TABS as readonly string[]).includes(value);
}

export const NOTIFICATION_CHANNELS = ['email', 'whatsapp', 'in_app'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const PHONE_VISIBILITIES = ['admin', 'staff', 'all'] as const;
export const EXPORT_FORMATS = ['json', 'csv'] as const;
export const OTP_LENGTH = 6;
export const MAX_PHOTO_BYTES = UPLOAD_LIMITS.photoBytes;
export const PHOTO_TYPES = ['image/png', 'image/jpeg'] as const;
/** Kategori unduh data default saat halaman dibuka (referensi `exportSel`). */
export const DEFAULT_EXPORT_SELECTION: readonly ExportCategory[] = ['profile', 'logins'];
/** Penyedia default (referensi PROV): label tampilan dan tanda huruf. */
export const PROVIDER_MARK: Record<OAuthProvider, string> = { google: 'G', belajar: 'B' };

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------

export interface ProfileDraft {
	full_name: string;
	nickname: string;
	gender: string;
	birth_date: string;
	address: string;
	email: string;
	phone: string;
	identity_number: string;
	/** Data URL foto baru; `null` = tanpa foto; `undefined` = tidak diubah. */
	photo: string | null | undefined;
}

export type ProfileField = Exclude<keyof ProfileDraft, 'photo'>;

/** Aturan nomor identitas per jenis (cermin backend `contextRules`). */
const IDENTITY_RULES: Record<string, RegExp> = {
	employee_id: /^[A-Z0-9]{4,12}$/,
	nip: /^\d{18}$/,
	nuptk: /^\d{16}$/,
	nisn: /^\d{10}$/,
	nik: /^\d{16}$/
};

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_MIN_DIGITS = 9;
const PHONE_MAX_DIGITS = 13;
const FULL_NAME_MIN = 3;

export function formatPhone(digits: string): string {
	const d = digits.replace(/\D/g, '');
	return [d.slice(0, 3), d.slice(3, 7), d.slice(7)].filter(Boolean).join(' ');
}

/** Masukan nomor HP: hanya angka/spasi dan tanpa 0 di depan (referensi `on.phone`). */
export const sanitizePhone = (value: string) => value.replace(/[^\d ]/g, '').replace(/^0+/, '');

export function sanitizeIdentity(value: string, kind: string): string {
	return kind === 'employee_id'
		? value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
		: value.replace(/\D/g, '');
}

export function profileDraft(overview: AccountOverview): ProfileDraft {
	const p = overview.profile;
	return {
		full_name: p.full_name,
		nickname: p.nickname,
		gender: p.gender ?? '',
		birth_date: p.birth_date ?? '',
		address: p.address,
		email: p.email,
		phone: formatPhone(p.phone),
		identity_number: p.identity_number,
		photo: undefined
	};
}

/** Validasi UX (backend tetap otoritas): kode galat per isian. */
export function profileErrors(
	draft: ProfileDraft,
	saved: ProfileDraft,
	identityKind: string,
	today: string
): Partial<Record<ProfileField, string>> {
	const errors: Partial<Record<ProfileField, string>> = {};
	if (draft.full_name.trim().length < FULL_NAME_MIN) errors.full_name = 'too_short';
	if (!EMAIL_PATTERN.test(draft.email.trim())) errors.email = 'invalid';
	const phone = draft.phone.replace(/\D/g, '');
	if (phone.length < PHONE_MIN_DIGITS || phone.length > PHONE_MAX_DIGITS || phone[0] !== '8') {
		errors.phone = 'invalid';
	}
	if (draft.birth_date && draft.birth_date > today) errors.birth_date = 'future';
	const rule = IDENTITY_RULES[identityKind];
	// Nomor identitas lama yang belum pernah diisi tidak menghalangi simpan isian lain (aturan backend).
	if (
		rule &&
		draft.identity_number !== saved.identity_number &&
		!rule.test(draft.identity_number)
	) {
		errors.identity_number = 'invalid';
	}
	return errors;
}

export function profileDirty(draft: ProfileDraft, saved: ProfileDraft): boolean {
	return JSON.stringify(draft) !== JSON.stringify(saved);
}

export function profileRequest(
	draft: ProfileDraft,
	updatedAt: string,
	photo: { contentType: string; data: string } | null
): UpdateProfileRequest {
	return {
		full_name: draft.full_name,
		nickname: draft.nickname,
		gender: draft.gender,
		birth_date: draft.birth_date,
		address: draft.address,
		email: draft.email,
		phone: draft.phone,
		identity_number: draft.identity_number,
		photo:
			draft.photo === undefined
				? { action: 'keep', content_type: '', data: '' }
				: draft.photo === null
					? { action: 'remove', content_type: '', data: '' }
					: { action: 'replace', content_type: photo?.contentType ?? '', data: photo?.data ?? '' },
		updated_at: updatedAt
	};
}

/** Pisahkan data URL menjadi tipe + base64 untuk dikirim ke backend. */
export function splitDataUrl(dataUrl: string): { contentType: string; data: string } | null {
	const match = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(dataUrl);
	return match ? { contentType: match[1] ?? '', data: match[2] ?? '' } : null;
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

// ---------------------------------------------------------------------------
// Kata sandi (cermin `passwordIssues` backend)
// ---------------------------------------------------------------------------

export const PASSWORD_RULES = ['min_length', 'mixed_case', 'digit', 'symbol', 'no_name'] as const;
export type PasswordRule = (typeof PASSWORD_RULES)[number];

export function passwordChecks(password: string, fullName: string): Record<PasswordRule, boolean> {
	const first = fullName.toLowerCase().split(' ')[0] ?? '';
	return {
		min_length: [...password].length >= 8,
		mixed_case: /\p{Ll}/u.test(password) && /\p{Lu}/u.test(password),
		digit: /\d/.test(password),
		symbol: /[^\p{L}\p{N}]/u.test(password),
		no_name: !password || !first || !password.toLowerCase().includes(first)
	};
}

/** Skor 0–4 (referensi: ≤2 syarat = lemah, 3 = cukup, 4 = kuat, 5 = sangat kuat). */
export function passwordScore(password: string, met: number): 0 | 1 | 2 | 3 | 4 {
	if (!password) return 0;
	if (met <= 2) return 1;
	if (met === 3) return 2;
	if (met === 4) return 3;
	return 4;
}

// ---------------------------------------------------------------------------
// Tampilan waktu & perangkat
// ---------------------------------------------------------------------------

const TIME_ZONE = 'Asia/Jakarta';
const MS_MINUTE = 60_000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;
const ACTIVE_NOW_MS = 5 * MS_MINUTE;

const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TIME_ZONE });
const clock = (d: Date) =>
	d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });

/** "8 Jul 2026, 19.42" */
export function formatDateTime(iso: string): string {
	const d = new Date(iso);
	return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE })}, ${clock(d)}`;
}

export type RelativeDay =
	{ key: 'today' | 'yesterday'; time: string } | { key: 'date'; time: string };

/** Riwayat login: "Hari ini 06.12" / "Kemarin 19.40" / "3 Okt 21.17". */
export function loginTime(iso: string, now: Date): RelativeDay {
	const d = new Date(iso);
	const yesterday = new Date(now.getTime() - MS_DAY);
	if (dayKey(d) === dayKey(now)) return { key: 'today', time: clock(d) };
	if (dayKey(d) === dayKey(yesterday)) return { key: 'yesterday', time: clock(d) };
	return {
		key: 'date',
		time: `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: TIME_ZONE })} ${clock(d)}`
	};
}

export type ActiveAgo = { key: 'now' } | { key: 'minutes' | 'hours' | 'days'; count: number };

/** Sesi: "aktif sekarang" / "aktif 2 jam lalu" / "aktif 3 hari lalu". */
export function activeAgo(iso: string, now: Date): ActiveAgo {
	const diff = now.getTime() - new Date(iso).getTime();
	if (diff < ACTIVE_NOW_MS) return { key: 'now' };
	if (diff < MS_HOUR) return { key: 'minutes', count: Math.floor(diff / MS_MINUTE) };
	if (diff < MS_DAY) return { key: 'hours', count: Math.floor(diff / MS_HOUR) };
	return { key: 'days', count: Math.floor(diff / MS_DAY) };
}

export function clientLabel(client: ClientInfo | null | undefined, unknown: string): string {
	const parts = [client?.browser, client?.os].filter(Boolean);
	return parts.length ? parts.join(' · ') : unknown;
}

/** Hitung mundur kirim ulang dalam detik. */
export function secondsUntil(iso: string | null, now: number): number {
	if (!iso) return 0;
	return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000));
}

/** Tanggal hari ini (WIB) untuk batas tanggal lahir. */
export const todayIso = (now: Date) => dayKey(now);

export const isArea = (value: string): value is AccountArea =>
	['platform', 'school_admin', 'teacher', 'student', 'guardian'].includes(value);
