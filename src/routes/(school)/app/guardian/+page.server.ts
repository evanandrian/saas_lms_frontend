import { dev } from '$app/environment';
import { loadFeed } from '$lib/features/announcements/announcements.server';
import type { GuardianDashboardData } from './guardian-dashboard';
import type { PageServerLoad } from './$types';

/**
 * Sumber data asli dashboard orang tua. Backend belum menyediakan endpoint (kontrak OpenAPI BLOCKED-01);
 * isi fungsi ini lewat feature API ketika kontrak tersedia — jangan menebak URL/bentuk respons.
 */
async function loadGuardianDashboardFromApi(): Promise<GuardianDashboardData | null> {
	return null;
}

export const load: PageServerLoad = async (event) => {
	const [live, { feed }] = await Promise.all([loadGuardianDashboardFromApi(), loadFeed(event)]);
	// Data referensi hanya cadangan saat dev (FE-04 D2); produksi tanpa data → status kosong.
	const dashboard =
		live ?? (dev ? (await import('./guardian.fixture')).guardianDashboardFixture : null);
	return {
		dashboard,
		// Pengumuman sekolah selalu dari backend (bukan fixture); gagal → kartu menampilkan galat.
		feed,
		// "Sudah saya ingatkan" & balasan buku penghubung disimulasikan lokal hanya untuk data contoh saat dev (D6).
		canSimulate: dev && live === null
	};
};
