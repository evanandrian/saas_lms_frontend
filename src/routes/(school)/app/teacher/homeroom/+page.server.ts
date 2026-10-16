import {
	announcementFeedActions,
	loadFeed
} from '$lib/features/announcements/announcements.server';
import { loadHomeroom } from '$lib/features/dashboards/dashboards.api';
import { dashboardsContext, enterView } from '$lib/features/dashboards/dashboards.server';
import { fetchHomeroomReport } from '$lib/features/school-admin/school-admin.api';
import { APP_PATHS } from '$lib/utils/app-paths';
import type { Actions, PageServerLoad } from './$types';

/**
 * Dashboard wali kelas (referensi layar 06b). Identitas, periode, dan kelas perwalian dari backend;
 * kartu rapor memakai status rapor kelas dari backend (gagal → `null`, kartu menampilkan "belum
 * tersedia"). Presensi, pengajuan orang tua, buku penghubung, nilai, jadwal, dan catatan perilaku
 * belum punya modul backend (`null`) → data contoh berlabel; aksinya disimulasikan lokal.
 */
export const load: PageServerLoad = async (event) => {
	const { views } = await event.parent();
	enterView(event, 'teacher', views, 'homeroom', APP_PATHS.TEACHER_HOME);
	const ctx = dashboardsContext(event);
	const [result, report, { feed }] = await Promise.all([
		loadHomeroom(ctx),
		fetchHomeroomReport(ctx),
		loadFeed(event)
	]);
	return { live: result.ok ? result.data : null, report: report.ok ? report.data : null, feed };
};

export const actions: Actions = announcementFeedActions;
