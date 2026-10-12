import type {
	LearnerChild,
	LearnerReport,
	LearnerReportsView
} from '$lib/features/school-admin/school-admin.types';

/** Status alur rapor semester berjalan, urut sesuai tahap (dipakai stepper). */
export const LEARNER_STEPS = ['draft', 'submitted', 'approved', 'locked'] as const;
export type LearnerStep = (typeof LEARNER_STEPS)[number];

/**
 * State halaman rapor murid & orang tua: anak yang dipilih (orang tua bisa punya beberapa anak) dan
 * rapor semester yang dibuka. Rapor terbaru dipilih otomatis; pilihan direset saat anak berganti.
 */
export class LearnerReportsState {
	view: LearnerReportsView;
	childId = $state('');
	reportId = $state('');

	constructor(view: LearnerReportsView) {
		this.view = view;
		this.childId = view.children[0]?.student_id ?? '';
		this.reportId = view.children[0]?.reports[0]?.id ?? '';
	}

	get child(): LearnerChild | null {
		return this.view.children.find((c) => c.student_id === this.childId) ?? null;
	}

	get report(): LearnerReport | null {
		const reports = this.child?.reports ?? [];
		return reports.find((r) => r.id === this.reportId) ?? reports[0] ?? null;
	}

	get isParent() {
		return this.view.role === 'parent';
	}

	/** Tahap rapor semester berjalan (indeks di LEARNER_STEPS); -1 bila tidak ada semester aktif. */
	get currentStep() {
		const status = this.child?.current?.status as LearnerStep | undefined;
		return status ? LEARNER_STEPS.indexOf(status) : -1;
	}

	/** Mapel di bawah KKM pada rapor yang dibuka (KKM 0 = tidak diatur). */
	get belowKkm() {
		return (this.report?.subjects ?? []).filter((s) => s.kkm > 0 && s.score < s.kkm).length;
	}

	get absentTotal() {
		const r = this.report;
		return r ? r.sick + r.permit + r.absent : 0;
	}

	selectChild(id: string) {
		this.childId = id;
		this.reportId = this.child?.reports[0]?.id ?? '';
	}

	selectReport(id: string) {
		this.reportId = id;
	}
}
