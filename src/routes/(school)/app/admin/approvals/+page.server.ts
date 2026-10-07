import {
	approvalsActions,
	loadApprovalsPage,
	type ApprovalArea
} from '$lib/features/approvals/approvals.server';
import type { Actions, PageServerLoad } from './$types';

/** Kotak Persetujuan area `school_admin` (referensi "11 Kotak Persetujuan"); data & aksi dari backend. */
const AREA: ApprovalArea = 'school_admin';

export const load: PageServerLoad = (event) => loadApprovalsPage(event, AREA);

export const actions: Actions = approvalsActions(AREA);
