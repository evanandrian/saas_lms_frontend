import { proxyAuditExport } from '$lib/features/school-admin/school-admin.server';
import type { RequestHandler } from './$types';

/** Ekspor CSV riwayat perubahan sesuai filter halaman (rentang maks 90 hari; galat → Toast di halaman). */
export const GET: RequestHandler = (event) => proxyAuditExport(event);
