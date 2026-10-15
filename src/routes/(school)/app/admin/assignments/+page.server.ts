import { fetchPlanning } from '$lib/features/school-admin/school-admin.api';
import { assignmentsPageActions, loadView } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

/** Penugasan mengajar (teaching_assignment_m) + beban JP dari jadwal (lesson_schedule_m). */
export const load: PageServerLoad = async (event) => {
	const { view, failure } = await loadView(event, fetchPlanning);
	return { planning: view, failure };
};
export const actions: Actions = assignmentsPageActions;
