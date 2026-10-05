import { defineConfig } from 'orval';

/**
 * Generated API client (ADR-021): kontrak ter-pin `contract/openapi.yaml` → `src/lib/api/generated/`.
 * Jalankan `pnpm api:generate`; CI `pnpm api:check` gagal bila hasil generate berbeda dari repo.
 */
export default defineConfig({
	lms: {
		input: { target: './contract/openapi.yaml' },
		output: {
			target: './src/lib/api/generated/lms.ts',
			client: 'fetch',
			mode: 'single',
			override: {
				mutator: { path: './src/lib/api/client.ts', name: 'lmsFetch' }
			}
		}
	}
});
