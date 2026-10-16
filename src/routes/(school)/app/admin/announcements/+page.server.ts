import {
	fetchAnnouncements,
	fetchAudienceOptions
} from '$lib/features/announcements/announcements.api';
import { announcementAdminActions } from '$lib/features/announcements/announcements.server';
import { loadView } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

/** Pengumuman (Admin Sekolah Fase 3): daftar semua status + opsi sasaran tahun ajaran aktif. */
export const load: PageServerLoad = async (event) => {
	const [list, options] = await Promise.all([
		loadView(event, (ctx) => fetchAnnouncements(ctx, undefined, '')),
		loadView(event, fetchAudienceOptions)
	]);
	return { view: list.view, options: options.view, failure: list.failure ?? options.failure };
};

export const actions: Actions = announcementAdminActions;
