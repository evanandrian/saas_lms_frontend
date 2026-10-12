import { proxyLearnerReportPdf } from '$lib/features/school-admin/school-admin.server';
import type { RequestHandler } from './$types';

/** Unduh PDF rapor terbit (hanya milik sendiri / anak tertaut; dicek backend). */
export const GET: RequestHandler = (event) =>
	proxyLearnerReportPdf(event, event.url.searchParams.get('id') ?? '');
