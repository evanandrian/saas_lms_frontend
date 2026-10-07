import { dev } from '$app/environment';
import { homeRedirect } from '$lib/features/dashboards/dashboards.server';
import { APP_PATHS } from '$lib/utils/app-paths';
import { redirect } from '@sveltejs/kit';
import type { SchoolDashboardData } from './school-dashboard';
import type { PageServerLoad } from './$types';

/**
 * Sumber data asli dashboard sekolah. Backend belum menyediakan endpoint (kontrak OpenAPI BLOCKED-01);
 * isi fungsi ini lewat feature API ketika kontrak tersedia — jangan menebak URL/bentuk respons.
 */
async function loadSchoolDashboardFromApi(): Promise<SchoolDashboardData | null> {
	return null;
}

export const load: PageServerLoad = async (event) => {
	// Kepala sekolah mendarat di dashboard kepala sekolah kecuali memilih "Admin sekolah" di toggle.
	const { views, dashboardContext } = await event.parent();
	const defaultView = dashboardContext?.default_view ?? views[0];
	const target = homeRedirect(
		event,
		'school_admin',
		defaultView ? { views, default_view: defaultView } : null,
		'school_admin',
		{ principal: APP_PATHS.PRINCIPAL_HOME }
	);
	if (target) redirect(303, target);

	const live = await loadSchoolDashboardFromApi();
	// Data referensi hanya cadangan saat dev (FE-04 D2); produksi tanpa data → status kosong.
	const dashboard =
		live ?? (dev ? (await import('./school.fixture')).schoolDashboardFixture : null);
	return {
		dashboard,
		// Pengingat presensi & centang tindak lanjut disimulasikan lokal hanya untuk data contoh saat dev (D6).
		canSimulate: dev && live === null
	};
};
