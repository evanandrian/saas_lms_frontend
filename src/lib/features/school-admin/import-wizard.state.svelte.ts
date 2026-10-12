import type {
	SchoolImportPreview,
	SchoolImportResult,
	SchoolImportRow,
	SchoolImportSpec,
	SchoolParsedImport
} from '$lib/api/generated/lms';
import { runPageAction, type PageActionOutcome } from '$lib/utils/page-action';
import { MAX_JSON_PAYLOAD_BYTES, UPLOAD_LIMITS } from '$lib/utils/upload-limits';
import {
	MAX_IMPORT_ROWS,
	PREFIX,
	failureMessage,
	issueMessage,
	prorataAmount,
	readFileBase64
} from './school-admin.model';

type Translate = (key: string, params?: Readonly<Record<string, string | number>>) => string;

export type ImportWizardKind = 'classes' | 'subjects' | 'teachers' | 'students' | 'guardians';
export type ImportStep = 'prep' | 'preview' | 'done';
export type ImportTab = 'all' | 'err' | 'ok';

export interface SeatOffer {
	trial: boolean;
	unitPrice: number;
	months: number;
}

export interface ImportWizardDeps {
	/** Getter props agar state mengikuti nilai props terbaru. */
	kind: () => ImportWizardKind;
	seatOffer: () => SeatOffer | null;
	onbuyseats: () => ((seats: number) => Promise<boolean>) | undefined;
	ondone: (saved: number) => void;
	onclose: () => void;
	/** `i18n.t` (kunci penuh). */
	t: Translate;
}

const PREVIEW_DEBOUNCE_MS = 400;
const MAX_VISIBLE = 300;
/** Jeda sebelum URL blob laporan error dilepas (unduhan sudah dimulai browser). */
const REVOKE_DELAY_MS = 1000;

/**
 * State modal impor Excel/CSV (referensi v4 BigModal "ImportWizard"): spesifikasi kolom, baca &
 * parse berkas, pratinjau (debounce + abaikan respons usang), sunting sel/lewati baris, tambah kursi,
 * simpan, dan laporan error CSV. Markup & ikon tetap di komponen.
 */
export class ImportWizardState {
	readonly #deps: ImportWizardDeps;
	#debounce: ReturnType<typeof setTimeout> | undefined;
	/** Nomor urut permintaan pratinjau; respons lama (debounce/klik beruntun) diabaikan. */
	#previewSeq = 0;

	step = $state<ImportStep>('prep');
	spec = $state<SchoolImportSpec | null>(null);
	specError = $state('');
	fileName = $state('');
	fileError = $state('');
	drag = $state(false);
	busy = $state(false);
	rows = $state<SchoolImportRow[]>([]);
	preview = $state<SchoolImportPreview | null>(null);
	tab = $state<ImportTab>('all');
	inviteNow = $state(true);
	result = $state<SchoolImportResult | null>(null);

	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- indeks turunan, dibuat ulang tiap pratinjau baru
	checks = $derived(new Map((this.preview?.checks ?? []).map((c) => [c.no, c])));
	counts = $derived({
		all: this.rows.length,
		err: (this.preview?.invalid ?? 0) + (this.preview?.over ?? 0),
		ok: this.preview?.valid ?? 0
	});
	visible = $derived(
		this.rows
			.map((row, index) => ({ row, index, check: this.checks.get(row.no) }))
			.filter(({ row, check }) => {
				if (this.tab === 'all') return true;
				const bad = !row.skip && check && (Object.keys(check.errors).length > 0 || check.over);
				return this.tab === 'err' ? bad : !row.skip && check && !bad;
			})
			.slice(0, MAX_VISIBLE)
	);
	overSeats = $derived(this.preview?.over ?? 0);
	seatAmount: number;

	constructor(deps: ImportWizardDeps) {
		this.#deps = deps;
		this.seatAmount = $derived.by(() => {
			const offer = this.#deps.seatOffer();
			return offer ? prorataAmount(this.overSeats, offer.unitPrice, offer.months) : 0;
		});
	}

	#t(key: string, params?: Record<string, string | number>) {
		return this.#deps.t(`${PREFIX}.import.${key}`, params);
	}

	/** Lepas timer debounce pratinjau saat komponen dilepas. */
	destroy() {
		clearTimeout(this.#debounce);
	}

	async loadSpec() {
		const out = await runPageAction<SchoolImportSpec>('importSpec', { kind: this.#deps.kind() });
		if (out.ok) this.spec = out.data;
		else this.specError = failureMessage(this.#deps.t, out);
	}

	async readFile(file: File | undefined) {
		if (!file || !this.spec) return;
		const { t } = this.#deps;
		this.fileError = '';
		if (file.size > UPLOAD_LIMITS.importBytes) {
			this.fileError = this.#t('file_too_large');
			return;
		}
		const ext = file.name.split('.').pop()?.toLowerCase();
		if (ext !== 'xlsx' && ext !== 'csv') {
			this.fileError = this.#t('file_format');
			return;
		}
		this.busy = true;
		let out: PageActionOutcome<SchoolParsedImport>;
		try {
			const content = await readFileBase64(file);
			out = await runPageAction<SchoolParsedImport>('importParse', {
				kind: this.#deps.kind(),
				file: { file_name: file.name, content_base64: content }
			});
		} catch {
			this.fileError = issueMessage(t, 'file_unreadable');
			return;
		} finally {
			this.busy = false;
		}
		if (!out.ok) {
			this.fileError = failureMessage(t, out);
			return;
		}
		// Cermin batas backend (maxImportRows) agar body pratinjau/simpan tetap di bawah BODY_SIZE_LIMIT.
		if (out.data.rows.length > MAX_IMPORT_ROWS) {
			this.fileError = issueMessage(t, 'too_many_rows');
			return;
		}
		this.fileName = out.data.file_name;
		this.rows = out.data.rows;
		this.tab = 'all';
		this.step = 'preview';
		await this.runPreview();
	}

	/** Body impor (pratinjau/simpan) melebihi batas body form action → tolak di klien. */
	#payloadTooLarge(body: unknown) {
		return new Blob([JSON.stringify(body)]).size > MAX_JSON_PAYLOAD_BYTES;
	}

	async runPreview() {
		// Pratinjau langsung menggantikan jadwal debounce & permintaan yang masih berjalan.
		clearTimeout(this.#debounce);
		const seq = ++this.#previewSeq;
		const body = { kind: this.#deps.kind(), request: { rows: this.rows } };
		if (this.#payloadTooLarge(body)) {
			this.fileError = issueMessage(this.#deps.t, 'file_too_large');
			return;
		}
		const out = await runPageAction<SchoolImportPreview>('importPreview', body);
		if (seq !== this.#previewSeq) return;
		if (out.ok) {
			this.preview = out.data;
			this.fileError = '';
		} else {
			this.fileError = failureMessage(this.#deps.t, out);
		}
	}

	#schedulePreview() {
		clearTimeout(this.#debounce);
		this.#debounce = setTimeout(() => void this.runPreview(), PREVIEW_DEBOUNCE_MS);
	}

	setCell(index: number, key: string, value: string) {
		const row = this.rows[index];
		if (!row) return;
		row.values = { ...row.values, [key]: value };
		this.#schedulePreview();
	}

	toggleRow(index: number) {
		const row = this.rows[index];
		if (!row) return;
		row.skip = !row.skip;
		void this.runPreview();
	}

	/** Kembali ke langkah unggah dan buang baris hasil parse. */
	reupload() {
		// Batalkan pratinjau terjadwal/berjalan agar respons lama tidak mengisi ulang `preview`.
		clearTimeout(this.#debounce);
		this.#previewSeq++;
		this.step = 'prep';
		this.rows = [];
		this.preview = null;
	}

	async buySeats() {
		const onbuyseats = this.#deps.onbuyseats();
		if (!onbuyseats || !this.overSeats) return;
		this.busy = true;
		const applied = await onbuyseats(this.overSeats);
		this.busy = false;
		if (applied) await this.runPreview();
	}

	async commit() {
		if (!this.preview?.valid) return;
		const body = {
			kind: this.#deps.kind(),
			request: { rows: this.rows, invite: Boolean(this.spec?.invite) && this.inviteNow }
		};
		if (this.#payloadTooLarge(body)) {
			this.fileError = issueMessage(this.#deps.t, 'file_too_large');
			return;
		}
		this.busy = true;
		const out = await runPageAction<SchoolImportResult>('importCommit', body);
		this.busy = false;
		if (!out.ok) {
			this.fileError = failureMessage(this.#deps.t, out);
			return;
		}
		this.result = out.data;
		this.step = 'done';
	}

	cellError(no: number, key: string) {
		const code = this.checks.get(no)?.errors[key];
		return code ? issueMessage(this.#deps.t, code) : '';
	}

	/** Laporan error CSV (baris dilewati + alasan) dibuat di browser dari hasil pemeriksaan backend. */
	downloadErrors() {
		const { spec, result, rows, checks } = this;
		if (!spec) return;
		const t = this.#deps.t;
		const cols = spec.columns.map((c) => c.key);
		const source = result
			? result.skipped.map((c) => ({ check: c, row: rows.find((r) => r.no === c.no) }))
			: rows
					.map((row) => ({ row, check: checks.get(row.no) }))
					.filter(
						({ row, check }) =>
							row.skip || (check && (Object.keys(check.errors).length > 0 || check.over))
					);
		const esc = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
		const lines = [
			[this.#t('csv_col_row'), ...cols, this.#t('csv_col_error')],
			...source.map(({ row, check }) => [
				String(row?.no ?? check?.no ?? ''),
				...cols.map((c) => row?.values[c] ?? ''),
				row?.skip || check?.skip
					? this.#t('row_skipped')
					: check?.over
						? this.#t('row_over')
						: Object.entries(check?.errors ?? {})
								.map(([k, code]) => `${k}: ${issueMessage(t, code)}`)
								.join('; ')
			])
		];
		const blob = new Blob([`\ufeff${lines.map((r) => r.map(esc).join(',')).join('\n')}`], {
			type: 'text/csv'
		});
		const a = document.createElement('a');
		const href = URL.createObjectURL(blob);
		a.href = href;
		a.download = this.#t('csv_file_name', { file: spec.file });
		a.click();
		setTimeout(() => URL.revokeObjectURL(href), REVOKE_DELAY_MS);
	}

	finish() {
		this.#deps.ondone(this.result?.saved ?? 0);
		this.#deps.onclose();
	}
}
