import {
	applicationActions,
	loadApplicationsPage
} from '$lib/features/tenant-applications/tenant-applications.server';
import type { Actions, PageServerLoad } from './$types';

/** Pengajuan lembaga (referensi "04c Pengajuan Tenant"); antrean & keputusan dari backend. */
export const load: PageServerLoad = (event) => loadApplicationsPage(event);

export const actions: Actions = applicationActions;
