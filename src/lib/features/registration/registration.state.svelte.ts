import type {
	RegistrationState,
	SignupCatalog,
	SignupCity,
	SignupPlan
} from '$lib/api/generated/lms';
import {
	RULES,
	isEmail,
	isTenantType,
	onlyDigits,
	passwordScore,
	pricePreview,
	stepFromState,
	stepsFor,
	type TenantType,
	type WizardStep
} from './registration.model';

export interface FieldIssue {
	field: string;
	code: string;
}

export interface Challenge {
	channel: string;
	target: string;
	expiresAt: string;
	resendAt: string;
}

/** Isian setup awal (dimuat dari database tenant setelah aktivasi). */
export interface SetupForm {
	principalName: string;
	principalNip: string;
	isPrincipal: boolean;
	about: string;
	coordinator: string;
	phone: string;
	website: string;
	academicYear: string;
	semesters: { term: number; start: string; end: string }[];
	scheme: 'huruf' | 'angka';
	capacity: string;
	grades: { grade: number; label: string; count: number }[];
	subjects: { name: string; enabled: boolean; kktp: string; custom: boolean }[];
	kktpAll: string;
	newSubject: string;
}

/**
 * State wizard Daftar & berlangganan. Isian disimpan ke backend saat lanjut; status (pengajuan,
 * tagihan, pembayaran, tenant) selalu ditimpa dari respons backend (`apply`).
 */
export class RegistrationWizard {
	catalog: SignupCatalog;
	server = $state<RegistrationState | null>(null);
	step = $state<WizardStep>('akun');
	maxIndex = $state(0);
	tried = $state<Record<string, boolean>>({});
	serverIssues = $state<FieldIssue[]>([]);
	busy = $state(false);

	// Akun & OTP
	type = $state<TenantType>('school');
	fullName = $state('');
	email = $state('');
	phone = $state('');
	password = $state('');
	showPassword = $state(false);
	agree = $state(false);
	challenge = $state<Challenge | null>(null);
	otp = $state('');
	otpError = $state<string | null>(null);

	// Lembaga
	npsn = $state('');
	npsnStatus = $state<'checking' | 'used' | 'found' | 'manual' | null>(null);
	institutionName = $state('');
	level = $state('SMA');
	ownership = $state<'negeri' | 'swasta'>('swasta');
	address = $state('');
	province = $state('');
	city = $state('');
	timezone = $state('Asia/Jakarta');
	cities = $state<SignupCity[]>([]);
	teachingFields = $state<string[]>([]);
	organizerKind = $state('');
	participants = $state('');

	// Paket
	planCode = $state('');
	seats = $state(800);
	cycle = $state<'month' | 'year'>('year');
	trial = $state(true);

	// Pembayaran
	payMethod = $state<'va' | 'qris'>('va');
	bank = $state('va_bca');

	setup = $state<SetupForm>(emptySetup());

	constructor(
		catalog: SignupCatalog,
		server: RegistrationState | null,
		cities: SignupCity[],
		challenge: Challenge | null
	) {
		this.catalog = catalog;
		this.cities = cities;
		this.organizerKind = catalog.organizer_kinds[0] ?? '';
		this.planCode = this.defaultPlan('school')?.code ?? '';
		if (server?.application) {
			this.apply(server);
		} else if (challenge) {
			this.challenge = challenge;
			this.step = 'otp';
			this.maxIndex = 1;
		}
	}

	get steps(): WizardStep[] {
		return stepsFor(this.type);
	}

	get index(): number {
		return this.steps.indexOf(this.step);
	}

	/** Langkah sebelum ini terkunci setelah pembayaran/aktivasi (referensi lockIdx). */
	get lockIndex(): number {
		const app = this.server?.application;
		if (!app) return this.challenge ? 1 : 0;
		const tenant = this.server?.tenant;
		if (tenant && (tenant.lifecycle === 'trial' || tenant.lifecycle === 'active')) return 7;
		if (app.status === 'approved' || app.status === 'submitted') return 4;
		return 2;
	}

	get plans(): SignupPlan[] {
		return this.catalog.plans.filter((p) => p.tenant_type === this.type);
	}

	get plan(): SignupPlan | undefined {
		return this.plans.find((p) => p.code === this.planCode) ?? this.plans[0];
	}

	defaultPlan(type: TenantType): SignupPlan | undefined {
		const plans = this.catalog.plans.filter((p) => p.tenant_type === type);
		return plans.find((p) => p.badge) ?? plans[0];
	}

	get trialOn(): boolean {
		return this.type !== 'event' && this.trial && Boolean(this.plan?.trial_enabled);
	}

	get preview() {
		const plan = this.plan;
		if (!plan) return null;
		const cycle = plan.pricing_model === 'package' ? 'one_time' : this.cycle;
		return pricePreview(plan, cycle, this.seats, this.catalog.vat_basis_points);
	}

	pickType(type: TenantType) {
		if (this.server?.application && this.server.application.status !== 'draft') return;
		this.type = type;
		this.planCode = this.defaultPlan(type)?.code ?? '';
		this.trial = type !== 'event';
		this.maxIndex = 0;
	}

	/** Terapkan status backend ke form (pengajuan → isian, posisi langkah, setup). */
	apply(state: RegistrationState) {
		this.server = state;
		const app = state.application;
		if (!app) return;
		if (isTenantType(app.tenant_type)) this.type = app.tenant_type;
		this.fullName = state.account.full_name;
		this.email = state.account.email;
		this.phone = onlyDigits(state.account.phone);
		if (app.npsn) this.npsn = app.npsn;
		if (app.institution_name) this.institutionName = app.institution_name;
		if (app.education_level) this.level = app.education_level;
		if (app.ownership === 'negeri' || app.ownership === 'swasta') this.ownership = app.ownership;
		if (app.address) this.address = app.address;
		if (app.province_code) this.province = app.province_code;
		if (app.city_code) this.city = app.city_code;
		this.timezone = app.timezone || this.timezone;
		this.teachingFields = [...app.teaching_fields];
		if (app.organizer_kind) this.organizerKind = app.organizer_kind;
		this.participants = app.participants_per_session ? String(app.participants_per_session) : '';
		if (app.plan_code) {
			this.planCode = app.plan_code;
			this.trial = app.trial;
			if (app.cycle === 'month' || app.cycle === 'year') this.cycle = app.cycle;
			if (app.seats) this.seats = app.seats;
		} else {
			this.planCode = this.defaultPlan(this.type)?.code ?? '';
		}
		if (this.npsn.length === RULES.npsnDigits && !this.npsnStatus)
			this.npsnStatus = app.npsn_source === 'directory' ? 'found' : 'manual';
		if (state.payment) {
			this.payMethod = state.payment.channel === 'qris' ? 'qris' : 'va';
			if (state.payment.channel !== 'qris') this.bank = state.payment.channel;
		}
		if (state.setup) this.applySetup(state);
		const step = stepFromState(state);
		if (step !== 'done') {
			const idx = this.steps.indexOf(step);
			if (idx > this.maxIndex) this.maxIndex = idx;
			if (
				this.index < this.lockIndex ||
				this.index < idx ||
				this.step === 'akun' ||
				this.step === 'otp'
			)
				this.step = step;
		}
	}

	applySetup(state: RegistrationState) {
		const s = state.setup;
		if (!s) return;
		const next = { ...this.setup };
		if (s.profile) {
			next.principalName = s.profile.principal_name;
			next.principalNip = s.profile.principal_nip;
			next.isPrincipal = s.profile.is_principal ?? false;
			next.about = s.profile.about;
			next.coordinator = s.profile.coordinator;
			next.phone = onlyDigits(s.profile.phone);
			next.website = s.profile.website;
		}
		if (s.year) {
			next.academicYear = s.year.academic_year;
			next.semesters = s.year.semesters.map((x) => ({ ...x }));
		}
		if (s.classes) {
			next.scheme = s.classes.scheme === 'angka' ? 'angka' : 'huruf';
			next.capacity = String(s.classes.capacity);
			next.grades = s.classes.grades.map((g) => ({ ...g }));
		}
		if (s.subjects) {
			next.subjects = s.subjects.subjects.map((x) => ({ ...x, kktp: String(x.kktp) }));
		}
		this.setup = next;
	}

	// ===== Validasi per isian (kode → i18n `register.errors.<kode>`) =====

	get errors(): Record<string, string> {
		const e: Record<string, string> = {};
		if (this.fullName.trim().length < RULES.nameMin) e.fullName = 'name_min';
		if (!isEmail(this.email)) e.email = 'email_format';
		if (this.phone.length < RULES.phoneMin) e.phone = 'phone_min';
		if (passwordScore(this.password) < RULES.passwordMinScore) e.password = 'password_weak';
		if (this.type === 'school') {
			if (this.npsn.length !== RULES.npsnDigits) e.npsn = 'npsn_format';
			else if (this.npsnStatus === 'used') e.npsn = 'npsn_used';
			if (this.address.trim().length < RULES.addressMin) e.address = 'address_min';
			if (this.setup.principalName.trim().length < RULES.nameMin)
				e.principalName = 'principal_required';
			if (this.setup.principalNip && this.setup.principalNip.length !== RULES.nipDigits)
				e.principalNip = 'nip_format';
		}
		if (this.institutionName.trim().length < RULES.nameMin)
			e.institutionName = 'institution_required';
		if (!this.province) e.province = 'province_required';
		if (!this.city) e.city = 'city_required';
		if (this.type === 'personal' && !this.teachingFields.length)
			e.teachingFields = 'fields_required';
		if (this.type === 'event') {
			const n = Number(this.participants);
			if (!(n > 0)) e.participants = 'participants_required';
			else if (n > RULES.maxParticipants) e.participants = 'participants_max';
			if (this.setup.coordinator.trim().length < RULES.nameMin)
				e.coordinator = 'coordinator_required';
		}
		if (this.setup.phone.length < RULES.telpMin) e.telp = 'telp_min';
		if (this.type === 'personal' && this.setup.about.length > RULES.bioMax) e.about = 'about_max';
		const [g, ev] = [this.semester(1), this.semester(2)];
		if (!(g.start < g.end)) e.g2 = 'odd_end';
		if (!(g.end < ev.start)) e.e1 = 'even_start';
		if (!(ev.start < ev.end)) e.e2 = 'even_end';
		const cap = Number(this.setup.capacity);
		if (!(cap >= RULES.capacityMin && cap <= RULES.capacityMax)) e.capacity = 'capacity_range';
		for (const issue of this.serverIssues) e[issue.field] ??= issue.code;
		return e;
	}

	semester(term: number) {
		return this.setup.semesters.find((s) => s.term === term) ?? { term, start: '', end: '' };
	}

	get rombel(): number {
		return this.setup.grades.reduce((sum, g) => sum + g.count, 0);
	}

	get enabledSubjects() {
		return this.setup.subjects.filter((s) => s.enabled);
	}

	get badKktp() {
		return this.enabledSubjects.filter((s) => {
			const n = Number(s.kktp);
			return s.kktp === '' || !(n >= 0 && n <= RULES.kktpMax);
		});
	}
}

function emptySetup(): SetupForm {
	return {
		principalName: '',
		principalNip: '',
		isPrincipal: false,
		about: '',
		coordinator: '',
		phone: '',
		website: '',
		academicYear: '',
		semesters: [],
		scheme: 'huruf',
		capacity: '32',
		grades: [],
		subjects: [],
		kktpAll: '75',
		newSubject: ''
	};
}
