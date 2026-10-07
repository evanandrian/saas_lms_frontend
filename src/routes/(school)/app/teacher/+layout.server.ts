import { dev } from '$app/environment';
import { loadAreaViews } from '$lib/features/dashboards/dashboards.server';
import { loadWorkspace } from '$lib/features/workspace/workspace.server';
import { APP_PATHS } from '$lib/utils/app-paths';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const devViews = dev
		? (await import('$lib/auth/dev-session.fixture')).devDashboardViews(event.cookies)
		: null;
	return {
		// Kartu lembaga/user, sapaan dashboard, dan badge menu dari backend.
		workspace: await loadWorkspace(event, 'teacher'),
		// Toggle Guru mapel ↔ Wali kelas hanya untuk peran HOMEROOM_TEACHER (dari backend).
		...(await loadAreaViews(
			event,
			'teacher',
			{ teacher: APP_PATHS.TEACHER_HOME, homeroom: APP_PATHS.HOMEROOM_HOME },
			devViews
		))
	};
};
