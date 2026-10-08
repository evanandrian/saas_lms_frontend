import { backendFailure, type BackendContext, type BackendResult } from '$lib/api/backend-call';
import { backendBaseUrl, backendApiAccess } from '$lib/auth/backend-auth';
import type { PlatformPaymentList, UnpaidInvoiceList } from './payments.model';
import type { InvoiceTransferInput } from '$lib/api/generated/lms';

async function fetchApi<T>(ctx: BackendContext, method: string, path: string, body?: any): Promise<BackendResult<T>> {
	const url = backendBaseUrl() + path;
	const init = await backendApiAccess(ctx.cookies);
	if (!init) return { ok: false, reason: 'unauthenticated', code: 'no_token', issues: [], remaining: null, retryAt: null };
	const res = await ctx.fetch(url, {
		method,
		headers: {
			'Authorization': `Bearer ${init.token}`,
			'Content-Type': 'application/json',
			'User-Agent': ctx.userAgent,
			'X-Forwarded-For': ctx.clientAddress
		},
		body: body ? JSON.stringify(body) : undefined
	});
	const payload = await res.json().catch(() => null);
	if (res.ok) {
		const unwrapped = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
		return { ok: true, data: unwrapped as T };
	}
	return backendFailure(res.status, payload);
}

export function fetchPlatformPayments(
	ctx: BackendContext,
	q: string = '',
	status: string = ''
): Promise<BackendResult<PlatformPaymentList>> {
	return fetchApi(ctx, 'GET', `/api/v1/platform/invoices/payments?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`);
}

export function fetchUnpaidInvoices(
	ctx: BackendContext
): Promise<BackendResult<UnpaidInvoiceList>> {
	return fetchApi(ctx, 'GET', `/api/v1/platform/invoices/unpaid`);
}

export function verifyPayment(
	ctx: BackendContext,
	invoiceId: string,
	paymentId: string
): Promise<BackendResult<unknown>> {
	return fetchApi(ctx, 'POST', `/api/v1/platform/invoices/${invoiceId}/payments/${paymentId}/verify`, {});
}

export function rejectPayment(
	ctx: BackendContext,
	invoiceId: string,
	paymentId: string,
	reason: string
): Promise<BackendResult<unknown>> {
	return fetchApi(ctx, 'POST', `/api/v1/platform/invoices/${invoiceId}/payments/${paymentId}/reject`, { reason });
}

export function recordPayment(
	ctx: BackendContext,
	invoiceId: string,
	payment: InvoiceTransferInput
): Promise<BackendResult<unknown>> {
	return fetchApi(ctx, 'POST', `/api/v1/platform/invoices/${invoiceId}/payments`, payment);
}
