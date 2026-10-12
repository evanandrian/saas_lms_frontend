import { fetchHomeroomReport } from '$lib/features/school-admin/school-admin.api';
import { homeroomReportActions, loadView } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

/** Rapor kelas perwalian: catatan wali kelas per murid lalu pengajuan ke kepala sekolah. */
export const load: PageServerLoad = (event) => loadView(event, fetchHomeroomReport);

export const actions: Actions = homeroomReportActions;
