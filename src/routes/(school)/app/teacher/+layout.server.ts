import { dev } from '$app/environment';
import { loadAreaViews } from '$lib/features/dashboards/dashboards.server';
import { loadSidebarGroups } from '$lib/features/navigation/navigation.sidebar';
import { loadWorkspace } from '$lib/features/workspace/workspace.server';
import { APP_PATHS } from '$lib/utils/app-paths';
import type { LayoutServerLoad } from './$types';
import { teacherSidebarRole } from './teacher-nav';

export const load: LayoutServerLoad = async (event) => {
	// Sidebar disusun di halaman Menu & navigasi platform; disimpan ulang -> `invalidate('app:navigation')`.
	event.depends('app:navigation');
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
	const [navigation, workspace] = await Promise.all([
		// Backend tak terjangkau -> susunan bawaan FLIXARE agar sidebar tetap tampil.
		loadSidebarGroups(
			{ fetch: event.fetch, cookies: event.cookies },
			teacherSidebarRole(areaViews.activeView)
		),
		// Kartu lembaga/user, sapaan dashboard, dan badge menu dari backend.
		loadWorkspace(event, 'teacher')
	]);
	return { navigation, workspace, ...areaViews };
};
