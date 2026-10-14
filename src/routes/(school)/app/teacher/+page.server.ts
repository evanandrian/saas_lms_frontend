import { dev } from '$app/environment';
import { throwIfTenantMaintenance } from '$lib/api/tenant-maintenance';
import { loadTeacher } from '$lib/features/dashboards/dashboards.api';
import { dashboardsContext, homeRedirect } from '$lib/features/dashboards/dashboards.server';
import { DEFAULT_LOCALE, translate } from '$lib/i18n';
import { APP_PATHS } from '$lib/utils/app-paths';
import { jakartaSecondsOfDay } from '$lib/utils/clock';
import { redirect } from '@sveltejs/kit';
import { teacherDashboardFromApi, type AgendaKind } from './teacher-dashboard';
import type { PageServerLoad } from './$types';

const SECONDS_PER_MINUTE = 60;
const JAKARTA_TIME_ZONE = 'Asia/Jakarta';
const AGENDA_KINDS: readonly AgendaKind[] = ['done', 'open', 'next', 'later'];

const t = (key: string) => translate(DEFAULT_LOCALE, `dashboard.teacher.${key}`);

/**
 * Dashboard guru mapel (referensi layar 06 + panel mapel). Data asli dari backend: tanggal & jam nyata,
 * semester, agenda mengajar hari ini, dan buku nilai (nilai akhir per penugasan). Bagian tanpa modul
 * backend (sesi ujian/lobi, tumpukan koreksi, panel RPP/bank soal/analisis butir) kosong di produksi;
 * data contoh berlabel hanya di dev (aturan FE-04 D2, keputusan pemilik produk 14 Okt 2026).
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
	throwIfTenantMaintenance(result);
	const live = result.ok ? result.data : null;
	// Panel mapel (jadwal pekan, RPP, bank soal, analisis butir) belum punya modul backend: contoh di dev saja.
	const panels = dev ? (await import('./teacher-panels.sample')).teacherPanelsSample : null;

	if (live) {
		const nowMinutes = Math.floor(jakartaSecondsOfDay(Date.now()) / SECONDS_PER_MINUTE);
		// Backend lama belum mengirim `date`: tanggal hari ini (WIB) agar halaman tetap tampil saat rollout.
		const today =
			live.date || new Date().toLocaleDateString('en-CA', { timeZone: JAKARTA_TIME_ZONE });
		const dashboard = teacherDashboardFromApi({ ...live, date: today }, nowMinutes, '', {
			status: Object.fromEntries(
				AGENDA_KINDS.map((kind) => [kind, t(`agenda_status_${kind}`)])
			) as Record<AgendaKind, string>,
			finalScoreCode: t('final_score_code'),
			finalScoreName: t('final_score')
		});
		return {
			live,
			dashboard,
			panels,
			classCount: new Set((live.gradebook ?? []).map((item) => item.class_name)).size,
			sample: false,
			canSimulate: false
		};
	}

	// Backend tidak menjawab: data contoh berlabel hanya di dev; produksi → status "data belum tersedia".
	const fixture = dev ? (await import('./teacher.fixture')).teacherDashboardFixture : null;
	return {
		live: null,
		dashboard: fixture,
		panels,
		classCount: panels?.classCount ?? 0,
		sample: fixture !== null,
		// Aksi pada data contoh (lobi, penilaian, remedial) disimulasikan lokal.
		canSimulate: fixture !== null
	};
};
