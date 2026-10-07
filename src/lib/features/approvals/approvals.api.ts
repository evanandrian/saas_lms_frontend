import {
	approveRequest,
	bulkApproveRequests,
	declineRequest,
	getApprovalInbox,
	getApprovalSummary,
	requestRequestDocuments,
	type AccountArea,
	type BulkApproveResult,
	type Inbox,
	type InboxSummary
} from '$lib/api/generated/lms';
import { callBackend, fetchBackendFile, type BackendContext } from '$lib/api/backend-call';

/**
 * Feature API Kotak Persetujuan (ADR-021) — server-only. Kotak peninjau ditentukan backend dari
 * keanggotaan `area` (admin sekolah, kepala sekolah, atau konsol platform).
 */
export type ApprovalsApiContext = BackendContext;

export const loadInbox = (ctx: ApprovalsApiContext, area: AccountArea) =>
	callBackend<Inbox>(ctx, (init) => getApprovalInbox({ area }, init));

export const loadInboxSummary = (ctx: ApprovalsApiContext, area: AccountArea) =>
	callBackend<InboxSummary>(ctx, (init) => getApprovalSummary({ area }, init));

export const approve = (ctx: ApprovalsApiContext, area: AccountArea, id: string, note: string) =>
	callBackend<Inbox>(ctx, (init) => approveRequest(id, { note }, { area }, init));

export const decline = (ctx: ApprovalsApiContext, area: AccountArea, id: string, reason: string) =>
	callBackend<Inbox>(ctx, (init) => declineRequest(id, { reason }, { area }, init));

export const askDocuments = (
	ctx: ApprovalsApiContext,
	area: AccountArea,
	id: string,
	documents: string[],
	note: string
) =>
	callBackend<Inbox>(ctx, (init) =>
		requestRequestDocuments(id, { documents, note }, { area }, init)
	);

export const approveMany = (ctx: ApprovalsApiContext, area: AccountArea, ids: string[]) =>
	callBackend<BulkApproveResult>(ctx, (init) => bulkApproveRequests({ ids }, { area }, init));

/** Lampiran pengajuan untuk pratinjau peninjau. */
export const fetchApprovalDocument = (ctx: ApprovalsApiContext, area: AccountArea, id: string) =>
	fetchBackendFile(ctx, `/api/v1/approvals/documents/${encodeURIComponent(id)}?area=${area}`);
