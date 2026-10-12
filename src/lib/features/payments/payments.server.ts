import type { BackendContext, BackendFailure, BackendResult } from '$lib/api/backend-call';
import type { InvoiceTransferInput } from '$lib/api/generated/lms';
import { clientMeta } from '$lib/auth/finish-login';
import { fail, type Actions, type RequestEvent } from '@sveltejs/kit';
import * as api from './payments.api';

/**
 * Load & form action Pembayaran (`/platform/pembayaran`). Aksi dipanggil lewat `runPageAction`;
 * hasil sukses = daftar pembayaran & invoice belum lunas terbaru sehingga panel kiri selalu sinkron.
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
const validId = (v: unknown): v is string => typeof v === 'string' && UUID_PATTERN.test(v);

function context(event: RequestEvent): BackendContext {
	return {
		fetch: event.fetch,
		cookies: event.cookies,
		userAgent: event.request.headers.get('user-agent') ?? '',
		clientAddress: clientMeta(event).address
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

async function snapshot(ctx: BackendContext) {
	const [list, unpaid] = await Promise.all([api.fetchPayments(ctx), api.fetchUnpaid(ctx)]);
	return { list: list.ok ? list.data : null, unpaid: unpaid.ok ? unpaid.data : null };
}

export async function loadPaymentConsole(event: RequestEvent) {
	const ctx = context(event);
	const [list, unpaid, settings] = await Promise.all([
		api.fetchPayments(ctx),
		api.fetchUnpaid(ctx),
		api.fetchSettings(ctx)
	]);
	const failure = !list.ok ? list.reason : !unpaid.ok ? unpaid.reason : null;
	return {
		list: list.ok ? list.data : null,
		unpaid: unpaid.ok ? unpaid.data : null,
		banks: settings.ok ? settings.data.bank_accounts : [],
		failure
	};
}

type Ids = { invoiceId?: string; paymentId?: string };

function action<B extends object>(
	run: (ctx: BackendContext, body: B) => Promise<BackendResult<unknown>> | null
) {
	return async (event: RequestEvent) => {
		const body = (await readBody<B>(event)) ?? ({} as B);
		const ctx = context(event);
		const pending = run(ctx, body);
		if (!pending) return invalidBody();
		const result = await pending;
		if (!result.ok) return failWith(result);
		return { result: await snapshot(ctx) };
	};
}

export const paymentConsoleActions: Actions = {
	verify: action<Ids>((ctx, b) =>
		validId(b.invoiceId) && validId(b.paymentId) ? api.verify(ctx, b.invoiceId, b.paymentId) : null
	),
	reject: action<Ids & { reason?: string }>((ctx, b) =>
		validId(b.invoiceId) && validId(b.paymentId) && typeof b.reason === 'string'
			? api.reject(ctx, b.invoiceId, b.paymentId, b.reason)
			: null
	),
	mutation: action<Ids>((ctx, b) =>
		validId(b.invoiceId) && validId(b.paymentId)
			? api.mutationCheck(ctx, b.invoiceId, b.paymentId)
			: null
	),
	record: action<{ invoiceId?: string; payment?: InvoiceTransferInput }>((ctx, b) =>
		validId(b.invoiceId) && b.payment ? api.record(ctx, b.invoiceId, b.payment) : null
	)
};
