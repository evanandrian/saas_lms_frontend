import { proxyLogo } from '$lib/features/school-admin/school-admin.server';
import type { RequestHandler } from './$types';

/** Logo sekolah (kop rapor) dari backend. */
export const GET: RequestHandler = (event) => proxyLogo(event);
