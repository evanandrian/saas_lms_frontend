import { dev } from '$app/environment';
import { loadAreaViews } from '$lib/features/dashboards/dashboards.server';
import { APP_PATHS } from '$lib/utils/app-paths';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const fixtures = dev ? (await import('../workspace.fixture')).schoolIdentityFixtures : null;
	const devViews = dev
		? (await import('$lib/auth/dev-session.fixture')).devDashboardViews(event.cookies)
		: null;
	return {
		// Identitas dari sesi menunggu kontrak auth (BLOCKED-02); data contoh hanya di dev (FE-04 D2).
		identity: fixtures?.teacher ?? null,
		homeroomIdentity: fixtures?.homeroom ?? null,
		// Toggle Guru mapel ↔ Wali kelas hanya untuk peran HOMEROOM_TEACHER (dari backend).
		...(await loadAreaViews(
			event,
			'teacher',
			{ teacher: APP_PATHS.TEACHER_HOME, homeroom: APP_PATHS.HOMEROOM_HOME },
			devViews
		))
	};
};
