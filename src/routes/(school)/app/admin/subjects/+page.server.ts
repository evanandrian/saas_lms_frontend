import { fetchPlanning, fetchSetup } from '$lib/features/school-admin/school-admin.api';
import { loadView, subjectsPageActions } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

/** Mapel & TP (subject_m, learning_objective_m): daftar & KKTP dari setup, TP dari perencanaan. */
export const load: PageServerLoad = async (event) => {
	const { view, failure } = await loadView(event, async (ctx) => {
		const [setup, planning] = await Promise.all([fetchSetup(ctx), fetchPlanning(ctx)]);
		if (!setup.ok) return setup;
		if (!planning.ok) return planning;
		return { ok: true as const, data: { setup: setup.data, planning: planning.data } };
	});
	return { setup: view?.setup ?? null, planning: view?.planning ?? null, failure };
};

export const actions: Actions = subjectsPageActions;
