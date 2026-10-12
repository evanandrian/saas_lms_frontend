import { replaceState } from '$app/navigation';
import { resolve } from '$app/paths';
import { APP_PATHS } from '$lib/utils/app-paths';
import type { BackendFailure, BackendIssue } from '$lib/api/backend-call';
import { runPageAction } from '$lib/utils/page-action';
import {
	ACTOR_ACTIVITY_RANGE,
	AUDIT_MODULES,
	CUSTOM_DEFAULT_DAYS,
	SEARCH_DEBOUNCE_MS,
	TOAST_MS,
	actorKey,
	emptyFilters,
	filtersToQuery,
	hasActiveFilters,
	rangeInvalid,
	shiftDate,
	todayWib,
	type AuditFilters,
	type AuditRange,
	type AuditSeverity
} from './platform-audit.model';
import type { AuditActorOption, AuditEntry, AuditList, AuditVerify } from './platform-audit.types';

/** Status verifikasi rantai hash (`GET /platform/audit/verify`), bukan nilai tetap. */
export type ChainStatus =
	| { state: 'checking' }
	| { state: 'ok'; lastSeq: number }
	| { state: 'broken'; brokenSeq: number }
	| { state: 'unavailable' };

/** Badge rantai hash untuk satu entri. `pending` = entri lebih baru dari verifikasi terakhir. */
export type ChainBadge = 'verified' | 'pending' | 'broken' | 'checking' | 'unavailable';

export type NoticeIcon = 'success' | 'copy' | 'download' | 'info' | 'error';

/** Toast dalam bentuk kunci i18n; diterjemahkan komponen. */
export interface AuditNotice {
	key: string;
	params?: Record<string, string | number>;
	icon: NoticeIcon;
}

export interface AuditLogInit {
	filters: AuditFilters;
	list: AuditList | null;
	failure: BackendFailure | null;
	issues: BackendIssue[];
}

const EXPORT_FALLBACK_NAME = 'audit-log';
const FILENAME_PATTERN = /filename="?([^";]+)"?/i;

/**
 * State halaman Audit log platform: filter (tersinkron ke query URL), daftar ber-cursor, entri terpilih,
 * status rantai hash, ekspor CSV, dan toast. Permintaan usang (filter berganti cepat) diabaikan.
 */
export class AuditLogState {
	filters = $state<AuditFilters>(emptyFilters());
	items = $state.raw<AuditEntry[]>([]);
	total = $state(0);
	nextBefore = $state<number | null>(null);
	actors = $state.raw<AuditActorOption[]>([]);
	modules = $state.raw<string[]>([]);
	/** Galat muat awal selain validasi filter → halaman menampilkan StatePanel. */
	failure = $state<BackendFailure | null>(null);
	issues = $state.raw<BackendIssue[]>([]);
	selectedId = $state('');
	busy = $state(false);
	loadingMore = $state(false);
	exporting = $state(false);
	chain = $state<ChainStatus>({ state: 'checking' });
	notice = $state<AuditNotice | null>(null);

	#request = 0;
	#searchTimer: ReturnType<typeof setTimeout> | undefined;
	#toastTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(init: AuditLogInit) {
		this.filters = init.filters;
		this.failure = init.failure === 'validation' ? null : init.failure;
		this.issues = init.issues;
		// Muat awal gagal validasi (filter URL tidak valid) → chip modul tetap tersedia.
		if (init.list) this.#setList(init.list, false);
		else this.modules = [...AUDIT_MODULES];
	}

	get selected(): AuditEntry | null {
		return this.items.find((x) => x.id === this.selectedId) ?? null;
	}

	get hasFilters() {
		return hasActiveFilters(this.filters);
	}

	get hasMore() {
		return this.nextBefore !== null;
	}

	/** Kode galat rentang: `range_invalid` (UX) atau isu backend untuk `from`/`to`. */
	get rangeIssue(): string {
		if (rangeInvalid(this.filters)) return 'range_invalid';
		return this.issues.find((x) => x.field === 'to' || x.field === 'from')?.code ?? '';
	}

	get exportHref(): string {
		const query = filtersToQuery(this.filters).toString();
		return `${resolve('/platform/audit-log/export')}${query ? `?${query}` : ''}`;
	}

	chainBadge(entry: AuditEntry): ChainBadge {
		const c = this.chain;
		if (c.state === 'checking' || c.state === 'unavailable') return c.state;
		if (c.state === 'broken') return entry.seq < c.brokenSeq ? 'verified' : 'broken';
		return entry.seq <= c.lastSeq ? 'verified' : 'pending';
	}

	// ===== Filter =====

	setQuery(value: string) {
		this.filters.q = value;
		clearTimeout(this.#searchTimer);
		this.#searchTimer = setTimeout(() => void this.apply(), SEARCH_DEBOUNCE_MS);
	}

	setActor(value: string) {
		this.filters.actor = value;
		void this.apply();
	}

	setRange(range: AuditRange) {
		this.filters.range = range;
		if (range === 'custom' && !this.filters.from && !this.filters.to) {
			const today = todayWib();
			this.filters.from = shiftDate(today, -CUSTOM_DEFAULT_DAYS);
			this.filters.to = today;
		}
		void this.apply();
	}

	setDate(field: 'from' | 'to', value: string) {
		this.filters[field] = value;
		void this.apply();
	}

	toggleModule(code: string) {
		const on = this.filters.modules.includes(code);
		this.filters.modules = on
			? this.filters.modules.filter((x) => x !== code)
			: [...this.filters.modules, code];
		void this.apply();
	}

	toggleSeverity(code: AuditSeverity) {
		const on = this.filters.severities.includes(code);
		this.filters.severities = on
			? this.filters.severities.filter((x) => x !== code)
			: [...this.filters.severities, code];
		void this.apply();
	}

	toggleFailed() {
		this.filters.failed = !this.filters.failed;
		void this.apply();
	}

	clearFilters() {
		clearTimeout(this.#searchTimer);
		this.filters = emptyFilters();
		void this.apply();
	}

	/** "Aktivitas pelaku ini": filter pelaku entri + rentang 30 hari. */
	showActorActivity(entry: AuditEntry) {
		this.filters.actor = actorKey(entry.actor);
		this.filters.range = ACTOR_ACTIVITY_RANGE;
		this.filters.from = '';
		this.filters.to = '';
		void this.apply();
	}

	select(id: string) {
		this.selectedId = id;
	}

	// ===== Data =====

	/** Muat ulang halaman pertama sesuai filter dan tulis filter ke URL (tanpa menjalankan load). */
	async apply() {
		clearTimeout(this.#searchTimer);
		this.#syncUrl();
		if (rangeInvalid(this.filters)) {
			this.#request++;
			this.busy = false;
			return;
		}
		const token = ++this.#request;
		this.busy = true;
		const out = await runPageAction<AuditList>('list', {
			filters: $state.snapshot(this.filters)
		});
		if (token !== this.#request) return;
		this.busy = false;
		if (!out.ok) {
			this.issues = out.issues;
			if (!out.issues.length) this.#notifyFailure(out.code, out.reason);
			return;
		}
		this.issues = [];
		this.#setList(out.data, false);
	}

	async loadMore() {
		if (this.nextBefore === null || this.loadingMore || this.busy) return;
		const token = this.#request;
		this.loadingMore = true;
		const out = await runPageAction<AuditList>('list', {
			filters: $state.snapshot(this.filters),
			before: this.nextBefore
		});
		this.loadingMore = false;
		// Filter berganti selama memuat → hasil halaman lama dibuang.
		if (token !== this.#request) return;
		if (!out.ok) {
			this.#notifyFailure(out.code, out.reason);
			return;
		}
		this.#setList(out.data, true);
	}

	async verifyChain() {
		this.chain = { state: 'checking' };
		const out = await runPageAction<AuditVerify>('verify');
		if (!out.ok) {
			this.chain = { state: 'unavailable' };
			return;
		}
		this.chain = out.data.ok
			? { state: 'ok', lastSeq: out.data.last_seq }
			: { state: 'broken', brokenSeq: out.data.broken_seq ?? 0 };
	}

	async copyRef(entry: AuditEntry) {
		try {
			await navigator.clipboard.writeText(entry.ref);
			this.notify({ key: 'toast.copied', params: { ref: entry.ref }, icon: 'copy' });
		} catch {
			this.notify({ key: 'toast.copy_failed', icon: 'error' });
		}
	}

	/** Unduh CSV lewat proxy SvelteKit; galat backend (mis. `export_too_large`) menjadi toast. */
	async exportCsv() {
		if (this.exporting) return;
		if (!this.total) {
			this.notify({ key: 'toast.export_empty', icon: 'info' });
			return;
		}
		if (rangeInvalid(this.filters)) return;
		this.exporting = true;
		try {
			const response = await fetch(this.exportHref);
			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as {
					error?: { code?: string; details?: { max_rows?: number } };
				} | null;
				const code = body?.error?.code ?? '';
				if (code === 'export_too_large') {
					this.notify({
						key: 'errors.export_too_large',
						params: { max: body?.error?.details?.max_rows ?? 0 },
						icon: 'error'
					});
				} else this.#notifyFailure(code, response.status === 403 ? 'forbidden' : 'unavailable');
				return;
			}
			const blob = await response.blob();
			const disposition = response.headers.get('content-disposition') ?? '';
			const name =
				FILENAME_PATTERN.exec(disposition)?.[1] ?? `${EXPORT_FALLBACK_NAME}-${todayWib()}.csv`;
			const href = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = href;
			link.download = name;
			document.body.appendChild(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(href), TOAST_MS);
			this.notify({ key: 'toast.exported', params: { count: this.total }, icon: 'download' });
		} catch {
			this.#notifyFailure('', 'unavailable');
		} finally {
			this.exporting = false;
		}
	}

	notify(notice: AuditNotice) {
		this.notice = notice;
		clearTimeout(this.#toastTimer);
		this.#toastTimer = setTimeout(() => (this.notice = null), TOAST_MS);
	}

	dispose() {
		clearTimeout(this.#searchTimer);
		clearTimeout(this.#toastTimer);
	}

	#notifyFailure(code: string, reason: string) {
		this.notify({
			key: code === 'invalid_filter' ? 'errors.invalid_filter' : `failure.${reason}`,
			icon: 'error'
		});
	}

	#setList(list: AuditList, append: boolean) {
		this.items = append ? [...this.items, ...list.items] : list.items;
		this.total = list.total;
		this.nextBefore = list.next_before ?? null;
		this.actors = list.actors;
		this.modules = list.modules;
		if (!this.items.some((x) => x.id === this.selectedId))
			this.selectedId = this.items[0]?.id ?? '';
	}

	#syncUrl() {
		const query = filtersToQuery(this.filters).toString();
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- path sudah lewat resolve(); hanya query filter
		replaceState(`${resolve(APP_PATHS.PLATFORM_AUDIT)}${query ? `?${query}` : ''}`, {});
	}
}
