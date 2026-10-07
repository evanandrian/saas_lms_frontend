import { proxyApprovalDocument } from '$lib/features/approvals/approvals.server';
import { assertHostKind } from '$lib/utils/host-context';
import type { RequestHandler } from './$types';

/** Lampiran pengajuan (`?id=&area=`) untuk pratinjau peninjau Kotak Persetujuan. */
export const GET: RequestHandler = (event) => {
	assertHostKind(event.locals.host, ['platform', 'tenant', 'unified']);
	return proxyApprovalDocument(event);
};
