import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

/**
 * Konfigurasi test unit (P0-1.3): modul server `$lib/auth/*` dengan alias & env SvelteKit.
 * `environment: 'node'` — tanpa DOM; interaksi backend disimulasikan lewat stub `fetch`.
 */
export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts'],
		restoreMocks: true
	}
});
