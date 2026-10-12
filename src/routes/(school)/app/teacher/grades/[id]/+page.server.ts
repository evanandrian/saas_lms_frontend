import { fetchGradeSheet } from '$lib/features/school-admin/school-admin.api';
import { gradeActions, loadView, validId } from '$lib/features/school-admin/school-admin.server';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/** Lembar nilai akhir satu penugasan (kelas × mapel): isi, simpan sebagian, lalu kunci. */
export const load: PageServerLoad = (event) => {
	if (!validId(event.params.id)) error(404);
	return loadView(event, (ctx) => fetchGradeSheet(ctx, event.params.id));
};

export const actions: Actions = gradeActions;
