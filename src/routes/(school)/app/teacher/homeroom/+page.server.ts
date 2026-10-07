import { loadHomeroom } from '$lib/features/dashboards/dashboards.api';
import { dashboardsContext, enterView } from '$lib/features/dashboards/dashboards.server';
import { APP_PATHS } from '$lib/utils/app-paths';
import type { PageServerLoad } from './$types';

/**
 * Dashboard wali kelas (referensi layar 06b). Identitas, periode, dan kelas perwalian dari backend;
 * presensi, pengajuan orang tua, buku penghubung, nilai, rapor, jadwal, dan catatan perilaku belum
 * punya modul backend (`null`) → data contoh berlabel; aksinya disimulasikan lokal.
 */
export const load: PageServerLoad = async (event) => {
	const { views } = await event.parent();
	enterView(event, 'teacher', views, 'homeroom', APP_PATHS.TEACHER_HOME);
	const result = await loadHomeroom(dashboardsContext(event));
	return { live: result.ok ? result.data : null };
};
