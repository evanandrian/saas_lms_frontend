import { fetchTeacherGrades } from '$lib/features/school-admin/school-admin.api';
import { loadView } from '$lib/features/school-admin/school-admin.server';
import type { PageServerLoad } from './$types';

/** Daftar penugasan mengajar guru (kelas × mapel) di semester aktif untuk input nilai akhir rapor. */
export const load: PageServerLoad = (event) => loadView(event, fetchTeacherGrades);
