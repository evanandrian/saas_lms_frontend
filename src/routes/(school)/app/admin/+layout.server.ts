import { dev } from '$app/environment';
import { pendingApprovals, type ApprovalArea } from '$lib/features/approvals/approvals.server';
import { loadAreaViews } from '$lib/features/dashboards/dashboards.server';
import { loadNavigationSidebar } from '$lib/features/navigation/navigation.api';
import { defaultNavigationLayout } from '$lib/features/navigation/navigation.defaults';
import { visibleGroups, type NavigationRole } from '$lib/features/navigation/navigation.model';
import { loadProgress } from '$lib/features/school-admin/school-admin.server';
import { loadWorkspace } from '$lib/features/workspace/workspace.server';
import { APP_PATHS } from '$lib/utils/app-paths';
import type { LayoutServerLoad } from './$types';

const APPROVALS_AREA: ApprovalArea = 'school_admin';

export const load: LayoutServerLoad = async (event) => {
	// Badge menu "Persetujuan" = pengajuan menunggu di kotak peninjau ini (null bila bukan peninjau).
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
	const [sidebar, pending, workspace, schoolProgress] = await Promise.all([
		loadNavigationSidebar({ fetch: event.fetch, cookies: event.cookies }, sidebarRole),
		pendingApprovals(event, APPROVALS_AREA),
		// Kartu lembaga/user & sapaan dashboard dari backend.
		loadWorkspace(event, 'school_admin'),
		// Status 12 bagian data sekolah: banner celah data per halaman & titik menu sidebar.
		loadProgress(event)
	]);
	return {
		// Backend tak terjangkau -> susunan bawaan FLIXARE agar sidebar tetap tampil.
		navigation: sidebar.ok
			? sidebar.layout.groups
			: visibleGroups(defaultNavigationLayout(sidebarRole).groups),
		workspace,
		schoolProgress,
		pendingApprovals: pending,
		...areaViews
	};
};
