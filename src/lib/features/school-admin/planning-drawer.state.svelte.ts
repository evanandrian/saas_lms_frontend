import type {
	SchoolPlanAssessment,
	SchoolPlanningView,
	SchoolStudentsView,
	SchoolTeachersView
} from '$lib/api/generated/lms';
import { runPageAction } from '$lib/utils/page-action';
import {
	ASSESSMENT_NAME_MIN,
	DEFAULT_AGGREGATION,
	RE,
	REASON_MIN,
	PREFIX,
	assessmentsBody,
	extraBody,
	extraErrors,
	extraForm,
	failureMessage,
	nextObjectiveCode,
	normalizeDecimals,
	normalizeWeight,
	reasonRequired,
	reasonValid,
	weightValid
} from './school-admin.model';

type Translate = (key: string, params?: Readonly<Record<string, string | number>>) => string;

export type DrawerKey =
	'teachers' | 'students' | 'assign' | 'objectives' | 'assess' | 'schedule' | 'extras';

export interface PlanningDrawerDeps {
	/** Getter props agar state mengikuti tampilan perencanaan terbaru dari halaman. */
	planning: () => SchoolPlanningView;
	key: () => DrawerKey;
	/** `i18n.t` (kunci penuh). */
	t: Translate;
	onplanning: (view: SchoolPlanningView) => void;
	onnotify: (message: string) => void;
	/** Mapel awal pemilih TP (halaman Mapel); default mapel pertama. */
	initialSubject?: string;
}

const OBJECTIVE_MIN = 10;
const RECENT_PEOPLE = 5;
const DEFAULT_PERIOD_START = '07:00';

/** Pengganti aman saat perencanaan gagal dimuat (null): semua daftar kosong. */
const EMPTY_PLANNING: SchoolPlanningView = {
	year: '',
	semester_id: null,
	term: 0,
	grades: [],
	classes: [],
	teachers: [],
	subjects: [],
	assignments: [],
	objectives: [],
	assessments: [],
	weight_total: 0,
	decimal_places: 0,
	periods: [],
	schedule: [],
	extras: []
};

type Period = { start: string; end: string };

/**
 * Draf lokal bobot asesmen & jam pelajaran. Dibuat ulang hanya saat tampilan backend berubah
 * (bukan saat pemilih kelas/mapel diganti), agar suntingan yang belum disimpan tidak terhapus.
 */
class PlanningDrafts {
	weights: Record<string, number>;
	periods: Period[];
	types: SchoolPlanAssessment[];
	decimals: number;

	constructor(planning: SchoolPlanningView) {
		this.weights = $state(Object.fromEntries(planning.assessments.map((a) => [a.code, a.weight])));
		this.periods = $state(planning.periods.map((p) => ({ start: p.start, end: p.end })));
		this.types = $state(
			planning.assessments.map((a) => ({ ...a, aggregation: a.aggregation ?? DEFAULT_AGGREGATION }))
		);
		this.decimals = $state(normalizeDecimals(planning.decimal_places));
	}
}

/**
 * State drawer bagian opsional 03b (guru, murid, penugasan, TP, asesmen, jadwal, ekskul): tab,
 * pemilih kelas/mapel/fase, draf bobot & jam, ringkasan orang, dan simpan lewat form action.
 */
export class PlanningDrawerState {
	readonly #deps: PlanningDrawerDeps;

	tab = $state(0);
	busy = $state(false);
	objDesc = $state('');
	/** Alasan perubahan kebijakan penilaian (wajib bila kebijakan aktif sudah berbobot). */
	reason = $state('');
	newType = $state<{ code: string; name: string; category: string; is_exam: boolean }>({
		code: '',
		name: '',
		category: 'summative',
		is_exam: false
	});
	exName = $state('');
	exCoach = $state('');
	/** Edit TP inline: id TP yang sedang diubah + teksnya. */
	editObjective = $state<string | null>(null);
	editObjectiveText = $state('');
	people = $state<{ name: string; meta: string }[]>([]);
	peopleStats = $state<{ label: string; value: string | number }[]>([]);
	/** Pilihan pengguna; getter jatuh ke opsi pertama bila kosong / tidak lagi tersedia. */
	#classId = $state('');
	#objSubject = $state('');
	#objGrade = $state('');

	#drafts = $derived(new PlanningDrafts(this.#planning));

	classAssignments = $derived(
		this.#planning.assignments.filter((a) => a.class_id === this.classId)
	);
	objectives = $derived(
		this.#planning.objectives.filter(
			(o) => o.subject_id === this.objSubject && o.grade_id === this.objGrade
		)
	);
	nextCode = $derived.by(() => {
		const grade = this.#planning.grades.find((g) => g.id === this.objGrade);
		return nextObjectiveCode(
			grade?.grade ?? '',
			this.objectives.map((o) => o.code)
		);
	});
	weightSum = $derived(
		Object.values(this.#drafts.weights).reduce((a, b) => a + normalizeWeight(b), 0)
	);

	constructor(deps: PlanningDrawerDeps) {
		this.#deps = deps;
		const { classes, subjects, grades } = this.#planning;
		this.#classId = classes[0]?.id ?? '';
		this.#objSubject = deps.initialSubject ?? subjects[0]?.id ?? '';
		this.#objGrade = grades[0]?.id ?? '';
	}

	/** Halaman membuat planner sebelum tahu apakah muat perencanaan berhasil (view bisa null). */
	get #planning(): SchoolPlanningView {
		return (this.#deps.planning() as SchoolPlanningView | null) ?? EMPTY_PLANNING;
	}

	#t(k: string, params?: Record<string, string | number>) {
		return this.#deps.t(`${PREFIX}.planning.${k}`, params);
	}

	get weights() {
		return this.#drafts.weights;
	}

	get periods() {
		return this.#drafts.periods;
	}

	get types() {
		return this.#drafts.types;
	}

	get decimals() {
		return this.#drafts.decimals;
	}
	set decimals(v: number) {
		this.#drafts.decimals = normalizeDecimals(v);
	}

	/** Alasan wajib hanya bila kebijakan aktif sudah berbobot > 0 (cermin backend `reason/too_short`). */
	get reasonRequired() {
		return reasonRequired(this.#planning.assessments);
	}

	/** Semua bobot draf bilangan bulat 0–100 (input di luar rentang ditandai, tidak dijepit diam-diam). */
	get weightsValid() {
		return Object.values(this.#drafts.weights).every((w) => weightValid(w));
	}

	get reasonValid() {
		return reasonValid(this.reasonRequired, this.reason);
	}

	#reasonOk() {
		if (this.reasonValid) return true;
		this.#deps.onnotify(this.#t('reason_short', { min: REASON_MIN }));
		return false;
	}

	addType() {
		const code = this.newType.code.trim().toUpperCase();
		if (!RE.code.test(code) || this.types.some((x) => x.code === code)) {
			this.#deps.onnotify(this.#deps.t(`${PREFIX}.errors.code_invalid`));
			return;
		}
		const name = this.newType.name.trim();
		if (name.length < ASSESSMENT_NAME_MIN) {
			this.#deps.onnotify(this.#deps.t(`${PREFIX}.errors.required`));
			return;
		}
		const drafts = this.#drafts;
		drafts.types = [
			...drafts.types,
			{
				code,
				name,
				category: this.newType.category,
				is_exam: this.newType.is_exam,
				weight: 0,
				aggregation: DEFAULT_AGGREGATION
			}
		];
		drafts.weights = { ...drafts.weights, [code]: 0 };
		this.newType = { code: '', name: '', category: 'summative', is_exam: false };
	}

	get classId() {
		const { classes } = this.#planning;
		return this.#classId && classes.some((c) => c.id === this.#classId)
			? this.#classId
			: (classes[0]?.id ?? '');
	}
	set classId(id: string) {
		this.#classId = id;
	}

	get objSubject() {
		const { subjects } = this.#planning;
		return this.#objSubject && subjects.some((s) => s.id === this.#objSubject)
			? this.#objSubject
			: (subjects[0]?.id ?? '');
	}
	set objSubject(id: string) {
		this.#objSubject = id;
	}

	get objGrade() {
		return this.#objGrade || (this.#planning.grades[0]?.id ?? '');
	}
	set objGrade(id: string) {
		this.#objGrade = id;
	}

	get teacherOptions() {
		return this.#planning.teachers;
	}

	homeroomOf(id: string) {
		return this.#planning.classes.find((c) => c.id === id)?.homeroom_id ?? '';
	}

	assignmentOf(subjectId: string) {
		return (
			this.#planning.assignments.find(
				(a) => a.class_id === this.classId && a.subject_id === subjectId
			)?.teacher_id ?? ''
		);
	}

	cellOf(day: number, no: number) {
		return (
			this.#planning.schedule.find(
				(c) => c.class_id === this.classId && c.weekday === day && c.period_no === no
			)?.subject_id ?? ''
		);
	}

	subjectName(id: string) {
		return this.#planning.subjects.find((s) => s.id === id)?.name ?? '';
	}

	/** Ringkasan guru/murid (drawer `teachers`/`students`). */
	async loadPeople() {
		const key = this.#deps.key();
		const t = this.#deps.t;
		if (key === 'teachers') {
			const out = await runPageAction<SchoolTeachersView>('teachers', {});
			if (!out.ok) return;
			const items = out.data.items;
			this.peopleStats = [
				{ label: this.#t('people_teachers'), value: items.length },
				{
					label: t(`${PREFIX}.account.active`),
					value: items.filter((x) => x.status === 'active').length
				},
				{
					label: t(`${PREFIX}.account.not_invited`),
					value: items.filter((x) => x.status === 'not_invited').length
				}
			];
			this.people = items
				.slice(-RECENT_PEOPLE)
				.reverse()
				.map((x) => ({ name: x.name, meta: x.email }));
		} else if (key === 'students') {
			const out = await runPageAction<SchoolStudentsView>('students', {});
			if (!out.ok) return;
			const items = out.data.items;
			this.peopleStats = [
				{ label: this.#t('people_students'), value: items.length },
				{ label: this.#t('people_linked'), value: items.filter((s) => s.guardians.length).length },
				{
					label: this.#t('people_seats'),
					value: out.data.seats.seats
						? `${out.data.seats.used}/${out.data.seats.seats}`
						: out.data.seats.used
				}
			];
			this.people = items
				.slice(-RECENT_PEOPLE)
				.reverse()
				.map((s) => ({ name: s.name, meta: s.class_name }));
		}
	}

	/** Jalankan form action perencanaan; sukses → tampilan baru diteruskan ke halaman. */
	async call(name: string, body: unknown, success?: string) {
		this.busy = true;
		const out = await runPageAction<SchoolPlanningView>(name, body);
		this.busy = false;
		if (!out.ok) {
			this.#deps.onnotify(failureMessage(this.#deps.t, out));
			return false;
		}
		this.#deps.onplanning(out.data);
		if (success) this.#deps.onnotify(success);
		return true;
	}

	/** Simpan pilihan per baris/sel langsung (wali kelas, guru mapel, sel jadwal). */
	setHomeroom(classId: string, teacherId: string) {
		return this.call('homeroom', { id: classId, teacherId });
	}

	setAssignment(subjectId: string, teacherId: string) {
		return this.call('assignment', {
			data: { class_id: this.classId, subject_id: subjectId, teacher_id: teacherId }
		});
	}

	setScheduleCell(weekday: number, periodNo: number, subjectId: string) {
		return this.call('scheduleCell', {
			data: { class_id: this.classId, weekday, period_no: periodNo, subject_id: subjectId }
		});
	}

	async useDefaultAssessments() {
		if (!this.#reasonOk()) return false;
		const reason = this.reason.trim();
		const ok = await this.call(
			'assessments',
			{ data: { use_default: true, ...(reason ? { reason } : {}) } },
			this.#t('saved')
		);
		if (ok) this.reason = '';
		return ok;
	}

	useDefaultPeriods() {
		return this.call('periods', { data: { use_default: true } }, this.#t('saved'));
	}

	startEditObjective(id: string, description: string) {
		this.editObjective = id;
		this.editObjectiveText = description;
	}

	async updateObjective() {
		const id = this.editObjective;
		if (!id) return false;
		if (this.editObjectiveText.trim().length < OBJECTIVE_MIN) {
			this.#deps.onnotify(this.#t('objective_short'));
			return false;
		}
		const ok = await this.call(
			'objectiveUpdate',
			{ id, description: this.editObjectiveText.trim() },
			this.#t('saved')
		);
		if (ok) this.editObjective = null;
		return ok;
	}

	removeObjective(id: string) {
		return this.call('objectiveRemove', { id });
	}

	removeExtra(id: string) {
		return this.call('extraRemove', { id });
	}

	async saveWeights() {
		if (!this.weightsValid || !this.#reasonOk()) return;
		const items = this.types.map((a) => ({ ...a, weight: normalizeWeight(this.weights[a.code]) }));
		const body = assessmentsBody(items, this.decimals, this.reason);
		if (await this.call('assessments', { data: body }, this.#t('saved'))) this.reason = '';
	}

	async savePeriods() {
		await this.call(
			'periods',
			{ data: { items: this.periods.map((p, i) => ({ no: i + 1, ...p })) } },
			this.#t('saved')
		);
	}

	addPeriod() {
		const drafts = this.#drafts;
		drafts.periods = [
			...drafts.periods,
			{ start: drafts.periods.at(-1)?.end ?? DEFAULT_PERIOD_START, end: '' }
		];
	}

	removePeriod(index: number) {
		const drafts = this.#drafts;
		drafts.periods = drafts.periods.filter((_, j) => j !== index);
	}

	async addObjective() {
		if (this.objDesc.trim().length < OBJECTIVE_MIN) {
			this.#deps.onnotify(this.#t('objective_short'));
			return;
		}
		if (
			await this.call('objectiveAdd', {
				data: {
					subject_id: this.objSubject,
					grade_id: this.objGrade,
					description: this.objDesc.trim()
				}
			})
		)
			this.objDesc = '';
	}

	async addExtra() {
		// Atribut lengkap (jadwal/tempat/wajib kosong) agar body & validasi sama dengan halaman Ekskul.
		const form = { ...extraForm(null), name: this.exName, coach_id: this.exCoach };
		if (extraErrors(form, this.#deps.t).name) {
			this.#deps.onnotify(this.#t('extra_name_required'));
			return;
		}
		if (await this.call('extraSave', { id: '', data: extraBody(form) })) this.exName = '';
	}
}
