import { proxyAuditExport } from '$lib/features/platform-audit/platform-audit.server';
import type { RequestHandler } from './$types';

/** Unduh CSV audit log sesuai filter (`?q=&actor=&range=…`); token tetap di cookie HttpOnly. */
export const GET: RequestHandler = (event) => proxyAuditExport(event);
