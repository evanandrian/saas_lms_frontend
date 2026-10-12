import type { Environment } from 'vitest/runtime';

/**
 * Lingkungan uji Node dengan transform Vite `client`: modul `.svelte.ts` dikompilasi mode klien
 * (rune reaktif & `$effect` berjalan) tanpa DOM. Mode SSR bawaan `node` membuat `$derived`
 * dihitung ulang tiap akses sehingga transisi state class tidak teruji sesuai perilaku browser.
 * Dipakai proyek `client` di vitest.config.ts untuk berkas uji berakhiran `.svelte.test.ts`.
 */
const clientNode: Environment = {
	name: 'client-node',
	viteEnvironment: 'client',
	setup() {
		return { teardown() {} };
	}
};

export default clientNode;
