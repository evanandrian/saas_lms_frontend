import { browser } from '$app/environment';
import { runPageAction, type PageActionOutcome } from '$lib/utils/page-action';
import {
	CONNECTION_FIELDS,
	CONNECTION_ISSUE_FIELD,
	blankDraft,
	connectionErrorKey,
	draftFromView,
	serverIssueError,
	toInput,
	toTestInput,
	validateDraft,
	type ClusterDatabase,
	type ClusterDatabaseList,
	type ClusterDraft,
	type ClusterErrors,
	type ClusterList,
	type ClusterRegion,
	type ClusterTestResult,
	type ClusterView
} from './clusters.model';

/** Hasil uji koneksi di panel Koneksi; `failed.reason` = kunci i18n relatif `clusters.`. */
export type TestState =
	| { phase: 'running' }
	| { phase: 'ok'; version: string; latencyMs: number; ssl: boolean }
	| { phase: 'failed'; reason: string };

export type DatabasesState =
	| { phase: 'idle' }
	| { phase: 'loading' }
	| { phase: 'ready'; items: ClusterDatabase[] }
	| { phase: 'failed'; reason: string };

/** Hasil `save()`; komponen menampilkan toast / dialog sesuai hasil. */
export type SaveOutcome =
	| { kind: 'invalid' }
	| { kind: 'unchanged' }
	| { kind: 'confirm_maintenance' }
	| { kind: 'saved'; code: string }
	| { kind: 'failed'; reason: string };

type Failure = Extract<PageActionOutcome<never>, { ok: false }>;
type SavedResult = { cluster: ClusterView; list: ClusterList | null };

const KNOWN_FAILURES = [
	'forbidden',
	'not_found',
	'validation_failed',
	'connection_failed',
	'cluster_unreachable',
	'invalid_request',
	'unavailable'
];

/** Kode kegagalan action → kunci i18n `failure.<kode>` (relatif `clusters.`). */
export function failureKey(code: string): string {
	return `failure.${KNOWN_FAILURES.includes(code) ? code : 'generic'}`;
}

/**
 * State konsol Cluster DB (referensi "04g Cluster DB"): kartu cluster, draft form terpilih, uji koneksi,
 * daftar database terbesar, dan alur simpan. Teks & toast tetap di komponen.
 */
export class ClusterConsoleState {
	items = $state<ClusterView[]>([]);
	regions = $state<ClusterRegion[]>([]);
	/** `null` = cluster baru (belum tersimpan). */
	selectedId = $state<string | null>(null);
	draft = $state<ClusterDraft>(blankDraft([]));
	original = $state<ClusterDraft>(blankDraft([]));
	test = $state<TestState | null>(null);
	tried = $state(false);
	busy = $state(false);
	showPassword = $state(false);
	serverErrors = $state<ClusterErrors>({});
	databases = $state<DatabasesState>({ phase: 'idle' });

	constructor(list: ClusterList) {
		this.items = list.clusters;
		this.regions = list.regions;
		const first = list.clusters[0];
		if (first) this.select(first.id);
		else this.startNew();
	}

	get selected(): ClusterView | null {
		return this.items.find((c) => c.id === this.selectedId) ?? null;
	}

	get isNew(): boolean {
		return this.selected === null;
	}

	get used(): number {
		return this.selected?.used_databases ?? 0;
	}

	get region(): ClusterRegion | null {
		return this.regions.find((r) => r.code === this.draft.region_code) ?? null;
	}

	get errors(): ClusterErrors {
		return {
			...validateDraft(this.draft, {
				isNew: this.isNew,
				used: this.used,
				takenCodes: this.items.map((c) => c.code),
				testOk: this.test?.phase === 'ok'
			}),
			...this.serverErrors
		};
	}

	get errorCount(): number {
		return Object.keys(this.errors).length;
	}

	get dirty(): boolean {
		// Draft baru dibandingkan dengan draft kosong (baseline `startNew`), termasuk sandi.
		if (this.isNew) return JSON.stringify(this.draft) !== JSON.stringify(this.original);
		const comparable = (d: ClusterDraft) => JSON.stringify({ ...d, password: '' });
		return !!this.draft.password || comparable(this.draft) !== comparable(this.original);
	}

	/** Cluster lama dipindah ke Pemeliharaan → wajib konfirmasi (tenant langsung terputus). */
	get toMaintenance(): boolean {
		return (
			!this.isNew && this.draft.status === 'maintenance' && this.original.status !== 'maintenance'
		);
	}

	/** Versi PostgreSQL dari uji koneksi terakhir; cadangan = versi tersimpan. */
	get pgVersion(): string {
		if (this.test?.phase === 'ok') return this.test.version;
		return this.selected?.pg_version ?? '';
	}

	select(id: string) {
		const cluster = this.items.find((c) => c.id === id);
		if (!cluster) return;
		this.selectedId = id;
		this.setBaseline(draftFromView(cluster));
		this.test = null;
		// SSR tanpa efek samping: daftar database dimuat saat hidrasi di browser.
		if (browser) void this.loadDatabases(id);
		else this.databases = { phase: 'loading' };
	}

	startNew() {
		this.selectedId = null;
		this.setBaseline(blankDraft(this.regions));
		this.test = null;
		this.databases = { phase: 'ready', items: [] };
	}

	reset() {
		if (this.selected) this.select(this.selected.id);
		else if (this.items[0]) this.select(this.items[0].id);
		else this.startNew();
	}

	private setBaseline(d: ClusterDraft) {
		this.draft = d;
		this.original = { ...d };
		this.tried = false;
		this.showPassword = false;
		this.serverErrors = {};
	}

	setField<K extends keyof ClusterDraft>(key: K, value: ClusterDraft[K]) {
		this.draft[key] = value;
		if (this.serverErrors[key]) {
			const next = { ...this.serverErrors };
			delete next[key];
			this.serverErrors = next;
		}
		if (CONNECTION_FIELDS.includes(key)) this.test = null;
	}

	async runTest() {
		this.test = { phase: 'running' };
		const result = await runPageAction<ClusterTestResult>(
			'test',
			toTestInput(this.draft, this.selectedId)
		);
		if (!result.ok) {
			this.applyIssues(result);
			this.test = { phase: 'failed', reason: failureKey(result.code) };
			return;
		}
		const r = result.data;
		this.test = r.ok
			? { phase: 'ok', version: r.pg_version, latencyMs: r.latency_ms, ssl: r.ssl }
			: { phase: 'failed', reason: `test_error.${connectionErrorKey(r.error_code)}` };
	}

	async loadDatabases(id: string) {
		this.databases = { phase: 'loading' };
		const result = await runPageAction<ClusterDatabaseList>('databases', { id });
		if (this.selectedId !== id) return;
		this.databases = result.ok
			? { phase: 'ready', items: result.data.items }
			: { phase: 'failed', reason: failureKey(result.code) };
	}

	/** Validasi → tidak berubah → konfirmasi pemeliharaan → simpan (urutan referensi). */
	async save(): Promise<SaveOutcome> {
		this.tried = true;
		if (this.errorCount) return { kind: 'invalid' };
		if (!this.dirty) return { kind: 'unchanged' };
		if (this.toMaintenance) return { kind: 'confirm_maintenance' };
		return this.commit();
	}

	async commit(): Promise<SaveOutcome> {
		const wasNew = this.isNew;
		const input = toInput(this.draft, wasNew);
		this.busy = true;
		const result = wasNew
			? await runPageAction<SavedResult>('create', { data: input })
			: await runPageAction<SavedResult>('update', { id: this.selectedId, data: input });
		this.busy = false;
		if (!result.ok) {
			this.applyIssues(result);
			return { kind: 'failed', reason: failureKey(result.code) };
		}
		const { cluster, list } = result.data;
		if (list) {
			this.items = list.clusters;
			this.regions = list.regions;
		} else {
			this.items = wasNew
				? [...this.items, cluster]
				: this.items.map((c) => (c.id === cluster.id ? cluster : c));
		}
		const test = this.test;
		this.selectedId = cluster.id;
		this.setBaseline(draftFromView(cluster));
		this.test = test;
		if (wasNew) this.loadDatabases(cluster.id);
		return { kind: 'saved', code: cluster.code };
	}

	/** Isu validasi → isian form; error koneksi → panel uji koneksi. */
	private applyIssues(failure: Failure) {
		const errors: ClusterErrors = { ...this.serverErrors };
		for (const issue of failure.issues) {
			if (issue.field === CONNECTION_ISSUE_FIELD) {
				this.test = {
					phase: 'failed',
					reason: `test_error.${connectionErrorKey(issue.code)}`
				};
				continue;
			}
			const mapped = serverIssueError(issue.field, issue.code);
			if (mapped && !errors[mapped.field]) errors[mapped.field] = mapped.key;
		}
		this.serverErrors = errors;
	}
}
