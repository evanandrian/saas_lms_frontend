import { relayFile, type BackendContext, type BackendFailure } from '$lib/api/backend-call';
import type { BackendResult } from '$lib/api/backend-call';
import { clientMeta } from '$lib/auth/finish-login';
import { fail, type Actions, type RequestEvent } from '@sveltejs/kit';
import { fetchAuditExport, fetchAuditList, fetchAuditVerify } from './platform-audit.api';
import {
	filtersFromQuery,
	filtersToQuery,
	sanitizeFilters,
	toApiParams
} from './platform-audit.model';

/**
 * Load, form action, dan proxy ekspor Audit log platform (`/platform/audit-log`). Filter dibaca dari
 * query URL saat load (reload/bagikan tautan tetap memakai filter); perubahan filter & "Muat 10 lagi"
 * lewat `runPageAction('list')`, status rantai hash lewat `runPageAction('verify')`.
 */

const HTTP_STATUS_BY_FAILURE: Record<BackendFailure, number> = {
	unauthenticated: 401,
	forbidden: 403,
	not_found: 404,
	conflict: 409,
	validation: 400,
	gone: 410,
	too_many: 429,
	unavailable: 503
};

function context(event: RequestEvent): BackendContext {
	return {
		fetch: event.fetch,
		cookies: event.cookies,
		userAgent: event.request.headers.get('user-agent') ?? '',
		clientAddress: clientMeta(event).address
	};
}

async function readBody(event: RequestEvent): Promise<Record<string, unknown>> {
	try {
		const form = await event.request.formData();
		const body: unknown = JSON.parse(String(form.get('body') ?? 'null'));
		return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

function failWith(result: Exclude<BackendResult<unknown>, { ok: true }>) {
	return fail(HTTP_STATUS_BY_FAILURE[result.reason], {
		reason: result.reason,
		code: result.code,
		issues: result.issues,
		remaining: result.remaining,
		retryAt: result.retryAt
	});
}

export async function loadAuditLog(event: RequestEvent) {
	const filters = filtersFromQuery(event.url.searchParams);
	const list = await fetchAuditList(context(event), toApiParams(filters));
	return {
		filters,
		list: list.ok ? list.data : null,
		failure: list.ok ? null : list.reason,
		issues: list.ok ? [] : list.issues
	};
}

const positiveCursor = (v: unknown) =>
	typeof v === 'number' && Number.isSafeInteger(v) && v > 0 ? v : null;

export const auditLogActions: Actions = {
	list: async (event) => {
		const body = await readBody(event);
		const filters = sanitizeFilters(body.filters);
		const result = await fetchAuditList(
			context(event),
			toApiParams(filters, positiveCursor(body.before))
		);
		return result.ok ? { result: result.data } : failWith(result);
	},
	verify: async (event) => {
		const result = await fetchAuditVerify(context(event));
		return result.ok ? { result: result.data } : failWith(result);
	}
};

/**
 * Ekspor CSV (`/platform/audit-log/export?<filter>`). Sukses diteruskan sebagai lampiran; galat
 * (mis. 422 `export_too_large` dengan `details.max_rows`) diteruskan sebagai JSON agar UI bisa memberi toast.
 */
export async function proxyAuditExport(event: RequestEvent): Promise<Response> {
	const params = Object.fromEntries(filtersToQuery(filtersFromQuery(event.url.searchParams)));
	const upstream = await fetchAuditExport(context(event), params);
	if (!upstream || upstream.ok) return relayFile(upstream);
	const contentType = upstream.headers.get('content-type') ?? '';
	if (!contentType.includes('application/json'))
		return new Response(null, { status: upstream.status });
	return new Response(await upstream.text(), {
		status: upstream.status,
		headers: { 'content-type': 'application/json' }
	});
}
