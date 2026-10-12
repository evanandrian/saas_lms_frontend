import { fetchActivation } from '$lib/features/school-admin/school-admin.api';
import { activationActions, loadView } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

/** Aktivasi trial → berbayar (referensi "03 Onboarding Berlangganan", SAD F12). */
export const load: PageServerLoad = (event) => loadView(event, fetchActivation);

export const actions: Actions = activationActions;
