import { auditLogActions, loadAuditLog } from '$lib/features/platform-audit/platform-audit.server';
import type { Actions, PageServerLoad } from './$types';

/** Audit log platform (referensi "04h Audit Log"); filter dari query URL, data dari backend. */
export const load: PageServerLoad = (event) => loadAuditLog(event);

export const actions: Actions = auditLogActions;
