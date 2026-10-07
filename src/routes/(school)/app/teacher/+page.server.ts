import { loadTeacher } from '$lib/features/dashboards/dashboards.api';
import { dashboardsContext, homeRedirect } from '$lib/features/dashboards/dashboards.server';
import { APP_PATHS } from '$lib/utils/app-paths';
import { redirect } from '@sveltejs/kit';
import { teacherDashboardFixture } from './teacher.fixture';
import { teacherPanelsSample } from './teacher-panels.sample';
import type { PageServerLoad } from './$types';

/**
 * Dashboard guru mapel (referensi layar 06 + panel mapel). Identitas & periode dari backend; agenda,
 * koreksi, buku nilai, jadwal, RPP, bank soal, dan analisis butir belum punya modul backend
 * (`null`) → data contoh berlabel di dev & produksi (keputusan pemilik produk 7 Okt 2026).
 */
export const load: PageServerLoad = async (event) => {
	// Wali kelas kembali ke tampilan terakhirnya (guru mapel / wali kelas) saat membuka beranda area.
	const { views, dashboardContext } = await event.parent();
	const defaultView = dashboardContext?.default_view ?? views[0];
	const target = homeRedirect(
		event,
		'teacher',
		defaultView ? { views, default_view: defaultView } : null,
		'teacher',
		{ homeroom: APP_PATHS.HOMEROOM_HOME }
	);
	if (target) redirect(303, target);

	const result = await loadTeacher(dashboardsContext(event));
	const live = result.ok ? result.data : null;
	return {
		live,
		dashboard: teacherDashboardFixture,
		panels: teacherPanelsSample,
		// Aksi pada bagian data contoh (lobi, penilaian, remedial, RPP, bank soal) disimulasikan lokal.
		canSimulate: true
	};
};
