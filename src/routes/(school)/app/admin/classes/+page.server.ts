import { fetchClasses } from '$lib/features/school-admin/school-admin.api';
import { classesActions, loadView } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

/** 05b Kelas: rombel tahun ajaran aktif dan wali kelas (class_m, class_homeroom_m). */
export const load: PageServerLoad = (event) => loadView(event, fetchClasses);

export const actions: Actions = classesActions;
