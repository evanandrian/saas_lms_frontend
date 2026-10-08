import { fail, type Actions, type RequestEvent } from '@sveltejs/kit';
import { fetchPlatformPayments, fetchUnpaidInvoices, verifyPayment, rejectPayment, recordPayment } from './payments.api';
import { clientMeta } from '$lib/auth/finish-login';
import type { BackendContext } from '$lib/api/backend-call';
import type { InvoiceTransferInput } from '$lib/api/generated/lms';

function context(event: RequestEvent): BackendContext {
	return {
		fetch: event.fetch,
		cookies: event.cookies,
		userAgent: event.request.headers.get('user-agent') ?? '',
		clientAddress: clientMeta(event).address
	};
}

export async function loadPaymentConsole(event: RequestEvent) {
	const ctx = context(event);
	const q = event.url.searchParams.get('q') ?? '';
	const status = event.url.searchParams.get('status') ?? '';
	
	const [listResult, unpaidResult] = await Promise.all([
		fetchPlatformPayments(ctx, q, status),
		fetchUnpaidInvoices(ctx)
	]);

	if (!listResult.ok || !unpaidResult.ok) {
		return {
			list: null,
			unpaid: null,
			failure: (listResult.ok ? null : listResult.reason) ?? (unpaidResult.ok ? null : unpaidResult.reason)
		};
	}

	return {
		list: listResult.data,
		unpaid: unpaidResult.data,
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

export const paymentConsoleActions: Actions = {
	verify: async (event) => {
		const body = await readBody<{ invoiceId: string; paymentId: string }>(event);
		if (!body) return fail(400, { reason: 'validation' });
		const result = await verifyPayment(context(event), body.invoiceId, body.paymentId);
		if (!result.ok) return fail(400, { reason: result.reason });
		return { result: { detail: result.data } };
	},
	reject: async (event) => {
		const body = await readBody<{ invoiceId: string; paymentId: string; reason: string }>(event);
		if (!body) return fail(400, { reason: 'validation' });
		const result = await rejectPayment(context(event), body.invoiceId, body.paymentId, body.reason);
		if (!result.ok) return fail(400, { reason: result.reason });
		return { result: { detail: result.data } };
	},
	record: async (event) => {
		const body = await readBody<{ invoiceId: string; payment: InvoiceTransferInput }>(event);
		if (!body) return fail(400, { reason: 'validation' });
		const result = await recordPayment(context(event), body.invoiceId, body.payment);
		if (!result.ok) return fail(400, { reason: result.reason, issues: result.issues });
		return { result: { detail: result.data } };
	}
};
