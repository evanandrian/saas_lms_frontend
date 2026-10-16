import { announcementReviewActions } from '$lib/features/announcements/announcements.server';
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
	// Paralel dengan layout; pengumuman menunggu (kepala sekolah) sudah dimuat layout → dipakai ulang.
	const [page, { pendingAnnouncements }] = await Promise.all([
		loadApprovalsPage(event, AREA),
		event.parent()
	]);
	return { ...page, announcements: pendingAnnouncements };
};

export const actions: Actions = { ...approvalsActions(AREA), ...announcementReviewActions };
