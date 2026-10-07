import {
	relayFile,
	type BackendContext,
	type BackendFailure,
	type BackendResult
} from '$lib/api/backend-call';
import { clientMeta } from '$lib/auth/finish-login';
import { fail, type Actions, type RequestEvent } from '@sveltejs/kit';
import {
	approveApplication,
	editApplication,
	fetchApplicationFile,
	loadQueue,
	rejectApplication,
	reopenApplication,
	reviseApplication,
	saveChecks
} from './tenant-applications.api';

/** Load & form action konsol Pengajuan lembaga (`/platform/pengajuan`, referensi "04c Pengajuan Tenant"). */

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

function context(event: RequestEvent): BackendContext {
	return {
		fetch: event.fetch,
		cookies: event.cookies,
		userAgent: event.request.headers.get('user-agent') ?? '',
		clientAddress: clientMeta(event).address
	};
}

export async function loadApplicationsPage(event: RequestEvent) {
	const result = await loadQueue(context(event));
	return { queue: result.ok ? result.data : null, failure: result.ok ? null : result.reason };
}

/** Lampiran pengajuan untuk pratinjau peninjau (`?id=`). */
export async function proxyApplicationFile(event: RequestEvent): Promise<Response> {
	const id = event.url.searchParams.get('id') ?? '';
	if (!UUID_PATTERN.test(id)) return new Response(null, { status: 404 });
	return relayFile(await fetchApplicationFile(context(event), id));
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

type WithId<B> = B & { id: string };

function action<B>(
	handler: (ctx: BackendContext, id: string, body: B) => Promise<BackendResult<unknown>>
) {
	return async (event: RequestEvent) => {
		const body = await readBody<WithId<B>>(event);
		if (!body || !UUID_PATTERN.test(String(body.id ?? ''))) return invalidBody();
		return respond(await handler(context(event), body.id, body));
	};
}

export const applicationActions: Actions = {
	update: action<{ data: Parameters<typeof editApplication>[2] }>((ctx, id, b) =>
		editApplication(ctx, id, b.data)
	),
	checks: action<{ data: Parameters<typeof saveChecks>[2] }>((ctx, id, b) =>
		saveChecks(ctx, id, b.data)
	),
	approve: action<{ data: Parameters<typeof approveApplication>[2] }>((ctx, id, b) =>
		approveApplication(ctx, id, b.data)
	),
	revise: action<{ data: Parameters<typeof reviseApplication>[2] }>((ctx, id, b) =>
		reviseApplication(ctx, id, b.data)
	),
	reject: action<{ data: Parameters<typeof rejectApplication>[2] }>((ctx, id, b) =>
		rejectApplication(ctx, id, b.data)
	),
	reopen: action((ctx, id) => reopenApplication(ctx, id))
};
