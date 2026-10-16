import { dev } from '$app/environment';
import { combinedPending } from '$lib/features/announcements/announcements.model';
import { loadPendingAnnouncements } from '$lib/features/announcements/announcements.server';
import { pendingApprovals, type ApprovalArea } from '$lib/features/approvals/approvals.server';
import { loadAreaViews } from '$lib/features/dashboards/dashboards.server';
import type { NavigationRole } from '$lib/features/navigation/navigation.model';
import { loadSidebarGroups } from '$lib/features/navigation/navigation.sidebar';
import { loadProgress } from '$lib/features/school-admin/school-admin.server';
import { loadWorkspace } from '$lib/features/workspace/workspace.server';
import { APP_PATHS } from '$lib/utils/app-paths';
import type { LayoutServerLoad } from './$types';

const APPROVALS_AREA: ApprovalArea = 'school_admin';

export const load: LayoutServerLoad = async (event) => {
	// Badge menu "Persetujuan" = pengajuan menunggu di kotak peninjau ini (null bila bukan peninjau)
	// + pengumuman menunggu untuk kepala sekolah (Fase 3).
	event.depends('app:approvals');
	// Sidebar disusun di halaman Menu & navigasi platform; disimpan ulang -> `invalidate('app:navigation')`.
	event.depends('app:navigation');
	const devViews = dev
		? (await import('$lib/auth/dev-session.fixture')).devDashboardViews(event.cookies)
		: null;
	// Toggle Kepala sekolah <-> Admin sekolah hanya untuk peran PRINCIPAL (dari backend).
	const areaViews = await loadAreaViews(
		event,
		'school_admin',
		{ principal: APP_PATHS.PRINCIPAL_HOME, school_admin: APP_PATHS.SCHOOL_ADMIN_HOME },
		devViews
	);
	// Susunan sidebar mengikuti tampilan aktif: kepala sekolah punya area menu sendiri.
	const sidebarRole: NavigationRole =
		areaViews.activeView === 'principal' ? 'principal' : 'school_admin';
	const [navigation, pending, announcements, workspace, schoolProgress] = await Promise.all([
		// Backend tak terjangkau -> susunan bawaan FLIXARE agar sidebar tetap tampil.
		loadSidebarGroups({ fetch: event.fetch, cookies: event.cookies }, sidebarRole),
		pendingApprovals(event, APPROVALS_AREA),
		loadPendingAnnouncements(event, areaViews.views.includes('principal')),
		// Kartu lembaga/user & sapaan dashboard dari backend.
		loadWorkspace(event, 'school_admin'),
		// Status 12 bagian data sekolah: banner celah data per halaman & titik menu sidebar.
		loadProgress(event)
	]);
	return {
		navigation,
		workspace,
		schoolProgress,
		pendingApprovals: combinedPending(pending, announcements?.length ?? null),
		// Daftar pengumuman menunggu (kepala sekolah) dipakai ulang Kotak Persetujuan — tanpa ambil ulang.
		pendingAnnouncements: announcements,
		...areaViews
	};
};
