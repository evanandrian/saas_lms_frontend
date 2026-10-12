import { fetchTeachers } from '$lib/features/school-admin/school-admin.api';
import { loadView, teachersActions } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

/** 05c Guru: data guru, akun, dan penugasan mengajar (teacher_m). */
export const load: PageServerLoad = (event) => loadView(event, fetchTeachers);

export const actions: Actions = teachersActions;
