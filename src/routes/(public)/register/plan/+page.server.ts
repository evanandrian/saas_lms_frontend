import { dev } from '$app/environment';
import { assertHostKind } from '$lib/utils/host-context';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	assertHostKind(locals.host, ['public', 'unified']);
	// Data paket & ringkasan tagihan dari API kelak (BLOCKED-01); data contoh hanya saat dev (FE-04 D2).
	return { plan: dev ? (await import('../onboarding.fixture')).planFixture : null };
};
