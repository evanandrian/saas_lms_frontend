import { fetchPlanning } from '$lib/features/school-admin/school-admin.api';
import { extrasPageActions, loadView } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

/** Ekstrakurikuler: data ekskul (perencanaan) + anggota per tahun ajaran aktif. */
export const load: PageServerLoad = async (event) => {
	const { view, failure } = await loadView(event, fetchPlanning);
	return { planning: view, failure };
};
export const actions: Actions = extrasPageActions;
