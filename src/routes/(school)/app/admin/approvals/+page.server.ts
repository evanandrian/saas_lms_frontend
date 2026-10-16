import {
	announcementReviewActions,
	loadPendingAnnouncements
} from '$lib/features/announcements/announcements.server';
import {
	approvalsActions,
	loadApprovalsPage,
	type ApprovalArea
} from '$lib/features/approvals/approvals.server';
import type { Actions, PageServerLoad } from './$types';

/**
 * Kotak Persetujuan area `school_admin` (referensi "11 Kotak Persetujuan"); data & aksi dari backend.
 * Kepala sekolah juga meninjau pengumuman (Fase 3) — digabung di tab Menunggu.
 */
const AREA: ApprovalArea = 'school_admin';

export const load: PageServerLoad = async (event) => {
	const { views } = await event.parent();
	const [page, announcements] = await Promise.all([
		loadApprovalsPage(event, AREA),
		loadPendingAnnouncements(event, views.includes('principal'))
	]);
	return { ...page, announcements };
};

export const actions: Actions = { ...approvalsActions(AREA), ...announcementReviewActions };
