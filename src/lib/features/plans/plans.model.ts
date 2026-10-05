import type {
	Plan,
	PlanFeature,
	PlanPricingModel,
	PlanProctoring,
	PlanStatus,
	SavePlanRequest
} from '$lib/api/generated/lms';

export type {
	MasterIssue,
	Plan,
	PlanFeature,
	PlanPricingModel,
	PlanProctoring,
	PlanStatus,
	SavePlanRequest
} from '$lib/api/generated/lms';

/** Jenis lembaga paket (tenant_type_g) sesuai referensi PlanMaster. */
export type PlanTenantType = 'school' | 'personal' | 'event';
export type PlanTrialUnit = 'hour' | 'day' | 'business_day';
export type PlanTaxMode = 'excl' | 'incl';

export const PLAN_TENANT_TYPES: readonly PlanTenantType[] = ['school', 'personal', 'event'];
export const PLAN_STATUSES: readonly PlanStatus[] = ['draft', 'active', 'archived'];
export const RECURRING_MODELS: readonly PlanPricingModel[] = ['seat', 'flat'];
export const TAX_MODES: readonly PlanTaxMode[] = ['excl', 'incl'];
export const FREE_MONTHS = ['0', '1', '2', '3'] as const;
export const SESSION_MINUTES = ['60', '90', '120', '180'] as const;
export const PROCTORING: readonly PlanProctoring[] = ['none', 'cam', 'camscreen', 'human'];
export const TRIAL_UNITS: readonly PlanTrialUnit[] = ['hour', 'day', 'business_day'];

/** Grup fitur referensi (FEATS); label lewat i18n `plans.features.<kode>`. */
export const FEATURE_GROUPS: readonly {
	group: string;
	features: readonly PlanFeature[];
}[] = [
	{ group: 'learning', features: ['lms', 'question_bank'] },
	{ group: 'assessment', features: ['auto_graded_exam', 'item_analysis'] },
	{ group: 'administration', features: ['report_attendance', 'principal_dashboard'] },
	{ group: 'communication', features: ['guardian_portal', 'whatsapp_notification'] },
	{
		group: 'advanced',
		features: ['ai_assistant', 'white_label', 'custom_domain', 'participant_certificate']
	}
];
export const ALL_FEATURES: readonly PlanFeature[] = FEATURE_GROUPS.flatMap((g) => g.features);

/** Model harga bawaan saat jenis lembaga dipilih (referensi `typeOpts`). */
export const DEFAULT_MODEL: Record<PlanTenantType, PlanPricingModel> = {
	school: 'seat',
	personal: 'flat',
	event: 'package'
};

/** Batas pemakaian yang tampil per model (referensi `limits`). */
export type LimitKey =
	'min_seats' | 'max_seats' | 'max_teachers' | 'storage_gb' | 'email_invites_per_month';
export const LIMITS_BY_MODEL: Record<PlanPricingModel, readonly LimitKey[]> = {
	seat: ['min_seats', 'max_seats', 'max_teachers', 'storage_gb', 'email_invites_per_month'],
	flat: ['max_seats', 'storage_gb', 'email_invites_per_month'],
	package: []
};
export type SessionLimitKey =
	'max_participants_per_session' | 'max_parallel_sessions' | 'session_gap_minutes';
export const SESSION_LIMITS: readonly SessionLimitKey[] = [
	'max_participants_per_session',
	'max_parallel_sessions',
	'session_gap_minutes'
];

export interface TierDraft {
	from: string;
	price: string;
}

/** Draft form; angka disimpan sebagai string agar input kosong (= tanpa batas) dapat dibedakan. */
export interface PlanDraft {
	code: string;
	name: string;
	badge: string;
	description: string;
	tenant_type_code: PlanTenantType;
	status: PlanStatus;
	pricing_model: PlanPricingModel;
	price: string;
	tax_mode: PlanTaxMode;
	free_months: string;
	min_seats: string;
	max_seats: string;
	max_teachers: string;
	storage_gb: string;
	email_invites_per_month: string;
	max_participants_per_session: string;
	session_minutes: string;
	max_parallel_sessions: string;
	session_gap_minutes: string;
	proctoring: PlanProctoring;
	allow_topup: boolean;
	tiers: TierDraft[];
	trial_enabled: boolean;
	trial_length: string;
	trial_unit: PlanTrialUnit;
	trial_max_students: string;
	trial_manual_approval: boolean;
	trial_one_per_npsn: boolean;
	features: PlanFeature[];
	updated_at?: string;
	subscription_count: number;
}

/** Paket baru (referensi `newPlan` + `base`). */
export function blankDraft(): PlanDraft {
	return {
		code: '',
		name: '',
		badge: '',
		description: '',
		tenant_type_code: 'school',
		status: 'draft',
		pricing_model: 'seat',
		price: '',
		tax_mode: 'excl',
		free_months: '2',
		min_seats: '50',
		max_seats: '2000',
		max_teachers: '',
		storage_gb: '50',
		email_invites_per_month: '500',
		max_participants_per_session: '',
		session_minutes: '120',
		max_parallel_sessions: '1',
		session_gap_minutes: '15',
		proctoring: 'none',
		allow_topup: true,
		tiers: [],
		trial_enabled: true,
		trial_length: '5',
		trial_unit: 'business_day',
		trial_max_students: '100',
		trial_manual_approval: true,
		trial_one_per_npsn: true,
		features: ['lms', 'auto_graded_exam'],
		subscription_count: 0
	};
}

const num = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

export function draftFromPlan(p: Plan): PlanDraft {
	const base = blankDraft();
	return {
		code: p.code,
		name: p.name,
		badge: p.badge,
		description: p.description,
		tenant_type_code: (PLAN_TENANT_TYPES as readonly string[]).includes(p.tenant_type_code)
			? (p.tenant_type_code as PlanTenantType)
			: 'school',
		status: p.status,
		pricing_model: p.pricing_model,
		price: num(p.price_idr || null),
		tax_mode: p.tax_mode,
		free_months: String(p.free_months),
		min_seats: num(p.min_seats),
		max_seats: num(p.max_seats),
		max_teachers: num(p.max_teachers),
		storage_gb: num(p.storage_gb),
		email_invites_per_month: num(p.email_invites_per_month),
		max_participants_per_session: num(p.max_participants_per_session),
		session_minutes: num(p.session_minutes) || base.session_minutes,
		max_parallel_sessions: num(p.max_parallel_sessions),
		session_gap_minutes: num(p.session_gap_minutes),
		proctoring: p.proctoring,
		allow_topup: p.allow_topup,
		tiers: p.tiers.map((t) => ({ from: String(t.min_sessions), price: String(t.price_idr) })),
		trial_enabled: p.trial_enabled,
		trial_length: num(p.trial_length) || base.trial_length,
		trial_unit: p.trial_unit ?? base.trial_unit,
		trial_max_students: num(p.trial_max_students) || base.trial_max_students,
		trial_manual_approval: p.trial_manual_approval,
		trial_one_per_npsn: p.trial_one_per_npsn,
		// Urutan katalog referensi (FEATS), bukan urutan abjad dari API.
		features: ALL_FEATURES.filter((f) => p.features.includes(f)),
		updated_at: p.updated_at,
		subscription_count: p.subscription_count
	};
}

const toInt = (v: string): number | null => (v.trim() === '' ? null : Number(v));

/** Payload simpan; backend mengosongkan isian yang tidak berlaku untuk model harga. */
export function toSaveRequest(d: PlanDraft, status: PlanStatus = d.status): SavePlanRequest {
	const isPackage = d.pricing_model === 'package';
	return {
		code: d.code.trim(),
		name: d.name.trim(),
		tenant_type_code: d.tenant_type_code,
		status,
		badge: d.badge.trim(),
		description: d.description.trim(),
		pricing_model: d.pricing_model,
		price_idr: Number(d.price) || 0,
		tax_mode: d.tax_mode,
		free_months: isPackage ? 0 : Number(d.free_months),
		min_seats: toInt(d.min_seats),
		max_seats: toInt(d.max_seats),
		max_teachers: toInt(d.max_teachers),
		storage_gb: toInt(d.storage_gb),
		email_invites_per_month: toInt(d.email_invites_per_month),
		max_participants_per_session: toInt(d.max_participants_per_session),
		session_minutes: toInt(d.session_minutes) as SavePlanRequest['session_minutes'],
		max_parallel_sessions: toInt(d.max_parallel_sessions),
		session_gap_minutes: toInt(d.session_gap_minutes),
		proctoring: d.proctoring,
		allow_topup: d.allow_topup,
		tiers: isPackage
			? d.tiers.map((t) => ({ min_sessions: Number(t.from) || 0, price_idr: Number(t.price) || 0 }))
			: [],
		trial_enabled: !isPackage && d.trial_enabled,
		trial_length: toInt(d.trial_length),
		trial_unit: d.trial_unit,
		trial_manual_approval: d.trial_manual_approval,
		trial_max_students: toInt(d.trial_max_students),
		trial_one_per_npsn: d.trial_one_per_npsn,
		features: ALL_FEATURES.filter((f) => d.features.includes(f)),
		...(d.updated_at ? { updated_at: d.updated_at } : {})
	};
}

export type PlanErrorKey =
	| 'code'
	| 'code_duplicate'
	| 'name'
	| 'price'
	| 'max_seats'
	| 'per_session'
	| 'parallel'
	| 'tiers'
	| 'trial_length'
	| 'trial_max'
	| 'features';
export type PlanField =
	| 'code'
	| 'name'
	| 'price'
	| 'max_seats'
	| 'max_participants_per_session'
	| 'max_parallel_sessions'
	| 'tiers'
	| 'trial_length'
	| 'trial_max_students'
	| 'features';

const CODE_PATTERN = /^[A-Z0-9_]{3,20}$/;

/** Status tiap tier: `from` harus naik, `price` > 0 dan turun (referensi `tierIssues`). */
export function tierIssues(d: PlanDraft): { from: boolean; price: boolean }[] {
	let prevFrom = 1;
	let prevPrice = Number(d.price) || 0;
	return d.tiers.map((t) => {
		const from = Number(t.from);
		const price = Number(t.price);
		const issue = { from: !(from > prevFrom), price: !(price > 0 && price < prevPrice) };
		prevFrom = Math.max(prevFrom, from || 0);
		prevPrice = price || prevPrice;
		return issue;
	});
}

/** Validasi UX (cermin referensi `errs()` & `validate.go`; backend tetap otoritas). */
export function validateDraft(
	d: PlanDraft,
	plans: readonly Plan[],
	originalCode: string | null
): Partial<Record<PlanField, PlanErrorKey>> {
	const e: Partial<Record<PlanField, PlanErrorKey>> = {};
	const codeChanged = d.code !== originalCode;
	if (codeChanged && !CODE_PATTERN.test(d.code)) e.code = 'code';
	else if (codeChanged && plans.some((p) => p.code === d.code)) e.code = 'code_duplicate';
	if (d.name.trim().length < 2) e.name = 'name';
	if (!(Number(d.price) > 0)) e.price = 'price';
	if (
		d.pricing_model === 'seat' &&
		d.min_seats !== '' &&
		d.max_seats !== '' &&
		Number(d.min_seats) > Number(d.max_seats)
	)
		e.max_seats = 'max_seats';
	if (d.pricing_model === 'package') {
		if (!(Number(d.max_participants_per_session) > 0))
			e.max_participants_per_session = 'per_session';
		if (!(Number(d.max_parallel_sessions) > 0)) e.max_parallel_sessions = 'parallel';
		if (tierIssues(d).some((t) => t.from || t.price)) e.tiers = 'tiers';
	} else if (d.trial_enabled) {
		if (!(Number(d.trial_length) > 0)) e.trial_length = 'trial_length';
		if (!(Number(d.trial_max_students) > 0)) e.trial_max_students = 'trial_max';
	}
	if (!d.features.length) e.features = 'features';
	return e;
}

/** Rupiah referensi: `Rp5.000`. */
export function formatRupiah(value: number | string): string {
	return 'Rp' + Math.round(Number(value) || 0).toLocaleString('id-ID');
}
