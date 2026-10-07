import { runPageAction, type PageActionOutcome } from '$lib/utils/page-action';

/** Hasil aksi form Pengaturan Akun di browser. */
export type ActionOutcome<T> = PageActionOutcome<T>;

/** Memanggil form action halaman Pengaturan Akun (`?/<nama>`); tidak memanggil API backend langsung. */
export const runAccountAction = <T>(name: string, body?: unknown): Promise<ActionOutcome<T>> =>
	runPageAction<T>(name, body);
