import { dev } from '$app/environment';
import { pendingApprovals, type ApprovalArea } from '$lib/features/approvals/approvals.server';
import { loadAreaViews } from '$lib/features/dashboards/dashboards.server';
import { APP_PATHS } from '$lib/utils/app-paths';
import type { LayoutServerLoad } from './$types';

const APPROVALS_AREA: ApprovalArea = 'school_admin';

export const load: LayoutServerLoad = async (event) => {
	// Badge menu "Persetujuan" = pengajuan menunggu di kotak peninjau ini (null bila bukan peninjau).
	event.depends('app:approvals');
	const devViews = dev
		? (await import('$lib/auth/dev-session.fixture')).devDashboardViews(event.cookies)
		: null;
	const [areaViews, pending] = await Promise.all([
		// Toggle Kepala sekolah ↔ Admin sekolah hanya untuk peran PRINCIPAL (dari backend).
		loadAreaViews(
			event,
			'school_admin',
			{ principal: APP_PATHS.PRINCIPAL_HOME, school_admin: APP_PATHS.SCHOOL_ADMIN_HOME },
			devViews
		),
		pendingApprovals(event, APPROVALS_AREA)
	]);
	return {
		// Identitas dari sesi menunggu kontrak auth (BLOCKED-02); data contoh hanya di dev (FE-04 D2).
		identity: dev ? (await import('../workspace.fixture')).schoolIdentityFixtures.admin : null,
		principalIdentity: dev
			? (await import('../workspace.fixture')).schoolIdentityFixtures.principal
			: null,
		pendingApprovals: pending,
		...areaViews
	};
};
