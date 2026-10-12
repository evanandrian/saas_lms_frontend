import { homeRedirect } from '$lib/features/dashboards/dashboards.server';
import { fetchDashboard } from '$lib/features/school-admin/school-admin.api';
import { dashboardActions, loadView } from '$lib/features/school-admin/school-admin.server';
import { APP_PATHS } from '$lib/utils/app-paths';
import { greetingPeriod, jakartaSecondsOfDay } from '$lib/utils/clock';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/** Dashboard admin sekolah (referensi v4 "05 Dashboard Sekolah"): seluruh kartu dari backend. */
export const load: PageServerLoad = async (event) => {
	// Kepala sekolah mendarat di dashboard kepala sekolah kecuali memilih "Admin sekolah" di toggle.
	const { views, dashboardContext } = await event.parent();
	const defaultView = dashboardContext?.default_view ?? views[0];
	const target = homeRedirect(
		event,
		'school_admin',
		defaultView ? { views, default_view: defaultView } : null,
		'school_admin',
		{ principal: APP_PATHS.PRINCIPAL_HOME }
	);
	if (target) redirect(303, target);
	const loaded = await loadView(event, fetchDashboard);
	// Sapaan dari jam server (WIB) agar SSR dan hidrasi memakai periode yang sama.
	return { ...loaded, greetingKey: greetingPeriod(jakartaSecondsOfDay(Date.now())) };
};

export const actions: Actions = dashboardActions;
