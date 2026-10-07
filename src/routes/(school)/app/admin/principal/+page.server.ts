import { loadPrincipal } from '$lib/features/dashboards/dashboards.api';
import { dashboardsContext, enterView } from '$lib/features/dashboards/dashboards.server';
import { APP_PATHS } from '$lib/utils/app-paths';
import type { PageServerLoad } from './$types';

/**
 * Dashboard kepala sekolah (referensi layar 05b). Bagian dengan sumber data (identitas, periode,
 * pengajuan, langganan, jumlah guru/murid) dari backend; bagian lain `null` → data contoh berlabel.
 */
export const load: PageServerLoad = async (event) => {
	const { views } = await event.parent();
	enterView(event, 'school_admin', views, 'principal', APP_PATHS.SCHOOL_ADMIN_HOME);
	const result = await loadPrincipal(dashboardsContext(event));
	return { live: result.ok ? result.data : null };
};
