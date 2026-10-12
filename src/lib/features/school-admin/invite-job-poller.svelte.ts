import type { SchoolInviteJob } from '$lib/api/generated/lms';
import { runPageAction } from '$lib/utils/page-action';
import { failureMessage } from './school-admin.model';

type Translate = (key: string, params?: Readonly<Record<string, string | number>>) => string;

const POLL_MS = 2000;
const MAX_BACKOFF_MS = 30000;
/** Polling berhenti setelah sekian kegagalan beruntun (backend/jaringan bermasalah). */
const MAX_CONSECUTIVE_FAILURES = 5;
const FINAL: readonly string[] = ['succeeded', 'failed'];

export const isFinalJob = (job: SchoolInviteJob | undefined) =>
	Boolean(job && FINAL.includes(job.status));

export interface InviteJobPollerDeps {
	/** Getter props `jobIds` (ganti id → komponen di-remount lewat `{#key}`). */
	jobIds: () => readonly string[];
	/** Dipanggil sekali saat semua job selesai (berhasil/gagal). */
	ondone: () => void;
	/** `i18n.t` (kunci penuh). */
	t: Translate;
}

/**
 * Polling status job undangan massal (> 50 akun diproses worker) lewat action `inviteJob`:
 * tiap ~2 detik, backoff eksponensial saat gagal, berhenti setelah 5 kegagalan beruntun atau
 * semua job selesai. `start()` dipanggil saat mount dan mengembalikan fungsi pembersih timer.
 */
export class InviteJobPoller {
	readonly #deps: InviteJobPollerDeps;

	jobs = $state<Record<string, SchoolInviteJob>>({});
	pollError = $state('');
	pollStopped = $state(false);

	list = $derived(this.#ids.map((id) => ({ id, job: this.jobs[id] })));
	finished = $derived(this.#ids.length > 0 && this.#ids.every((id) => isFinalJob(this.jobs[id])));
	codes = $derived(
		this.#ids.flatMap((id) => (this.jobs[id]?.status === 'succeeded' ? this.jobs[id].codes : []))
	);

	constructor(deps: InviteJobPollerDeps) {
		this.#deps = deps;
	}

	get #ids() {
		return this.#deps.jobIds();
	}

	start(): () => void {
		const ids = [...this.#ids];
		let stopped = false;
		let delay = POLL_MS;
		let failures = 0;
		let timer: ReturnType<typeof setTimeout> | undefined;

		const tick = async () => {
			const pending = ids.filter((id) => !isFinalJob(this.jobs[id]));
			const outs = await Promise.all(
				pending.map((id) => runPageAction<SchoolInviteJob>('inviteJob', { id }))
			);
			if (stopped) return;
			let failedOut = '';
			outs.forEach((out, i) => {
				const id = pending[i];
				if (out.ok && out.data && id) this.jobs[id] = out.data;
				else if (!out.ok) failedOut = failureMessage(this.#deps.t, out);
			});
			this.pollError = failedOut;
			delay = failedOut ? Math.min(delay * 2, MAX_BACKOFF_MS) : POLL_MS;
			failures = failedOut ? failures + 1 : 0;
			if (ids.every((id) => isFinalJob(this.jobs[id]))) {
				this.#deps.ondone();
				return;
			}
			if (failures >= MAX_CONSECUTIVE_FAILURES) {
				this.pollStopped = true;
				return;
			}
			timer = setTimeout(tick, delay);
		};

		if (ids.length) void tick();
		return () => {
			stopped = true;
			clearTimeout(timer);
		};
	}
}
