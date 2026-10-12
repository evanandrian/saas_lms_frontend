import { fetchHomeroomAttendance } from '$lib/features/school-admin/school-admin.api';
import {
	homeroomAttendanceActions,
	loadView
} from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Input presensi harian wali kelas (SAD: satu catatan per murid/kelas/tanggal, zona waktu sekolah). */
export const load: PageServerLoad = (event) => {
	const raw = event.url.searchParams.get('date') ?? '';
	return loadView(event, (ctx) => fetchHomeroomAttendance(ctx, DATE_PATTERN.test(raw) ? raw : ''));
};

export const actions: Actions = homeroomAttendanceActions;
