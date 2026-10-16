import { dev } from '$app/environment';
import { loadAreaViews } from '$lib/features/dashboards/dashboards.server';
import { loadRoleShell } from '$lib/features/navigation/role-shell.server';
import { APP_PATHS } from '$lib/utils/app-paths';
import type { LayoutServerLoad } from './$types';
import { teacherSidebarRole } from './teacher-nav';

export const load: LayoutServerLoad = async (event) => {
	const devViews = dev
		? (await import('$lib/auth/dev-session.fixture')).devDashboardViews(event.cookies)
		: null;
	// Toggle Guru mapel ↔ Wali kelas hanya untuk peran HOMEROOM_TEACHER (dari backend).
	const areaViews = await loadAreaViews(
		event,
		'teacher',
		{ teacher: APP_PATHS.TEACHER_HOME, homeroom: APP_PATHS.HOMEROOM_HOME },
		devViews
	);
	// `depends` didaftarkan di dalam helper; urutannya terhadap `loadAreaViews` tidak berpengaruh.
	const shell = await loadRoleShell(event, {
		sidebarRole: teacherSidebarRole(areaViews.activeView),
		area: 'teacher'
	});
	return { ...shell, ...areaViews };
};
