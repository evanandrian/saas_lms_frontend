import { invalidateAll } from '$app/navigation';
import { runPageAction } from '$lib/utils/page-action';
import { PREFIX, failureMessage } from './school-admin.model';
import type { SchoolGradeSheet } from './school-admin.types';

type Translate = (key: string, params?: Readonly<Record<string, string | number>>) => string;

/** Cermin validasi backend (reportcard.go): skor 0–100 dibulatkan 2 desimal, deskripsi ≤ 500. */
export const MIN_SCORE = 0;
export const MAX_SCORE = 100;
const SCORE_ROUNDING = 100;
export const MAX_DESCRIPTION = 500;
const BACKEND_ERROR_PREFIX = `${PREFIX}.errors.`;
const GRADE_ERROR_CODES = new Set([
	'score_range',
	'max_length',
	'required',
	'no_students',
	'invalid_transition',
	'semester_required'
]);
const ISSUE_FIELD = /^entries\[(\d+)\]\.(score|description)$/;
export const REPORT_TONE = {
	draft: 'neutral',
	submitted: 'info',
	approved: 'success',
	locked: 'success'
} as const;

export type GradeDraft = { score: string; description: string };
export type RowErrors = { score?: string; description?: string };
type Issue = { field: string; code: string };

/** `null` = kosong (belum dinilai), `undefined` = tidak valid. */
export function parseScore(raw: string): number | null | undefined {
	const text = raw.trim();
	if (!text) return null;
	const value = Number(text);
	if (!Number.isFinite(value) || value < MIN_SCORE || value > MAX_SCORE) return undefined;
	return Math.round(value * SCORE_ROUNDING) / SCORE_ROUNDING;
}

export const charCount = (text: string) => [...text.trim()].length;

/** Toast kegagalan: kode khusus nilai akhir memakai namespace `grades.errors`. */
export function gradeSheetTranslator(t: Translate): Translate {
	return (key, params) => {
		const code = key.startsWith(BACKEND_ERROR_PREFIX) ? key.slice(BACKEND_ERROR_PREFIX.length) : '';
		return GRADE_ERROR_CODES.has(code) ? t(`grades.errors.${code}`, params) : t(key, params);
	};
}

export interface GradeSheetDeps {
	/** `i18n.t` (kunci penuh). */
	t: Translate;
	/** Penerjemah toast kegagalan (`gradeSheetTranslator`). */
	editorT: Translate;
	notify: (message: string, error?: boolean) => void;
}

/**
 * State lembar nilai akhir satu penugasan (kelas × mapel): isian lokal per murid, validasi klien,
 * pesan error backend per baris, simpan sebagian, dan kunci. Satu instance per lembar yang dimuat
 * (halaman membuat ulang instance saat `data.view` berganti).
 */
export class GradeSheetState {
	readonly #deps: GradeSheetDeps;

	/** Tampilan terbaru dari action (`save`/`lock`); null = pakai lembar dari load. */
	override = $state<SchoolGradeSheet | null>(null);
	drafts = $state<Record<string, GradeDraft>>({});
	serverErrors = $state<Record<string, RowErrors>>({});
	lockTried = $state(false);
	busy = $state(false);

	sheet: SchoolGradeSheet | null;
	rows: SchoolGradeSheet['rows'];
	errors: Record<string, RowErrors>;
	filledCount: number;
	completeCount: number;
	belowCount: number;
	dirty: boolean;

	constructor(view: SchoolGradeSheet | null, deps: GradeSheetDeps) {
		this.#deps = deps;
		this.sheet = $derived(this.override ?? view);
		this.rows = $derived(this.sheet?.rows ?? []);
		this.errors = $derived(
			Object.fromEntries(
				this.rows.map((r) => [
					r.student_id,
					{
						...this.#clientErrors(this.draftOf(r.student_id), this.lockTried),
						...this.serverErrors[r.student_id]
					}
				])
			) as Record<string, RowErrors>
		);
		this.filledCount = $derived(
			this.rows.filter((r) => typeof parseScore(this.draftOf(r.student_id).score) === 'number')
				.length
		);
		this.completeCount = $derived(
			this.rows.filter((r) => {
				const d = this.draftOf(r.student_id);
				return typeof parseScore(d.score) === 'number' && d.description.trim() !== '';
			}).length
		);
		this.belowCount = $derived.by(() => {
			const sheet = this.sheet;
			return sheet
				? this.rows.filter((r) => {
						const score = parseScore(this.draftOf(r.student_id).score);
						return typeof score === 'number' && score < sheet.kkm;
					}).length
				: 0;
		});
		this.dirty = $derived(
			this.rows.some((r) => {
				const d = this.draftOf(r.student_id);
				return parseScore(d.score) !== r.score || d.description.trim() !== r.description.trim();
			})
		);
		this.hydrate(view);
	}

	#t(key: string, params?: Record<string, string | number>) {
		return this.#deps.t(`grades.${key}`, params);
	}

	/** Isian lokal mengikuti lembar nilai yang dimuat / hasil action terbaru. */
	hydrate(v: SchoolGradeSheet | null) {
		this.drafts = Object.fromEntries(
			(v?.rows ?? []).map((r) => [
				r.student_id,
				{ score: r.score === null ? '' : String(r.score), description: r.description }
			])
		);
		this.serverErrors = {};
	}

	draftOf(id: string): GradeDraft {
		return this.drafts[id] ?? { score: '', description: '' };
	}

	#clientErrors(d: GradeDraft, requireComplete: boolean): RowErrors {
		const out: RowErrors = {};
		const score = parseScore(d.score);
		if (score === undefined) out.score = this.#t('issue.score_score_range');
		else if (requireComplete && score === null) out.score = this.#t('issue.score_required');
		if (charCount(d.description) > MAX_DESCRIPTION)
			out.description = this.#t('issue.description_max_length', { max: MAX_DESCRIPTION });
		else if (requireComplete && !d.description.trim())
			out.description = this.#t('issue.description_required');
		return out;
	}

	#hasInputError(id: string) {
		const e = this.#clientErrors(this.draftOf(id), false);
		return Boolean(e.score || e.description);
	}

	edit(id: string, field: keyof GradeDraft, value: string) {
		const d = this.drafts[id];
		if (!d) return;
		d[field] = value;
		const current = this.serverErrors[id];
		if (current?.[field]) {
			const rest = { ...current };
			delete rest[field];
			this.serverErrors = { ...this.serverErrors, [id]: rest };
		}
	}

	/** Isu backend `entries[i].<field>` → pesan per baris; `ids[i]` = murid pada indeks kiriman. */
	#mapIssues(issues: readonly Issue[], ids: readonly string[]) {
		const next: Record<string, RowErrors> = {};
		for (const issue of issues) {
			const match = ISSUE_FIELD.exec(issue.field);
			const id = match ? ids[Number(match[1])] : undefined;
			if (!match || !id) continue;
			const field = match[2] as keyof RowErrors;
			const key = `issue.${field}_${issue.code}`;
			const text = this.#t(key, { max: MAX_DESCRIPTION });
			next[id] = {
				...next[id],
				[field]: text === `grades.${key}` ? this.#t('issue.generic') : text
			};
		}
		this.serverErrors = next;
	}

	async #run(name: string, body: unknown, ids: readonly string[]) {
		this.busy = true;
		const out = await runPageAction<SchoolGradeSheet>(name, body);
		this.busy = false;
		if (!out.ok) {
			this.#mapIssues(out.issues, ids);
			this.#deps.notify(failureMessage(this.#deps.editorT, out), true);
			// Nilai terkunci di tempat lain (409) → muat ulang lembar agar tampil read-only.
			if (out.code === 'invalid_transition') void invalidateAll();
			return null;
		}
		this.override = out.data;
		this.hydrate(out.data);
		return out.data;
	}

	async save(): Promise<boolean> {
		const { sheet, rows } = this;
		if (!sheet || this.busy) return false;
		if (rows.some((r) => this.#hasInputError(r.student_id))) {
			this.#deps.notify(this.#t('sheet.fix_errors'), true);
			return false;
		}
		const entries = rows.flatMap((r) => {
			const d = this.draftOf(r.student_id);
			const score = parseScore(d.score);
			return typeof score === 'number'
				? [{ student_id: r.student_id, score, description: d.description.trim() }]
				: [];
		});
		if (!entries.length) {
			this.#deps.notify(this.#t('sheet.nothing_to_save'), true);
			return false;
		}
		const out = await this.#run(
			'save',
			{ id: sheet.id, entries },
			entries.map((e) => e.student_id)
		);
		if (out) this.#deps.notify(this.#t('sheet.saved', { count: entries.length }));
		return Boolean(out);
	}

	/** Validasi sebelum dialog konfirmasi kunci; true = dialog boleh dibuka. */
	requestLock(): boolean {
		const { sheet, rows } = this;
		if (!sheet || this.busy) return false;
		if (!rows.length) {
			this.#deps.notify(this.#t('errors.no_students'), true);
			return false;
		}
		this.lockTried = true;
		const missing = rows.length - this.completeCount;
		if (missing > 0 || rows.some((r) => this.#hasInputError(r.student_id))) {
			this.#deps.notify(this.#t('sheet.lock_incomplete', { count: Math.max(missing, 1) }), true);
			return false;
		}
		return true;
	}

	async lock() {
		if (!this.sheet) return;
		// Perubahan yang belum tersimpan ikut disimpan dulu agar yang dikunci sesuai layar.
		if (this.dirty && !(await this.save())) return;
		const current = this.sheet;
		if (!current) return;
		const out = await this.#run(
			'lock',
			{ id: current.id },
			current.rows.map((r) => r.student_id)
		);
		if (out) {
			this.lockTried = false;
			this.#deps.notify(this.#t('sheet.locked_toast', { subject: out.subject, class: out.class }));
		}
	}
}
