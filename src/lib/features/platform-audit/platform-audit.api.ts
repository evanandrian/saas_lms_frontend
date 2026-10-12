import { callBackend, fetchBackendFile, type BackendContext } from '$lib/api/backend-call';
import {
	getExportPlatformAuditUrl,
	listPlatformAudit,
	verifyPlatformAudit,
	type ExportPlatformAuditParams
} from '$lib/api/generated/lms';
import type { AuditList, AuditVerify, ListPlatformAuditParams } from './platform-audit.types';

/** Feature API Audit log platform (permission `platform.audit.view`) — server-only. */

export const fetchAuditList = (ctx: BackendContext, params: ListPlatformAuditParams) =>
	callBackend<AuditList>(ctx, (init) => listPlatformAudit(params, init));

export const fetchAuditVerify = (ctx: BackendContext) =>
	callBackend<AuditVerify>(ctx, (init) => verifyPlatformAudit(init));

/** CSV (UTF-8 BOM) sesuai filter; dibaca mentah karena generated client mem-parse JSON. */
export const fetchAuditExport = (ctx: BackendContext, params: ExportPlatformAuditParams) =>
	fetchBackendFile(ctx, getExportPlatformAuditUrl(params) as `/api/v1/${string}`);
