import { fetchGuardians } from '$lib/features/school-admin/school-admin.api';
import { guardiansActions, loadView } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

/** 05e Orang tua: wali yang terhubung ke murid (guardian_m, student_guardian_m). */
export const load: PageServerLoad = (event) => loadView(event, fetchGuardians);

export const actions: Actions = guardiansActions;
