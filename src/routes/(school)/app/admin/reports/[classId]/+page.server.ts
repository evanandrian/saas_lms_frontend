import { fetchClassReport } from '$lib/features/school-admin/school-admin.api';
import {
	classReportActions,
	loadView,
	validId
} from '$lib/features/school-admin/school-admin.server';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/** 05g Rapor (tinjauan kelas): setujui, kembalikan, kunci + PDF, buka kunci; izin per peran dari backend. */
export const load: PageServerLoad = (event) => {
	if (!validId(event.params.classId)) error(404);
	return loadView(event, (ctx) => fetchClassReport(ctx, event.params.classId));
};

export const actions: Actions = classReportActions;
