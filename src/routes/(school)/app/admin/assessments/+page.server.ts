import { fetchPlanning } from '$lib/features/school-admin/school-admin.api';
import { assessmentsPageActions, loadView } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

/** Jenis asesmen, bobot, agregasi, dan pembulatan kebijakan penilaian. */
export const load: PageServerLoad = async (event) => {
	const { view, failure } = await loadView(event, fetchPlanning);
	return { planning: view, failure };
};
export const actions: Actions = assessmentsPageActions;
