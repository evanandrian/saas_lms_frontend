import { proxyImportTemplate } from '$lib/features/school-admin/school-admin.server';
import type { RequestHandler } from './$types';

/** Unduh template impor (xlsx/csv) dari backend; token tetap di cookie HttpOnly. */
export const GET: RequestHandler = (event) =>
	proxyImportTemplate(
		event,
		event.url.searchParams.get('kind') ?? '',
		event.url.searchParams.get('format') ?? 'xlsx'
	);
