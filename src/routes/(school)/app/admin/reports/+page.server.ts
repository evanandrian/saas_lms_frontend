import { fetchReports } from '$lib/features/school-admin/school-admin.api';
import { loadView, reportsActions } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

/** 05g Rapor: status rapor per kelas dihitung dari report_card_t semester aktif. */
export const load: PageServerLoad = (event) => loadView(event, fetchReports);

export const actions: Actions = reportsActions;
