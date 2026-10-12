import { dev } from '$app/environment';
import { pendingApprovals, type ApprovalArea } from '$lib/features/approvals/approvals.server';
import { loadAreaViews } from '$lib/features/dashboards/dashboards.server';
import { loadProgress } from '$lib/features/school-admin/school-admin.server';
import { loadWorkspace } from '$lib/features/workspace/workspace.server';
import { APP_PATHS } from '$lib/utils/app-paths';
import type { LayoutServerLoad } from './$types';

const APPROVALS_AREA: ApprovalArea = 'school_admin';

export const load: LayoutServerLoad = async (event) => {
	// Badge menu "Persetujuan" = pengajuan menunggu di kotak peninjau ini (null bila bukan peninjau).
	event.depends('app:approvals');
	const devViews = dev
		? (await import('$lib/auth/dev-session.fixture')).devDashboardViews(event.cookies)
		: null;
	const [areaViews, pending, workspace, schoolProgress] = await Promise.all([
		// Toggle Kepala sekolah ↔ Admin sekolah hanya untuk peran PRINCIPAL (dari backend).
		loadAreaViews(
			event,
			'school_admin',
			{ principal: APP_PATHS.PRINCIPAL_HOME, school_admin: APP_PATHS.SCHOOL_ADMIN_HOME },
			devViews
		),
		pendingApprovals(event, APPROVALS_AREA),
		// Kartu lembaga/user & sapaan dashboard dari backend.
		loadWorkspace(event, 'school_admin'),
		// Status 12 bagian data sekolah: banner celah data per halaman (referensi v4).
		loadProgress(event)
	]);
	return {
		workspace,
		schoolProgress,
		pendingApprovals: pending,
		...areaViews
	};
};
