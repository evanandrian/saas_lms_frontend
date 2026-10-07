import {
	relayFile,
	type BackendContext,
	type BackendFailure,
	type BackendResult
} from '$lib/api/backend-call';
import { clientMeta } from '$lib/auth/finish-login';
import { fail, type Actions, type RequestEvent } from '@sveltejs/kit';
import {
	approve,
	approveMany,
	askDocuments,
	decline,
	fetchApprovalDocument,
	loadInbox,
	loadInboxSummary
} from './approvals.api';

/** Load & form action Kotak Persetujuan (rute admin sekolah/kepala sekolah dan konsol platform). */
export type ApprovalArea = 'platform' | 'school_admin';

const HTTP_STATUS_BY_FAILURE: Record<BackendFailure, number> = {
	unauthenticated: 401,
	forbidden: 403,
	not_found: 404,
	conflict: 409,
	validation: 422,
	gone: 410,
	too_many: 429,
	unavailable: 503
};
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

export function approvalsContext(event: RequestEvent): BackendContext {
	return {
		fetch: event.fetch,
		cookies: event.cookies,
		userAgent: event.request.headers.get('user-agent') ?? '',
		clientAddress: clientMeta(event).address
	};
}

export async function loadApprovalsPage(event: RequestEvent, area: ApprovalArea) {
	const result = await loadInbox(approvalsContext(event), area);
	return { area, inbox: result.ok ? result.data : null, failure: result.ok ? null : result.reason };
}

/** Jumlah pengajuan menunggu untuk badge menu "Persetujuan"; `null` bila bukan peninjau. */
export async function pendingApprovals(
	event: RequestEvent,
	area: ApprovalArea
): Promise<number | null> {
	const result = await loadInboxSummary(approvalsContext(event), area);
	return result.ok ? result.data.pending : null;
}

/** Lampiran pengajuan untuk pratinjau (`?id=&area=`). */
export async function proxyApprovalDocument(event: RequestEvent): Promise<Response> {
	const id = event.url.searchParams.get('id') ?? '';
	const area = event.url.searchParams.get('area');
	if (!UUID_PATTERN.test(id) || (area !== 'platform' && area !== 'school_admin')) {
		return new Response(null, { status: 404 });
	}
	return relayFile(await fetchApprovalDocument(approvalsContext(event), area, id));
}

async function readBody<T>(event: RequestEvent): Promise<T | null> {
	try {
		const form = await event.request.formData();
		const body: unknown = JSON.parse(String(form.get('body') ?? 'null'));
		return body && typeof body === 'object' ? (body as T) : null;
	} catch {
		return null;
	}
}

function respond<T>(result: BackendResult<T>) {
	if (result.ok) return { result: result.data };
	return fail(HTTP_STATUS_BY_FAILURE[result.reason], {
		reason: result.reason,
		code: result.code,
		issues: result.issues,
		remaining: result.remaining,
		retryAt: result.retryAt
	});
}

const invalidBody = () =>
	fail(400, {
		reason: 'validation' as BackendFailure,
		code: 'invalid_request',
		issues: [],
		remaining: null,
		retryAt: null
	});

function action<B>(handler: (ctx: BackendContext, body: B) => Promise<BackendResult<unknown>>) {
	return async (event: RequestEvent) => {
		const body = await readBody<B>(event);
		if (!body) return invalidBody();
		return respond(await handler(approvalsContext(event), body));
	};
}

export function approvalsActions(area: ApprovalArea): Actions {
	return {
		approve: action<{ id: string; note: string }>((ctx, b) =>
			approve(ctx, area, b.id, b.note ?? '')
		),
		decline: action<{ id: string; reason: string }>((ctx, b) =>
			decline(ctx, area, b.id, b.reason ?? '')
		),
		requestDocs: action<{ id: string; documents: string[]; note: string }>((ctx, b) =>
			askDocuments(ctx, area, b.id, b.documents ?? [], b.note ?? '')
		),
		bulkApprove: action<{ ids: string[] }>((ctx, b) => approveMany(ctx, area, b.ids ?? []))
	};
}
