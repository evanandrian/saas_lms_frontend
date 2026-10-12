import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

/**
 * Konfigurasi test unit (P0-1.3): modul server `$lib/auth/*` dengan alias & env SvelteKit.
 * `environment: 'node'` — tanpa DOM; interaksi backend disimulasikan lewat stub `fetch`.
 * Proyek `client`: berkas `*.svelte.test.ts` (state class rune) dikompilasi mode klien agar
 * `$state`/`$derived`/`$effect` berperilaku seperti di browser (mode SSR menghitung ulang derived).
 */
const CLIENT_TESTS = 'tests/**/*.svelte.test.ts';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		restoreMocks: true,
		projects: [
			{
				extends: true,
				test: {
					name: 'server',
					environment: 'node',
					include: ['tests/**/*.test.ts'],
					exclude: [CLIENT_TESTS]
				}
			},
			{
				extends: true,
				test: {
					name: 'client',
					environment: './tests/support/client-environment.ts',
					include: [CLIENT_TESTS]
				}
			}
		]
	}
});
