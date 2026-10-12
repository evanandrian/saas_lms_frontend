import { throwIfTenantMaintenance } from '$lib/api/tenant-maintenance';
import { loadPrincipal } from '$lib/features/dashboards/dashboards.api';
import { dashboardsContext, enterView } from '$lib/features/dashboards/dashboards.server';
import { fetchReports } from '$lib/features/school-admin/school-admin.api';
import { context } from '$lib/features/school-admin/school-admin.server';
import { APP_PATHS } from '$lib/utils/app-paths';
import type { PageServerLoad } from './$types';

/**
 * Dashboard kepala sekolah (referensi layar 05b). Bagian dengan sumber data (identitas, periode,
 * pengajuan, langganan, jumlah guru/murid, status rapor per kelas) dari backend; bagian lain
 * `null` → data contoh berlabel. Rapor gagal dimuat → `reports: null` (kartu rapor tampil error).
 */
export const load: PageServerLoad = async (event) => {
	const { views } = await event.parent();
	enterView(event, 'school_admin', views, 'principal', APP_PATHS.SCHOOL_ADMIN_HOME);
	const [result, reports] = await Promise.all([
		loadPrincipal(dashboardsContext(event)),
		fetchReports(context(event))
	]);
	throwIfTenantMaintenance(result);
	throwIfTenantMaintenance(reports);
	return {
		live: result.ok ? result.data : null,
		reports: reports.ok ? reports.data : null
	};
};
