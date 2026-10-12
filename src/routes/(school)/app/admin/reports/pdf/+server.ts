import { proxyReportPdf } from '$lib/features/school-admin/school-admin.server';
import type { RequestHandler } from './$types';

/** Unduh PDF rapor terkunci (kelas atau satu murid); token tetap di cookie HttpOnly. */
export const GET: RequestHandler = (event) =>
	proxyReportPdf(
		event,
		event.url.searchParams.get('class') ?? '',
		event.url.searchParams.get('student') ?? ''
	);
