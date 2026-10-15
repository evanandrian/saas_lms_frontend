import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	SchoolImportPreview,
	SchoolInviteJob,
	SchoolPlanningView,
	SchoolSetupState
} from '$lib/api/generated/lms';
import type { SchoolGradeSheet } from '$lib/features/school-admin/school-admin.types';
import type { PageActionOutcome } from '$lib/utils/page-action';

/**
 * Transisi state class admin sekolah (DECISION 4): loading/success/empty/error/retry/recovery.
 * `runPageAction` (form action halaman) & pembaca berkas disimulasikan; tanpa DOM.
 */

vi.mock('$lib/utils/page-action', () => ({ runPageAction: vi.fn() }));
vi.mock('$app/navigation', () => ({ invalidateAll: vi.fn(), invalidate: vi.fn() }));
vi.mock('$lib/features/school-admin/school-admin.model', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/features/school-admin/school-admin.model')>()),
	readFileBase64: vi.fn()
}));

const { runPageAction } = await import('$lib/utils/page-action');
const { invalidateAll } = await import('$app/navigation');
const { readFileBase64 } = await import('$lib/features/school-admin/school-admin.model');
const { InviteJobPoller } = await import('$lib/features/school-admin/invite-job-poller.svelte');
const { ImportWizardState } = await import('$lib/features/school-admin/import-wizard.state.svelte');
const { GradeSheetState } = await import('$lib/features/school-admin/grade-sheet.state.svelte');
const { PlanningDrawerState } =
	await import('$lib/features/school-admin/planning-drawer.state.svelte');
const { RequiredWizardState } =
	await import('$lib/features/school-admin/required-wizard.state.svelte');

const action = vi.mocked(runPageAction);
const readFile = vi.mocked(readFileBase64);

/**
 * `t` uji: `T(kunci)` (+ parameter) agar pesan bisa dibandingkan tanpa bergantung teks locale;
 * hasil selalu berbeda dari kunci sehingga dianggap "terjemahan tersedia" oleh helper fallback.
 */
const t = (key: string, params?: Readonly<Record<string, string | number>>) =>
	params ? `T(${key})${JSON.stringify(params)}` : `T(${key})`;

const ok = <T>(data: T): PageActionOutcome<T> => ({ ok: true, data });
const fail = (
	code: string,
	issues: { field: string; code: string }[] = []
): PageActionOutcome<never> => ({
	ok: false,
	reason: 'unavailable',
	code,
	issues,
	remaining: null,
	retryAt: null
});

/** Promise yang diselesaikan manual (urutan respons pratinjau). */
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}

beforeEach(() => {
	action.mockReset();
	readFile.mockReset();
	vi.mocked(invalidateAll).mockReset();
});

afterEach(() => {
	vi.useRealTimers();
});

// ===================================================================== InviteJobPoller
describe('InviteJobPoller', () => {
	const job = (status: string, extra: Partial<SchoolInviteJob> = {}) =>
		({
			id: 'j1',
			kind: 'students',
			status,
			done: 0,
			total: 60,
			sent: 0,
			linked: 0,
			skipped: 0,
			failed: 0,
			codes: [],
			error: '',
			created_at: '2026-10-12T00:00:00Z',
			finished_at: null,
			...extra
		}) as unknown as SchoolInviteJob;

	beforeEach(() => vi.useFakeTimers());

	it('berhenti setelah 5 kegagalan beruntun (backoff) dan tidak memanggil ondone', async () => {
		action.mockResolvedValue(fail('unavailable'));
		const ondone = vi.fn();
		const poller = new InviteJobPoller({ jobIds: () => ['j1'], ondone, t });
		poller.start();
		// Tick pertama langsung; berikutnya 4 s, 8 s, 16 s, 30 s (backoff eksponensial, maks 30 s).
		await vi.advanceTimersByTimeAsync(0);
		expect(action).toHaveBeenCalledTimes(1);
		expect(poller.pollError).toBe('T(school_admin.errors.unavailable)');
		await vi.advanceTimersByTimeAsync(3999);
		expect(action).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(action).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(8000 + 16000 + 30000);
		expect(action).toHaveBeenCalledTimes(5);
		expect(poller.pollStopped).toBe(true);
		await vi.advanceTimersByTimeAsync(120_000);
		expect(action).toHaveBeenCalledTimes(5);
		expect(ondone).not.toHaveBeenCalled();
		expect(poller.finished).toBe(false);
	});

	it('memanggil ondone tepat sekali saat semua job final lalu berhenti polling', async () => {
		action
			.mockResolvedValueOnce(ok(job('running', { done: 10 })))
			.mockResolvedValueOnce(
				ok(job('succeeded', { done: 60, codes: [{ name: 'A', username: 'a', code: 'X' }] }))
			);
		const ondone = vi.fn();
		const poller = new InviteJobPoller({ jobIds: () => ['j1'], ondone, t });
		poller.start();
		await vi.advanceTimersByTimeAsync(0);
		expect(poller.list[0]?.job?.done).toBe(10);
		expect(poller.finished).toBe(false);
		await vi.advanceTimersByTimeAsync(2000);
		expect(poller.finished).toBe(true);
		expect(poller.codes).toHaveLength(1);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(ondone).toHaveBeenCalledTimes(1);
		expect(action).toHaveBeenCalledTimes(2);
	});

	it('pulih dari kegagalan: pesan error hilang dan interval kembali normal', async () => {
		action
			.mockResolvedValueOnce(fail('unavailable'))
			.mockResolvedValueOnce(ok(job('running')))
			.mockResolvedValue(ok(job('running')));
		const poller = new InviteJobPoller({ jobIds: () => ['j1'], ondone: vi.fn(), t });
		poller.start();
		await vi.advanceTimersByTimeAsync(0);
		expect(poller.pollError).not.toBe('');
		await vi.advanceTimersByTimeAsync(4000);
		expect(poller.pollError).toBe('');
		expect(poller.pollStopped).toBe(false);
		await vi.advanceTimersByTimeAsync(2000);
		expect(action).toHaveBeenCalledTimes(3);
	});

	it('fungsi pembersih (unmount) menghentikan timer dan mengabaikan respons yang terlambat', async () => {
		const pending = deferred<PageActionOutcome<SchoolInviteJob>>();
		action.mockReturnValueOnce(pending.promise);
		const ondone = vi.fn();
		const poller = new InviteJobPoller({ jobIds: () => ['j1'], ondone, t });
		const stop = poller.start();
		stop();
		pending.resolve(ok(job('succeeded')));
		await vi.advanceTimersByTimeAsync(10_000);
		expect(poller.jobs).toEqual({});
		expect(ondone).not.toHaveBeenCalled();
		expect(action).toHaveBeenCalledTimes(1);
	});

	it('codes_unavailable (BV03-F1): kode tak terbaca ditandai, bukan dianggap tidak ada kode', async () => {
		action.mockResolvedValue(ok(job('succeeded', { done: 60, codes_unavailable: true })));
		const poller = new InviteJobPoller({ jobIds: () => ['j1'], ondone: vi.fn(), t });
		poller.start();
		await vi.advanceTimersByTimeAsync(0);
		expect(poller.finished).toBe(true);
		expect(poller.codes).toHaveLength(0);
		expect(poller.codesUnavailable).toBe(true);
	});

	it('tanpa codes_unavailable: kode normal dan daftar kosong tidak ditandai', async () => {
		action.mockResolvedValue(
			ok(job('succeeded', { done: 60, codes: [{ name: 'A', username: 'a', code: 'X' }] }))
		);
		const poller = new InviteJobPoller({ jobIds: () => ['j1'], ondone: vi.fn(), t });
		poller.start();
		await vi.advanceTimersByTimeAsync(0);
		expect(poller.codes).toHaveLength(1);
		expect(poller.codesUnavailable).toBe(false);
	});

	it('tanpa job id tidak melakukan polling', async () => {
		const poller = new InviteJobPoller({ jobIds: () => [], ondone: vi.fn(), t });
		poller.start();
		await vi.advanceTimersByTimeAsync(10_000);
		expect(action).not.toHaveBeenCalled();
		expect(poller.finished).toBe(false);
	});
});

// ===================================================================== ImportWizardState
describe('ImportWizardState', () => {
	const spec = { kind: 'students', file: 'murid', invite: true, columns: [{ key: 'name' }] };
	const parsed = (n: number) => ({
		file_name: 'murid.csv',
		rows: Array.from({ length: n }, (_, i) => ({
			no: i + 1,
			values: { name: `M${i + 1}` },
			skip: false
		}))
	});
	const preview = (valid: number, invalid = 0) =>
		({ valid, invalid, over: 0, checks: [] }) as unknown as SchoolImportPreview;
	const csv = (size = 10) => new File(['x'.repeat(size)], 'murid.csv', { type: 'text/csv' });

	async function wizardWithSpec() {
		const deps = {
			kind: () => 'students' as const,
			seatOffer: () => null,
			onbuyseats: () => undefined,
			ondone: vi.fn(),
			onclose: vi.fn(),
			t
		};
		const wizard = new ImportWizardState(deps);
		action.mockResolvedValueOnce(ok(spec));
		await wizard.loadSpec();
		action.mockReset();
		return { wizard, deps };
	}

	it('loadSpec gagal → specError dari pemetaan i18n (bukan pesan mentah)', async () => {
		const wizard = new ImportWizardState({
			kind: () => 'students',
			seatOffer: () => null,
			onbuyseats: () => undefined,
			ondone: vi.fn(),
			onclose: vi.fn(),
			t
		});
		action.mockResolvedValueOnce(fail('tenant_read_only'));
		await wizard.loadSpec();
		expect(wizard.spec).toBeNull();
		expect(wizard.specError).toBe('T(school_admin.errors.tenant_read_only)');
	});

	it('gagal membaca berkas → busy kembali false dan fileError terisi', async () => {
		const { wizard } = await wizardWithSpec();
		readFile.mockRejectedValueOnce(new Error('NotReadableError'));
		await wizard.readFile(csv());
		expect(wizard.busy).toBe(false);
		expect(wizard.fileError).toBe('T(school_admin.errors.file_unreadable){"value":""}');
		expect(wizard.step).toBe('prep');
		expect(action).not.toHaveBeenCalled();
	});

	it('menolak format/ukuran berkas di klien tanpa memanggil backend', async () => {
		const { wizard } = await wizardWithSpec();
		await wizard.readFile(new File(['x'], 'murid.pdf'));
		expect(wizard.fileError).toBe('T(school_admin.import.file_format)');
		expect(action).not.toHaveBeenCalled();
		expect(readFile).not.toHaveBeenCalled();
	});

	it('parse sukses → langkah pratinjau dengan hasil pratinjau backend', async () => {
		const { wizard } = await wizardWithSpec();
		readFile.mockResolvedValueOnce('YmFzZTY0');
		action.mockResolvedValueOnce(ok(parsed(3))).mockResolvedValueOnce(ok(preview(3)));
		await wizard.readFile(csv());
		expect(wizard.step).toBe('preview');
		expect(wizard.rows).toHaveLength(3);
		expect(wizard.preview?.valid).toBe(3);
		expect(wizard.counts).toEqual({ all: 3, err: 0, ok: 3 });
		expect(wizard.busy).toBe(false);
	});

	it('mengabaikan respons pratinjau usang (urutan respons terbalik)', async () => {
		const { wizard } = await wizardWithSpec();
		const first = deferred<PageActionOutcome<SchoolImportPreview>>();
		const second = deferred<PageActionOutcome<SchoolImportPreview>>();
		action.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		const p1 = wizard.runPreview();
		const p2 = wizard.runPreview();
		second.resolve(ok(preview(2)));
		await p2;
		first.resolve(ok(preview(99)));
		await p1;
		expect(wizard.preview?.valid).toBe(2);
	});

	it('unggah ulang membatalkan pratinjau yang masih berjalan', async () => {
		const { wizard } = await wizardWithSpec();
		const pending = deferred<PageActionOutcome<SchoolImportPreview>>();
		action.mockReturnValueOnce(pending.promise);
		const p = wizard.runPreview();
		wizard.reupload();
		pending.resolve(ok(preview(5)));
		await p;
		expect(wizard.step).toBe('prep');
		expect(wizard.preview).toBeNull();
	});

	it('berkas baru tidak mewarisi pratinjau berkas lama bila pratinjau baru gagal', async () => {
		const { wizard } = await wizardWithSpec();
		readFile.mockResolvedValue('YmFzZTY0');
		action.mockResolvedValueOnce(ok(parsed(3))).mockResolvedValueOnce(ok(preview(3)));
		await wizard.readFile(csv());
		wizard.reupload();
		action.mockResolvedValueOnce(ok(parsed(1))).mockResolvedValueOnce(fail('internal_error'));
		await wizard.readFile(csv());
		expect(wizard.preview).toBeNull();
		expect(wizard.fileError).toBe('T(school_admin.errors.internal_error)');
		action.mockReset();
		await wizard.commit();
		expect(action).not.toHaveBeenCalled();
		expect(wizard.step).toBe('preview');
	});

	it('suntingan sel beruntun didebounce menjadi satu pratinjau', async () => {
		vi.useFakeTimers();
		const { wizard } = await wizardWithSpec();
		readFile.mockResolvedValueOnce('YmFzZTY0');
		action.mockResolvedValueOnce(ok(parsed(2))).mockResolvedValueOnce(ok(preview(2)));
		await wizard.readFile(csv());
		action.mockReset();
		action.mockResolvedValue(ok(preview(1, 1)));
		wizard.setCell(0, 'name', 'A');
		wizard.setCell(0, 'name', 'AB');
		await vi.advanceTimersByTimeAsync(399);
		expect(action).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(action).toHaveBeenCalledTimes(1);
		expect(wizard.rows[0]?.values.name).toBe('AB');
		expect(wizard.preview?.invalid).toBe(1);
	});

	it('commit gagal → tetap di pratinjau dengan pesan i18n; sukses → langkah selesai', async () => {
		const { wizard, deps } = await wizardWithSpec();
		readFile.mockResolvedValueOnce('YmFzZTY0');
		action.mockResolvedValueOnce(ok(parsed(2))).mockResolvedValueOnce(ok(preview(2)));
		await wizard.readFile(csv());
		action.mockResolvedValueOnce(fail('quota_students_exceeded'));
		await wizard.commit();
		expect(wizard.step).toBe('preview');
		expect(wizard.busy).toBe(false);
		expect(wizard.fileError).toBe('T(school_admin.errors.quota_students_exceeded)');
		action.mockResolvedValueOnce(ok({ saved: 2, skipped: [], invite: null }));
		await wizard.commit();
		expect(wizard.step).toBe('done');
		wizard.finish();
		expect(deps.ondone).toHaveBeenCalledWith(2);
		expect(deps.onclose).toHaveBeenCalledTimes(1);
	});
});

// ===================================================================== GradeSheetState
describe('GradeSheetState', () => {
	const sheet = (rows: { id: string; score: number | null; description: string }[]) =>
		({
			id: 'sheet-1',
			subject: 'Matematika',
			class: 'X-A',
			kkm: 75,
			locked: false,
			report_status: 'draft',
			rows: rows.map((r) => ({
				student_id: r.id,
				name: r.id,
				nis: '1',
				score: r.score,
				description: r.description
			}))
		}) as unknown as SchoolGradeSheet;

	const make = (view: SchoolGradeSheet | null) => {
		const notify = vi.fn();
		return { state: new GradeSheetState(view, { t, editorT: t, notify }), notify };
	};

	it('lembar kosong (null) → tanpa baris dan aksi simpan/kunci ditolak', async () => {
		const { state } = make(null);
		expect(state.sheet).toBeNull();
		expect(state.rows).toEqual([]);
		expect(await state.save()).toBe(false);
		expect(state.requestLock()).toBe(false);
		expect(action).not.toHaveBeenCalled();
	});

	it('dirty mengikuti isian vs lembar; validasi skor di klien', () => {
		const { state } = make(sheet([{ id: 'a', score: 80, description: 'Baik' }]));
		expect(state.dirty).toBe(false);
		expect(state.filledCount).toBe(1);
		state.edit('a', 'score', '80.00');
		expect(state.dirty).toBe(false);
		state.edit('a', 'score', '101');
		expect(state.dirty).toBe(true);
		expect(state.errors.a?.score).toBe('T(grades.issue.score_score_range)');
		state.edit('a', 'score', '70');
		expect(state.errors.a?.score).toBeUndefined();
		expect(state.belowCount).toBe(1);
	});

	it('simpan ditolak bila ada input tidak valid atau tidak ada skor', async () => {
		const { state, notify } = make(sheet([{ id: 'a', score: null, description: '' }]));
		expect(await state.save()).toBe(false);
		expect(notify).toHaveBeenLastCalledWith('T(grades.sheet.nothing_to_save)', true);
		state.edit('a', 'score', 'abc');
		expect(await state.save()).toBe(false);
		expect(notify).toHaveBeenLastCalledWith('T(grades.sheet.fix_errors)', true);
		expect(action).not.toHaveBeenCalled();
	});

	it('isu backend dipetakan ke baris murid yang dikirim; suntingan menghapus pesan itu', async () => {
		const { state, notify } = make(
			sheet([
				{ id: 'a', score: null, description: '' },
				{ id: 'b', score: null, description: '' }
			])
		);
		state.edit('b', 'score', '90');
		action.mockResolvedValueOnce(
			fail('validation_failed', [{ field: 'entries[0].score', code: 'score_range' }])
		);
		expect(await state.save()).toBe(false);
		// Hanya murid `b` yang dikirim (indeks 0 kiriman = b).
		expect(state.errors.b?.score).toBe('T(grades.issue.score_score_range){"max":500}');
		expect(state.errors.a?.score).toBeUndefined();
		expect(notify).toHaveBeenCalledWith('T(school_admin.errors.score_range){"value":""}', true);
		state.edit('b', 'score', '91');
		expect(state.serverErrors.b?.score).toBeUndefined();
	});

	it('simpan sukses → lembar hasil action menjadi sumber kebenaran dan tidak dirty', async () => {
		const { state, notify } = make(sheet([{ id: 'a', score: null, description: '' }]));
		state.edit('a', 'score', '88');
		state.edit('a', 'description', 'Baik sekali');
		action.mockResolvedValueOnce(ok(sheet([{ id: 'a', score: 88, description: 'Baik sekali' }])));
		expect(await state.save()).toBe(true);
		expect(state.sheet?.rows[0]?.score).toBe(88);
		expect(state.dirty).toBe(false);
		expect(state.busy).toBe(false);
		expect(notify).toHaveBeenLastCalledWith('T(grades.sheet.saved){"count":1}');
	});

	it('kunci: isian belum lengkap menolak dialog dan menandai field wajib', () => {
		const { state, notify } = make(sheet([{ id: 'a', score: 80, description: '' }]));
		expect(state.requestLock()).toBe(false);
		expect(state.lockTried).toBe(true);
		expect(state.errors.a?.description).toBe('T(grades.issue.description_required)');
		expect(notify).toHaveBeenLastCalledWith('T(grades.sheet.lock_incomplete){"count":1}', true);
	});

	it('409 invalid_transition (dikunci di tempat lain) memuat ulang data load', async () => {
		const { state } = make(sheet([{ id: 'a', score: 80, description: 'Baik' }]));
		action.mockResolvedValueOnce(fail('invalid_transition'));
		await state.lock();
		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(state.busy).toBe(false);
	});
});

// ===================================================================== PlanningDrawerState
describe('PlanningDrawerState', () => {
	const planningView = (weight: number, periods: number) =>
		({
			classes: [{ id: 'c1', name: 'X-A', homeroom_id: '' }],
			subjects: [{ id: 's1', name: 'MTK' }],
			grades: [{ id: 'g1', grade: 10 }],
			teachers: [],
			assignments: [],
			objectives: [],
			schedule: [],
			assessments: [{ code: 'UH', name: 'UH', category: 'formatif', is_exam: false, weight }],
			periods: Array.from({ length: periods }, (_, i) => ({
				no: i + 1,
				start: `0${7 + i}:00`,
				end: `0${7 + i}:45`
			}))
		}) as unknown as SchoolPlanningView;

	it('draf bobot/jam dibuat ulang hanya saat tampilan perencanaan berganti', () => {
		let planning = $state(planningView(40, 2));
		const state = new PlanningDrawerState({
			planning: () => planning,
			key: () => 'assess',
			t,
			onplanning: vi.fn(),
			onnotify: vi.fn()
		});
		expect(state.weightSum).toBe(40);
		state.weights.UH = 60;
		state.addPeriod();
		expect(state.weightSum).toBe(60);
		expect(state.periods).toHaveLength(3);
		// Ganti pilihan kelas/mapel tidak menghapus suntingan yang belum disimpan.
		state.classId = 'c1';
		state.objSubject = 's1';
		expect(state.weights.UH).toBe(60);
		expect(state.periods).toHaveLength(3);
		// Tampilan backend baru → draf mengikuti data terbaru.
		planning = planningView(25, 1);
		expect(state.weights.UH).toBe(25);
		expect(state.periods).toHaveLength(1);
	});

	it('pilihan kelas yang tidak lagi tersedia jatuh ke opsi pertama', () => {
		let planning = $state(planningView(40, 1));
		const state = new PlanningDrawerState({
			planning: () => planning,
			key: () => 'assign',
			t,
			onplanning: vi.fn(),
			onnotify: vi.fn()
		});
		state.classId = 'hilang';
		expect(state.classId).toBe('c1');
		planning = { ...planning, classes: [] };
		expect(state.classId).toBe('');
	});

	it('call gagal → notifikasi i18n tanpa meneruskan tampilan; sukses → onplanning', async () => {
		const onplanning = vi.fn();
		const onnotify = vi.fn();
		const view = planningView(40, 1);
		const state = new PlanningDrawerState({
			planning: () => view,
			key: () => 'assess',
			t,
			onplanning,
			onnotify
		});
		// Kebijakan aktif berbobot > 0 → alasan wajib (R9); tanpa alasan tidak memanggil backend.
		await state.saveWeights();
		expect(action).not.toHaveBeenCalled();
		expect(onnotify).toHaveBeenLastCalledWith('T(school_admin.planning.reason_short){"min":5}');
		state.reason = 'revisi bobot';
		action.mockResolvedValueOnce(fail('tenant_read_only'));
		await state.saveWeights();
		expect(onplanning).not.toHaveBeenCalled();
		expect(onnotify).toHaveBeenLastCalledWith('T(school_admin.errors.tenant_read_only)');
		expect(state.busy).toBe(false);
		action.mockResolvedValueOnce(ok(view));
		await state.saveWeights();
		expect(onplanning).toHaveBeenCalledWith(view);
		expect(state.reason).toBe('');
		expect(onnotify).toHaveBeenLastCalledWith('T(school_admin.planning.saved)');
	});

	it('TP terlalu pendek ditolak di klien', async () => {
		const onnotify = vi.fn();
		const state = new PlanningDrawerState({
			planning: () => planningView(40, 1),
			key: () => 'objectives',
			t,
			onplanning: vi.fn(),
			onnotify
		});
		state.objDesc = 'pendek';
		await state.addObjective();
		expect(action).not.toHaveBeenCalled();
		expect(onnotify).toHaveBeenCalledWith('T(school_admin.planning.objective_short)');
	});

	it('kode TP berikutnya = max+1 mapel×tingkat terpilih (cermin BE, tahan celah hapus)', () => {
		const objective = (id: string, code: string, subject = 's1', grade = 'g1') => ({
			id,
			code,
			subject_id: subject,
			grade_id: grade,
			description: 'Deskripsi TP'
		});
		const planning = {
			...planningView(40, 1),
			objectives: [
				objective('o1', 'TP-10.1'),
				objective('o3', 'TP-10.3'),
				objective('o9', 'TP-10.9', 's2')
			]
		} as unknown as SchoolPlanningView;
		const state = new PlanningDrawerState({
			planning: () => planning,
			key: () => 'objectives',
			t,
			onplanning: vi.fn(),
			onnotify: vi.fn()
		});
		expect(state.objectives).toHaveLength(2);
		expect(state.nextCode).toBe('TP-10.4');
	});

	it('initialSubject memilih mapel awal; tanpa opsi → mapel pertama', () => {
		const planning = {
			...planningView(40, 1),
			subjects: [
				{ id: 's1', name: 'MTK' },
				{ id: 's2', name: 'IPA' }
			]
		} as unknown as SchoolPlanningView;
		const deps = {
			planning: () => planning,
			key: () => 'objectives' as const,
			t,
			onplanning: vi.fn(),
			onnotify: vi.fn()
		};
		expect(new PlanningDrawerState({ ...deps, initialSubject: 's2' }).objSubject).toBe('s2');
		expect(new PlanningDrawerState(deps).objSubject).toBe('s1');
	});

	it('initialSubject yang tidak ada di daftar mapel → mapel pertama', () => {
		const planning = {
			...planningView(40, 1),
			subjects: [{ id: 's1', name: 'MTK' }]
		} as unknown as SchoolPlanningView;
		const state = new PlanningDrawerState({
			planning: () => planning,
			key: () => 'objectives',
			t,
			onplanning: vi.fn(),
			onnotify: vi.fn(),
			initialSubject: 'hilang'
		});
		expect(state.objSubject).toBe('s1');
	});

	it('updateObjective: deskripsi pendek ditolak; valid memanggil objectiveUpdate lalu menutup editor', async () => {
		const onnotify = vi.fn();
		const onplanning = vi.fn();
		const state = new PlanningDrawerState({
			planning: () => planningView(40, 1) as unknown as SchoolPlanningView,
			key: () => 'objectives',
			t,
			onplanning,
			onnotify
		});
		state.startEditObjective('o1', 'pendek');
		expect(await state.updateObjective()).toBe(false);
		expect(action).not.toHaveBeenCalled();
		state.editObjectiveText = '  Deskripsi TP yang cukup panjang  ';
		action.mockResolvedValueOnce({ ok: true, data: planningView(40, 1) } as never);
		expect(await state.updateObjective()).toBe(true);
		expect(action).toHaveBeenCalledWith('objectiveUpdate', {
			id: 'o1',
			description: 'Deskripsi TP yang cukup panjang'
		});
		expect(state.editObjective).toBeNull();
		expect(onplanning).toHaveBeenCalled();
	});

	it('planning null (muat gagal) → konstruktor tidak melempar, pemilih kosong', () => {
		const create = () =>
			new PlanningDrawerState({
				planning: () => null as unknown as SchoolPlanningView,
				key: () => 'assess',
				t,
				onplanning: vi.fn(),
				onnotify: vi.fn()
			});
		expect(create).not.toThrow();
		const state = create();
		expect(state.classId).toBe('');
		expect(state.objSubject).toBe('');
		expect(state.objGrade).toBe('');
	});
});

// ===================================================================== RequiredWizardState
describe('RequiredWizardState', () => {
	const KEYS = ['profile', 'curriculum', 'year', 'classes', 'subjects'];
	const setupState = (doneCount: number) =>
		({
			sections: KEYS.map((key, i) => ({ key, done: i < doneCount })),
			profile: { address: 'Jl. Merdeka No. 1', principal_name: 'Budi', principal_nip: '' },
			school: { curriculum: 'merdeka' },
			curricula: [{ value: 'merdeka' }],
			year: {
				name: '2026/2027',
				start: '2026-07-13',
				end: '2027-06-30',
				semesters: [
					{ term: 1, start: '2026-07-13', end: '2026-12-18', active: true },
					{ term: 2, start: '2027-01-04', end: '2027-06-30', active: false }
				]
			},
			scheme: 'huruf',
			grades: [{ grade: 10, label: 'X', count: 2, capacity: 36 }],
			subjects: [{ code: 'MTK', name: 'Matematika', kktp: 75, enabled: true, custom: false }],
			phases: [{ code: 'E', grade_from: 10, grade_to: 10 }],
			default_kktp: 75
		}) as unknown as SchoolSetupState;

	const make = (setup: SchoolSetupState, step: number | null = null, editOne = false) => {
		const deps = {
			setup: () => setup,
			editOne: () => editOne,
			t,
			onstate: vi.fn(),
			ondone: vi.fn(),
			onnotify: vi.fn()
		};
		return { wizard: new RequiredWizardState(deps, step), deps };
	};

	it('langkah awal = langkah wajib pertama yang belum selesai; reachable dibatasi', () => {
		const { wizard } = make(setupState(2));
		expect(wizard.current).toBe(2);
		expect(wizard.reachable).toBe(2);
		expect(make(setupState(5)).wizard.reachable).toBe(4);
		expect(make(setupState(0), 3).wizard.current).toBe(3);
	});

	it('validasi klien gagal → tidak memanggil action dan tidak pindah langkah', async () => {
		const setup = setupState(0);
		const { wizard } = make(setup);
		wizard.profile.address = 'pendek';
		await wizard.next();
		expect(action).not.toHaveBeenCalled();
		expect(wizard.current).toBe(0);
		expect(wizard.errors.address).toBe('T(school_admin.errors.address_short)');
	});

	it('simpan langkah sukses → state backend diteruskan dan lanjut ke langkah berikutnya', async () => {
		const setup = setupState(0);
		const { wizard, deps } = make(setup);
		action.mockResolvedValueOnce(ok(setup));
		await wizard.next();
		expect(action).toHaveBeenCalledWith('profile', expect.anything());
		expect(deps.onstate).toHaveBeenCalledWith(setup);
		expect(wizard.current).toBe(1);
		expect(wizard.savedOnce).toBe(true);
		expect(wizard.busy).toBe(false);
		wizard.back();
		expect(wizard.current).toBe(0);
	});

	it('simpan gagal → error field dari isu backend + notifikasi; langkah tetap', async () => {
		const { wizard, deps } = make(setupState(0));
		action.mockResolvedValueOnce(
			fail('validation_failed', [{ field: 'principal_name', code: 'required' }])
		);
		await wizard.next();
		expect(wizard.current).toBe(0);
		expect(wizard.errors.principal_name).toBe('T(school_admin.errors.required){"value":""}');
		expect(deps.onnotify).toHaveBeenCalledTimes(1);
		expect(wizard.busy).toBe(false);
	});

	it('langkah terakhir / mode ubah satu bagian → ondone', async () => {
		const setup = setupState(5);
		const last = make(setup, 4);
		action.mockResolvedValueOnce(ok(setup));
		await last.wizard.next();
		expect(last.deps.ondone).toHaveBeenCalledTimes(1);
		const one = make(setup, 1, true);
		action.mockResolvedValueOnce(ok(setup));
		await one.wizard.next();
		expect(one.deps.ondone).toHaveBeenCalledTimes(1);
		expect(one.wizard.current).toBe(1);
	});

	it('kelas & mapel: validasi jumlah dan mapel kustom', () => {
		const { wizard } = make(setupState(5), 3);
		expect(wizard.totalClasses).toBe(2);
		expect(wizard.previewNames(wizard.grades[0]!)).toEqual(['X-A', 'X-B']);
		wizard.scheme = 'angka';
		expect(wizard.previewNames(wizard.grades[0]!)).toEqual(['X-1', 'X-2']);
		expect(wizard.phaseOfGrade(10)).toBe('E');
		wizard.newCode = 'mtk';
		wizard.newName = 'Duplikat';
		wizard.addSubject();
		expect(wizard.errors.subjects).toBe('T(school_admin.errors.code_taken)');
		wizard.newCode = 'inf';
		wizard.newName = 'Informatika';
		wizard.addSubject();
		expect(wizard.subjects.map((s) => s.code)).toEqual(['MTK', 'INF']);
		expect(wizard.newCode).toBe('');
		wizard.toggleAllSubjects();
		expect(wizard.enabledSubjects).toBe(0);
	});

	it('logo: berkas tidak terbaca → pesan field logo, tanpa action', async () => {
		const { wizard } = make(setupState(5), 0);
		readFile.mockRejectedValueOnce(new Error('NotReadableError'));
		await wizard.uploadLogo(new File(['x'], 'logo.png', { type: 'image/png' }));
		expect(wizard.errors.logo).toBe('T(school_admin.setup.logo_invalid)');
		expect(action).not.toHaveBeenCalled();
		expect(wizard.busy).toBe(false);
	});
});
