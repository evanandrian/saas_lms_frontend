import { dev } from '$app/environment';
import { assertHostKind } from '$lib/utils/host-context';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Peserta tamu ujian terbuka (SAD F11): host publik/tenant; dev memakai host gabungan.
	assertHostKind(locals.host, ['public', 'tenant', 'unified']);
	// Pencarian kode sesi dari API kelak (BLOCKED-01); data contoh hanya saat dev (pola FE-04 D2).
	return {
		sessions: dev ? (await import('./sessions.fixture')).tryoutSessionsFixture : null
	};
};
