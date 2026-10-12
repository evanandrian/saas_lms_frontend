import { fetchAttendance } from '$lib/features/school-admin/school-admin.api';
import { attendanceActions, loadView } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 05f Presensi: pantau kelas yang sudah/belum mengisi dan rekap semester (attendance_t). */
export const load: PageServerLoad = (event) => {
	const mode = event.url.searchParams.get('mode') === 'semester' ? 'semester' : 'day';
	const raw = event.url.searchParams.get('date') ?? '';
	const date = DATE_PATTERN.test(raw) ? raw : '';
	return loadView(event, (ctx) => fetchAttendance(ctx, mode, date));
};

export const actions: Actions = attendanceActions;
