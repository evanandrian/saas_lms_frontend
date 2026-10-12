import { fetchLearnerReports } from '$lib/features/school-admin/school-admin.api';
import { loadView } from '$lib/features/school-admin/school-admin.server';
import type { PageServerLoad } from './$types';

/** Rapor anak untuk orang tua: rapor yang sudah terbit (terkunci) + status rapor semester berjalan. */
export const load: PageServerLoad = (event) => loadView(event, fetchLearnerReports);
