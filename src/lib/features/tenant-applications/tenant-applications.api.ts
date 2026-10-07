import {
	approveTenantApplication,
	listTenantApplications,
	rejectTenantApplication,
	reopenTenantApplication,
	reviseTenantApplication,
	setTenantApplicationChecks,
	updateTenantApplication,
	type ApproveApplicationRequest,
	type RejectApplicationRequest,
	type ReviewChecksRequest,
	type ReviewList,
	type ReviewUpdateRequest,
	type ReviseApplicationRequest
} from '$lib/api/generated/lms';
import { callBackend, fetchBackendFile, type BackendContext } from '$lib/api/backend-call';

/** Feature API konsol Pengajuan lembaga (referensi "04c Pengajuan Tenant") — server-only. */
export const loadQueue = (ctx: BackendContext) =>
	callBackend<ReviewList>(ctx, (init) => listTenantApplications(init));

export const editApplication = (ctx: BackendContext, id: string, body: ReviewUpdateRequest) =>
	callBackend<ReviewList>(ctx, (init) => updateTenantApplication(id, body, init));

export const saveChecks = (ctx: BackendContext, id: string, body: ReviewChecksRequest) =>
	callBackend<ReviewList>(ctx, (init) => setTenantApplicationChecks(id, body, init));

export const approveApplication = (
	ctx: BackendContext,
	id: string,
	body: ApproveApplicationRequest
) => callBackend<ReviewList>(ctx, (init) => approveTenantApplication(id, body, init));

export const reviseApplication = (
	ctx: BackendContext,
	id: string,
	body: ReviseApplicationRequest
) => callBackend<ReviewList>(ctx, (init) => reviseTenantApplication(id, body, init));

export const rejectApplication = (
	ctx: BackendContext,
	id: string,
	body: RejectApplicationRequest
) => callBackend<ReviewList>(ctx, (init) => rejectTenantApplication(id, body, init));

export const reopenApplication = (ctx: BackendContext, id: string) =>
	callBackend<ReviewList>(ctx, (init) => reopenTenantApplication(id, init));

export const fetchApplicationFile = (ctx: BackendContext, fileId: string) =>
	fetchBackendFile(ctx, `/api/v1/platform/applications/files/${encodeURIComponent(fileId)}`);
