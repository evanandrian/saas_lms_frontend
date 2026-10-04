import { dev } from '$app/environment';
import type { PlatformDashboardData } from './platform-dashboard';
import type { PageServerLoad } from './$types';

/**
 * Sumber data asli dashboard platform. Backend belum menyediakan endpoint (kontrak OpenAPI BLOCKED-01);
 * isi fungsi ini lewat feature API ketika kontrak tersedia — jangan menebak URL/bentuk respons.
 */
async function loadPlatformDashboardFromApi(): Promise<PlatformDashboardData | null> {
	return null;
}

export const load: PageServerLoad = async () => {
	const live = await loadPlatformDashboardFromApi();
	// Data referensi hanya cadangan saat dev (FE-04 D2); produksi tanpa data → status kosong.
	const dashboard =
		live ?? (dev ? (await import('./platform.fixture')).platformDashboardFixture : null);
	return {
		dashboard,
		// Setujui/Tolak/Urungkan disimulasikan lokal hanya untuk data contoh saat dev (D6).
		canSimulate: dev && live === null
	};
};
