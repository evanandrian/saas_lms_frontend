import type { RegistrationState, SignupCatalog, SignupPlan } from '$lib/api/generated/lms';

/**
 * Model wizard Daftar & berlangganan (client-safe; referensi "02 Daftar & Berlangganan").
 * Status, paket, dan harga final selalu dari backend; perhitungan di sini hanya pratinjau saat pengguna
 * menggeser kursi/siklus sebelum disimpan (rumus sama dengan `billing.Calculate` di backend).
 */
export type { RegistrationState, SignupCatalog, SignupPlan };

export type TenantType = 'school' | 'personal' | 'event';
export const TENANT_TYPES: readonly TenantType[] = ['school', 'personal', 'event'];

/** Fase PENDAFTARAN (referensi REG). */
export const REG_STEPS = [
	'akun',
	'otp',
	'lembaga',
	'paket',
	'bayar',
	'persetujuan',
	'provisioning'
] as const;
/** Fase SETUP AWAL per jenis (referensi SETUP). */
export const SETUP_STEPS: Readonly<Record<TenantType, readonly string[]>> = {
	school: ['profil', 'tahun', 'kelas', 'mapel', 'guru', 'murid', 'selesai'],
	personal: ['profil', 'kelas', 'murid', 'selesai'],
	event: ['profil', 'selesai']
};
export type WizardStep =
	| (typeof REG_STEPS)[number]
	| 'profil'
	| 'tahun'
	| 'kelas'
	| 'mapel'
	| 'guru'
	| 'murid'
	| 'selesai';

export const stepsFor = (type: TenantType): WizardStep[] => [
	...REG_STEPS,
	...(SETUP_STEPS[type] as WizardStep[])
];

export const isTenantType = (v: unknown): v is TenantType =>
	typeof v === 'string' && (TENANT_TYPES as readonly string[]).includes(v);

/** Langkah wizard dari status backend; `done` = setup selesai (masuk dashboard). */
export function stepFromState(state: RegistrationState | null): WizardStep | 'done' {
	const app = state?.application;
	if (!app) return 'akun';
	if (app.current_step === 'done') return 'done';
	const steps = stepsFor(isTenantType(app.tenant_type) ? app.tenant_type : 'school');
	return (steps as string[]).includes(app.current_step)
		? (app.current_step as WizardStep)
		: 'lembaga';
}

// ===== Validasi (sama dengan backend; kode isian diterjemahkan i18n) =====

export const RULES = {
	nameMin: 3,
	phoneMin: 9,
	phoneMax: 13,
	passwordMinScore: 3,
	addressMin: 8,
	npsnDigits: 8,
	nipDigits: 18,
	telpMin: 8,
	maxParticipants: 1000,
	seatsMin: 50,
	seatsMax: 2000,
	seatsStep: 50,
	seatsRangeStep: 10,
	bioMax: 280,
	capacityMin: 10,
	capacityMax: 50,
	groupsMax: 15,
	kktpMax: 100,
	otpDigits: 6,
	studentsPerGroup: 32
} as const;

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const isEmail = (v: string) => EMAIL_PATTERN.test(v.trim());
export const onlyDigits = (v: string, max?: number) => {
	const d = v.replace(/\D/g, '');
	return max ? d.slice(0, max) : d;
};

/** Kekuatan kata sandi 0–4 (8+ karakter, huruf besar & kecil, angka, simbol atau 12+). */
export function passwordScore(p: string): number {
	return [
		p.length >= 8,
		/[a-z]/.test(p) && /[A-Z]/.test(p),
		/\d/.test(p),
		/[^A-Za-z0-9]/.test(p) || p.length >= 12
	].filter(Boolean).length;
}

// ===== Harga (pratinjau) =====

const MONTHS_PER_YEAR = 12;
const BASIS_POINTS = 10000;

export interface PricePreview {
	quantity: number;
	billedMonths: number;
	subtotal: number;
	tax: number;
	total: number;
}

export function pricePreview(
	plan: SignupPlan,
	cycle: 'month' | 'year' | 'one_time',
	seats: number,
	vatBasisPoints: number
): PricePreview {
	let billedMonths = 1;
	let quantity = 1;
	if (plan.pricing_model !== 'package') {
		if (cycle === 'year') billedMonths = MONTHS_PER_YEAR - plan.free_months;
		if (plan.pricing_model === 'seat') quantity = seats;
	}
	const gross = plan.price_idr * quantity * billedMonths;
	let subtotal = gross;
	let tax = Math.round((gross * vatBasisPoints) / BASIS_POINTS);
	if (plan.tax_mode === 'incl') {
		subtotal = Math.floor((gross * BASIS_POINTS) / (BASIS_POINTS + vatBasisPoints));
		tax = gross - subtotal;
	}
	return { quantity, billedMonths, subtotal, tax, total: subtotal + tax };
}

export const rupiah = (n: number, locale = 'id-ID') =>
	'Rp' + Math.round(n).toLocaleString(locale === 'en' ? 'en-US' : 'id-ID');

/** Huruf/angka rombel (referensi: X-A, X-B / X-1, X-2). */
export const groupSuffix = (index: number, scheme: 'huruf' | 'angka') =>
	scheme === 'huruf' ? String.fromCharCode(65 + index) : String(index + 1);

/** Batas berkas (sama dengan backend). */
export const FILE_LIMITS = {
	logoBytes: 2 * 1024 * 1024,
	documentBytes: 5 * 1024 * 1024,
	logoTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
	documentTypes: ['application/pdf', 'image/png', 'image/jpeg']
} as const;

/** Perkiraan akhir trial untuk ditampilkan sebelum aktivasi (BR-15; nilai final dihitung backend). */
export function trialEndPreview(start: Date, length: number, unit: string): Date {
	if (unit === 'hour') return new Date(start.getTime() + length * 3_600_000);
	if (unit === 'day') return new Date(start.getTime() + length * 86_400_000);
	const day = new Date(start);
	let counted = 0;
	for (;;) {
		const wd = day.getDay();
		if (wd !== 0 && wd !== 6 && ++counted === length) break;
		day.setDate(day.getDate() + 1);
	}
	day.setHours(23, 59, 0, 0);
	return day;
}

/** Label bank VA (kode kanal Midtrans → nama bank). */
export const BANK_LABELS: Readonly<Record<string, string>> = {
	va_bca: 'BCA',
	va_bni: 'BNI',
	va_bri: 'BRI',
	va_mandiri: 'Mandiri',
	va_permata: 'Permata'
};
