import { dev } from '$app/environment';
import type { TeacherDashboardData } from './teacher-dashboard';
import type { PageServerLoad } from './$types';

/**
 * Sumber data asli dashboard guru. Backend belum menyediakan endpoint (kontrak OpenAPI BLOCKED-01);
 * isi fungsi ini lewat feature API ketika kontrak tersedia — jangan menebak URL/bentuk respons.
 */
async function loadTeacherDashboardFromApi(): Promise<TeacherDashboardData | null> {
	return null;
}

export const load: PageServerLoad = async () => {
	const live = await loadTeacherDashboardFromApi();
	// Data referensi hanya cadangan saat dev (FE-04 D2); produksi tanpa data → status kosong.
	const dashboard =
		live ?? (dev ? (await import('./teacher.fixture')).teacherDashboardFixture : null);
	return {
		dashboard,
		// Aksi (lobi, penilaian, remedial) disimulasikan lokal hanya untuk data contoh saat dev (D6).
		canSimulate: dev && live === null
	};
};
