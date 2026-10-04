import { dev } from '$app/environment';
import type { StudentDashboardData } from './student-dashboard';
import type { PageServerLoad } from './$types';

/**
 * Sumber data asli dashboard murid. Backend belum menyediakan endpoint (kontrak OpenAPI BLOCKED-01);
 * isi fungsi ini lewat feature API ketika kontrak tersedia — jangan menebak URL/bentuk respons.
 */
async function loadStudentDashboardFromApi(): Promise<StudentDashboardData | null> {
	return null;
}

export const load: PageServerLoad = async () => {
	const live = await loadStudentDashboardFromApi();
	// Data referensi hanya cadangan saat dev (FE-04 D2); produksi tanpa data → status kosong.
	const dashboard =
		live ?? (dev ? (await import('./student.fixture')).studentDashboardFixture : null);
	return {
		dashboard,
		// Centang tugas & mulai remedial disimulasikan lokal hanya untuk data contoh saat dev (D6).
		canSimulate: dev && live === null
	};
};
