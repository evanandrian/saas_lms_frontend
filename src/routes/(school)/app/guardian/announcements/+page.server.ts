import {
	announcementFeedActions,
	loadFeed
} from '$lib/features/announcements/announcements.server';
import type { Actions, PageServerLoad } from './$types';

/** Pengumuman sekolah untuk orang tua: feed backend (sekolah, tingkat & kelas anak); tanpa data contoh. */
export const load: PageServerLoad = (event) => loadFeed(event);

export const actions: Actions = announcementFeedActions;
