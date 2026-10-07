import type { AccountOverview } from '$lib/api/generated/lms';
import type { LucideIcon } from '@lucide/svelte';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import { runAccountAction, type ActionOutcome } from './account.client';
import type { AccountTab } from './account.model';

const TOAST_MS = 5000;
const TICK_MS = 1000;

/** Dialog konfirmasi (referensi `confirm`). */
export type ConfirmKind = 'tfa' | 'sessions' | 'delete' | `unlink:${'google' | 'belajar'}`;

/**
 * State bersama halaman Pengaturan Akun. Setiap aksi ubah mengembalikan overview terbaru dari
 * backend lalu diterapkan di sini, sehingga tampilan selalu sama dengan data tersimpan.
 */
export class AccountPageState {
	overview = $state<AccountOverview>() as AccountOverview;
	tab = $state<AccountTab>('profile');
	toast = $state<{ text: string; icon: LucideIcon } | null>(null);
	confirm = $state<ConfirmKind | null>(null);
	/** Detik berjalan untuk hitung mundur kirim ulang. */
	now = $state(Date.now());
	#toastTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(overview: AccountOverview, tab: AccountTab) {
		this.overview = overview;
		this.tab = tab;
	}

	/** Memulai detak 1 detik (dipanggil dari `$effect` komponen; mengembalikan pembersih). */
	start(): () => void {
		const interval = setInterval(() => (this.now = Date.now()), TICK_MS);
		return () => {
			clearInterval(interval);
			clearTimeout(this.#toastTimer);
		};
	}

	say(text: string, icon: LucideIcon = CircleCheck) {
		clearTimeout(this.#toastTimer);
		this.toast = { text, icon };
		this.#toastTimer = setTimeout(() => (this.toast = null), TOAST_MS);
	}

	apply(overview: AccountOverview | undefined) {
		if (overview) this.overview = overview;
	}

	/** Aksi yang mengembalikan overview. */
	async run(name: string, body?: unknown): Promise<ActionOutcome<AccountOverview>> {
		const outcome = await runAccountAction<AccountOverview>(name, body);
		if (outcome.ok) this.apply(outcome.data);
		return outcome;
	}

	call<T>(name: string, body?: unknown): Promise<ActionOutcome<T>> {
		return runAccountAction<T>(name, body);
	}
}
