import {
	relayFile,
	type BackendContext,
	type BackendFailure,
	type BackendResult
} from '$lib/api/backend-call';
import type {
	BillingSettingsInput,
	InvoiceDraftInput,
	InvoicePayInputChannel,
	InvoiceTransferInput
} from '$lib/api/generated/lms';
import { clientMeta } from '$lib/auth/finish-login';
import { fail, type Actions, type RequestEvent } from '@sveltejs/kit';
import {
	checkTenant,
	createDraft,
	deleteDraft,
	duplicate,
	fetchInvoice,
	fetchInvoiceOptions,
	fetchInvoices,
	fetchPlatformProof,
	fetchTenantInvoice,
	fetchTenantInvoices,
	fetchTenantProof,
	issue,
	payTenant,
	recordPayment,
	rejectPayment,
	remind,
	saveSettings,
	transferTenant,
	updateDraft,
	verifyPayment,
	voidOne,
	type TenantBillingArea
} from './invoices.api';

/**
 * Load & form action Invoice: konsol staf keuangan (`/platform/invoice`) dan halaman tagihan tenant
 * (`/app/admin/tagihan`, `/app/teacher/tagihan`). Aksi dipanggil lewat `runPageAction` (`?/<nama>`).
 */

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

const selectedId = (event: RequestEvent) => {
	const id = event.url.searchParams.get('id') ?? '';
	return UUID_PATTERN.test(id) ? id : null;
};

// ===== Konsol platform =====

export async function loadInvoiceConsole(event: RequestEvent) {
	const ctx = context(event);
	const [list, options] = await Promise.all([fetchInvoices(ctx), fetchInvoiceOptions(ctx)]);
	if (!list.ok || !options.ok) {
		return {
			list: null,
			options: null,
			selected: null,
			failure: (list.ok ? null : list.reason) ?? (options.ok ? null : options.reason)
		};
	}
	const wanted = selectedId(event) ?? list.data.items[0]?.id ?? null;
	const detail = wanted ? await fetchInvoice(ctx, wanted) : null;
	return {
		list: list.data,
		options: options.data,
		selected: detail?.ok ? detail.data : null,
		failure: null
	};
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

function failWith(result: Exclude<BackendResult<unknown>, { ok: true }>) {
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

const validId = (v: unknown): v is string => typeof v === 'string' && UUID_PATTERN.test(v);

/** Aksi konsol: hasil = invoice terbaru + daftar terbaru (panel kiri selalu sinkron). */
function consoleAction<B extends object>(
	run: (ctx: BackendContext, body: B) => Promise<BackendResult<unknown>>,
	valid: (body: B) => boolean = () => true
) {
	return async (event: RequestEvent) => {
		const body = await readBody<B>(event);
		if (!body || !valid(body)) return invalidBody();
		const ctx = context(event);
		const result = await run(ctx, body);
		if (!result.ok) return failWith(result);
		const list = await fetchInvoices(ctx);
		return { result: { detail: result.data, list: list.ok ? list.data : null } };
	};
}

type WithId = { id: string };

export const invoiceConsoleActions: Actions = {
	get: consoleAction<WithId>(
		(ctx, b) => fetchInvoice(ctx, b.id),
		(b) => validId(b.id)
	),
	save: consoleAction<{ id?: string; draft: InvoiceDraftInput }>(
		(ctx, b) => (b.id ? updateDraft(ctx, b.id, b.draft) : createDraft(ctx, b.draft)),
		(b) => !!b.draft && (b.id === undefined || validId(b.id))
	),
	remove: consoleAction<WithId>(
		(ctx, b) => deleteDraft(ctx, b.id),
		(b) => validId(b.id)
	),
	issue: consoleAction<WithId>(
		(ctx, b) => issue(ctx, b.id),
		(b) => validId(b.id)
	),
	remind: consoleAction<WithId>(
		(ctx, b) => remind(ctx, b.id),
		(b) => validId(b.id)
	),
	duplicate: consoleAction<WithId>(
		(ctx, b) => duplicate(ctx, b.id),
		(b) => validId(b.id)
	),
	void: consoleAction<WithId & { reason: string }>(
		(ctx, b) => voidOne(ctx, b.id, String(b.reason ?? '')),
		(b) => validId(b.id)
	),
	record: consoleAction<WithId & { payment: InvoiceTransferInput }>(
		(ctx, b) => recordPayment(ctx, b.id, b.payment),
		(b) => validId(b.id) && !!b.payment
	),
	verify: consoleAction<WithId & { paymentId: string }>(
		(ctx, b) => verifyPayment(ctx, b.id, b.paymentId),
		(b) => validId(b.id) && validId(b.paymentId)
	),
	reject: consoleAction<WithId & { paymentId: string; reason: string }>(
		(ctx, b) => rejectPayment(ctx, b.id, b.paymentId, String(b.reason ?? '')),
		(b) => validId(b.id) && validId(b.paymentId)
	),
	settings: async (event) => {
		const body = await readBody<BillingSettingsInput>(event);
		if (!body) return invalidBody();
		const result = await saveSettings(context(event), body);
		return result.ok ? { result: result.data } : failWith(result);
	}
};

/** Bukti transfer untuk konsol (`/platform/invoice/proof?id=`). */
export async function proxyPlatformProof(event: RequestEvent): Promise<Response> {
	const id = event.url.searchParams.get('id') ?? '';
	if (!UUID_PATTERN.test(id)) return new Response(null, { status: 404 });
	return relayFile(await fetchPlatformProof(context(event), id));
}

// ===== Tagihan tenant =====

export async function loadTenantBilling(event: RequestEvent, area: TenantBillingArea) {
	const ctx = context(event);
	const list = await fetchTenantInvoices(ctx, area);
	if (!list.ok) return { area, list: null, selected: null, failure: list.reason };
	const wanted = selectedId(event) ?? list.data.items[0]?.id ?? null;
	const detail = wanted ? await fetchTenantInvoice(ctx, area, wanted) : null;
	return { area, list: list.data, selected: detail?.ok ? detail.data : null, failure: null };
}

function tenantAction<B extends WithId>(
	area: TenantBillingArea,
	run: (ctx: BackendContext, body: B) => Promise<BackendResult<unknown>>
) {
	return async (event: RequestEvent) => {
		const body = await readBody<B>(event);
		if (!body || !validId(body.id)) return invalidBody();
		const ctx = context(event);
		const result = await run(ctx, body);
		if (!result.ok) return failWith(result);
		const list = await fetchTenantInvoices(ctx, area);
		return { result: { detail: result.data, list: list.ok ? list.data : null } };
	};
}

export function tenantBillingActions(area: TenantBillingArea): Actions {
	return {
		get: tenantAction<WithId>(area, (ctx, b) => fetchTenantInvoice(ctx, area, b.id)),
		pay: tenantAction<WithId & { channel: InvoicePayInputChannel }>(area, (ctx, b) =>
			payTenant(ctx, area, b.id, b.channel)
		),
		check: tenantAction<WithId>(area, (ctx, b) => checkTenant(ctx, area, b.id)),
		transfer: tenantAction<WithId & { payment: InvoiceTransferInput }>(area, (ctx, b) =>
			transferTenant(ctx, area, b.id, b.payment)
		)
	};
}

/** Bukti transfer milik tenant (`/app/<area>/tagihan/proof?id=`). */
export async function proxyTenantProof(
	event: RequestEvent,
	area: TenantBillingArea
): Promise<Response> {
	const id = event.url.searchParams.get('id') ?? '';
	if (!UUID_PATTERN.test(id)) return new Response(null, { status: 404 });
	return relayFile(await fetchTenantProof(context(event), area, id));
}
