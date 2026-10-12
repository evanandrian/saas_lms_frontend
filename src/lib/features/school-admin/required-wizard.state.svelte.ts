import type { SchoolSetupState } from '$lib/api/generated/lms';
import { runPageAction } from '$lib/utils/page-action';
import { UPLOAD_LIMITS } from '$lib/utils/upload-limits';
import {
	PREFIX,
	RE,
	REQUIRED_SECTIONS,
	failureMessage,
	fieldErrors,
	readFileBase64
} from './school-admin.model';

type Translate = (key: string, params?: Readonly<Record<string, string | number>>) => string;

export const ACCREDITATIONS = ['A', 'B', 'C', 'BELUM'] as const;
export const MAX_GROUPS = 15;
export const MAX_CAPACITY = 60;
export const KKTP_MAX = 100;
const LOGO_TYPES: readonly string[] = ['image/png', 'image/jpeg'];
const LAST_STEP = REQUIRED_SECTIONS.length - 1;

type GradeDraft = SchoolSetupState['grades'][number];
type SubjectDraft = SchoolSetupState['subjects'][number];

export interface RequiredWizardDeps {
	/** Getter props `setup` agar turunan tetap reaktif terhadap state backend terbaru. */
	setup: () => SchoolSetupState;
	editOne: () => boolean;
	/** `i18n.t` (kunci penuh). */
	t: Translate;
	onstate: (state: SchoolSetupState) => void;
	ondone: () => void;
	onnotify: (message: string) => void;
}

function yearDraft(setup: SchoolSetupState) {
	const s1 = setup.year.semesters.find((s) => s.term === 1);
	const s2 = setup.year.semesters.find((s) => s.term === 2);
	return {
		name: setup.year.name,
		start: setup.year.start,
		end: setup.year.end,
		s1Start: s1?.start ?? '',
		s1End: s1?.end ?? '',
		s2Start: s2?.start ?? '',
		s2End: s2?.end ?? '',
		term: s2?.active ? 2 : 1
	};
}

/**
 * State wizard 5 data wajib 03b (profil, kurikulum, tahun ajaran, kelas, mapel): langkah aktif,
 * draf per langkah (diinisialisasi dari state backend), validasi klien, dan simpan per langkah
 * lewat form action. Teks & markup tetap di komponen.
 */
export class RequiredWizardState {
	readonly #deps: RequiredWizardDeps;

	current: number;
	busy = $state(false);
	errors = $state<Record<string, string>>({});
	savedOnce = $state(false);

	// ===== Draf per langkah =====
	profile: SchoolSetupState['profile'];
	curriculum: string;
	year: ReturnType<typeof yearDraft>;
	scheme: string;
	grades: GradeDraft[];
	subjects: SubjectDraft[];
	newCode = $state('');
	newName = $state('');
	logoPreview = $state<string | null>(null);

	sections = $derived(
		REQUIRED_SECTIONS.map((k) => this.#deps.setup().sections.find((s) => s.key === k))
	);
	firstOpen = $derived(
		Math.max(
			0,
			this.sections.findIndex((s) => !s?.done)
		)
	);
	/** Langkah terjauh yang boleh dibuka: semua sebelum langkah wajib pertama yang belum selesai. */
	reachable = $derived(this.sections.every((s) => s?.done) ? LAST_STEP : this.firstOpen);
	totalClasses: number;
	enabledSubjects: number;
	allOn: boolean;

	/** `step` = langkah yang dibuka (0–4); null = langkah wajib pertama yang belum selesai. */
	constructor(deps: RequiredWizardDeps, step: number | null) {
		this.#deps = deps;
		const setup = deps.setup();
		this.current = $state(step ?? this.firstOpen);
		this.profile = $state({ ...setup.profile });
		this.curriculum = $state(setup.school.curriculum || setup.curricula[0]?.value || '');
		this.year = $state(yearDraft(setup));
		this.scheme = $state(setup.scheme || 'huruf');
		this.grades = $state(setup.grades.map((g) => ({ ...g })));
		this.subjects = $state(setup.subjects.map((s) => ({ ...s })));
		this.totalClasses = $derived(this.grades.reduce((a, g) => a + g.count, 0));
		this.enabledSubjects = $derived(this.subjects.filter((s) => s.enabled).length);
		this.allOn = $derived(this.subjects.length > 0 && this.subjects.every((s) => s.enabled));
	}

	get isLast() {
		return this.current === LAST_STEP;
	}

	/** Nama rombel pratinjau (X-A, X-B… atau X-1, X-2…) sesuai pola penamaan. */
	previewNames(g: GradeDraft) {
		const suffix = (i: number) =>
			this.scheme === 'angka' ? String(i + 1) : String.fromCharCode(65 + i);
		return Array.from({ length: g.count }, (_, i) => `${g.label}-${suffix(i)}`);
	}

	phaseOfGrade(grade: number) {
		return (
			this.#deps.setup().phases.find((p) => grade >= p.grade_from && grade <= p.grade_to)?.code ??
			''
		);
	}

	goTo(step: number) {
		this.current = step;
	}

	back() {
		this.current -= 1;
	}

	toggleAllSubjects() {
		const on = !this.allOn;
		this.subjects = this.subjects.map((s) => ({ ...s, enabled: on }));
	}

	#apply(state: SchoolSetupState) {
		this.#deps.onstate(state);
		this.grades = state.grades.map((g) => ({ ...g }));
		this.subjects = state.subjects.map((s) => ({ ...s }));
	}

	async #call(name: string, body: unknown): Promise<boolean> {
		const { t } = this.#deps;
		this.busy = true;
		const out = await runPageAction<SchoolSetupState>(name, body);
		this.busy = false;
		if (!out.ok) {
			this.errors = fieldErrors(t, out);
			this.#deps.onnotify(failureMessage(t, out));
			return false;
		}
		this.errors = {};
		this.savedOnce = true;
		this.#apply(out.data);
		return true;
	}

	#validate(): boolean {
		const { t } = this.#deps;
		const { current, profile, year } = this;
		const e: Record<string, string> = {};
		const req = t(`${PREFIX}.errors.required`);
		if (current === 0) {
			if (profile.address.trim().length < 8) e.address = t(`${PREFIX}.errors.address_short`);
			if (profile.principal_name.trim().length < 3) e.principal_name = req;
			if (profile.principal_nip && !RE.principalNip.test(profile.principal_nip.trim()))
				e.principal_nip = t(`${PREFIX}.errors.principal_nip`);
		}
		if (current === 1 && !this.curriculum) e.curriculum = req;
		if (current === 2) {
			if (!RE.year.test(year.name.trim())) e.name = t(`${PREFIX}.errors.year_format`);
			if (!year.end || year.end <= year.start) e.end = t(`${PREFIX}.errors.end_after_start`);
			if (!(year.s1End > year.s1Start && year.s2Start > year.s1End && year.s2End > year.s2Start))
				e.semesters = t(`${PREFIX}.errors.semester_order`);
		}
		if (current === 3 && this.totalClasses === 0) e.classes = t(`${PREFIX}.setup.classes_required`);
		if (current === 4 && this.enabledSubjects === 0)
			e.subjects = t(`${PREFIX}.setup.subjects_required`);
		this.errors = e;
		return !Object.keys(e).length;
	}

	async #saveStep(): Promise<boolean> {
		if (!this.#validate()) return false;
		const { profile, year } = this;
		switch (this.current) {
			case 0:
				return this.#call('profile', {
					data: { ...profile, principal_nip: profile.principal_nip.trim() }
				});
			case 1:
				return this.#call('curriculum', { code: this.curriculum });
			case 2:
				return this.#call('year', {
					data: {
						name: year.name.trim(),
						start: year.start,
						end: year.end,
						active: true,
						active_term: year.term,
						semesters: [
							{ term: 1, start: year.s1Start, end: year.s1End, active: year.term === 1 },
							{ term: 2, start: year.s2Start, end: year.s2End, active: year.term === 2 }
						]
					}
				});
			case 3:
				return this.#call('classes', {
					data: {
						scheme: this.scheme,
						grades: this.grades.map((g) => ({
							grade: g.grade,
							count: g.count,
							capacity: g.capacity
						}))
					}
				});
			default:
				return this.#call('subjects', {
					data: {
						subjects: this.subjects.map((s) => ({
							code: s.code,
							name: s.name,
							kktp: Number(s.kktp),
							enabled: s.enabled,
							custom: s.custom
						}))
					}
				});
		}
	}

	/** Simpan langkah aktif lalu lanjut; mode ubah satu bagian / langkah terakhir → selesai. */
	async next() {
		if (!(await this.#saveStep())) return;
		if (this.#deps.editOne() || this.isLast) {
			this.#deps.ondone();
			return;
		}
		this.current += 1;
	}

	async uploadLogo(file: File | undefined) {
		if (!file) return;
		const { t } = this.#deps;
		if (!LOGO_TYPES.includes(file.type) || file.size > UPLOAD_LIMITS.logoBytes) {
			this.errors = { ...this.errors, logo: t(`${PREFIX}.setup.logo_invalid`) };
			return;
		}
		let data: string;
		try {
			data = await readFileBase64(file);
		} catch {
			// FileReader gagal (berkas dipindah/izin dicabut) → pesan di field logo, bukan rejection senyap.
			this.errors = { ...this.errors, logo: t(`${PREFIX}.setup.logo_invalid`) };
			return;
		}
		if (
			await this.#call('logo', {
				data: { file_name: file.name, content_type: file.type, data_base64: data }
			})
		) {
			this.logoPreview = `data:${file.type};base64,${data}`;
			this.#deps.onnotify(t(`${PREFIX}.setup.logo_saved`));
		}
	}

	addSubject() {
		const { t } = this.#deps;
		const code = this.newCode.trim().toUpperCase();
		const name = this.newName.trim();
		if (!RE.code.test(code) || !name) {
			this.errors = { ...this.errors, subjects: t(`${PREFIX}.setup.custom_invalid`) };
			return;
		}
		if (this.subjects.some((s) => s.code === code)) {
			this.errors = { ...this.errors, subjects: t(`${PREFIX}.errors.code_taken`) };
			return;
		}
		this.subjects = [
			...this.subjects,
			{ code, name, kktp: this.#deps.setup().default_kktp, enabled: true, custom: true }
		];
		this.newCode = '';
		this.newName = '';
	}
}
