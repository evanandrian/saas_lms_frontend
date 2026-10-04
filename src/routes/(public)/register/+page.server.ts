import { dev } from '$app/environment';
import { assertHostKind } from '$lib/utils/host-context';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Pendaftaran lembaga hanya di host publik (SAD Bagian III §5.1).
	assertHostKind(locals.host, ['public', 'unified']);
	// Data referensi pendaftaran dari API kelak (BLOCKED-01); data contoh hanya saat dev (FE-04 D2).
	return { onboarding: dev ? (await import('./onboarding.fixture')).registerFixture : null };
};
