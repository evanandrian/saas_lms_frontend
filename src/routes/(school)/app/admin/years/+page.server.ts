import { fetchYears } from '$lib/features/school-admin/school-admin.api';
import { loadView, yearsActions } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

/** 05a Tahun ajaran & semester (academic_year_m, semester_m). */
export const load: PageServerLoad = (event) => loadView(event, fetchYears);

export const actions: Actions = yearsActions;
