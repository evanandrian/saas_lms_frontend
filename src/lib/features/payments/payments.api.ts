import {
	checkInvoicePaymentMutation,
	getBillingSettings,
	listPlatformPayments,
	listUnpaidInvoices,
	recordInvoicePayment,
	rejectInvoicePayment,
	verifyInvoicePayment,
	type BillingSettings,
	type InvoiceDetail,
	type InvoiceTransferInput,
	type PlatformPaymentList,
	type UnpaidInvoiceList
} from '$lib/api/generated/lms';
import { callBackend, type BackendContext } from '$lib/api/backend-call';

/** Feature API Pembayaran (referensi "04f Pembayaran") — server-only, lewat generated client. */
export const fetchPayments = (ctx: BackendContext) =>
	callBackend<PlatformPaymentList>(ctx, (init) => listPlatformPayments({}, init));

export const fetchUnpaid = (ctx: BackendContext) =>
	callBackend<UnpaidInvoiceList>(ctx, (init) => listUnpaidInvoices(init));

export const fetchSettings = (ctx: BackendContext) =>
	callBackend<BillingSettings>(ctx, (init) => getBillingSettings(init));

export const verify = (ctx: BackendContext, invoiceId: string, paymentId: string) =>
	callBackend<InvoiceDetail>(ctx, (init) => verifyInvoicePayment(invoiceId, paymentId, init));

export const reject = (ctx: BackendContext, invoiceId: string, paymentId: string, reason: string) =>
	callBackend<InvoiceDetail>(ctx, (init) =>
		rejectInvoicePayment(invoiceId, paymentId, { reason }, init)
	);

export const record = (ctx: BackendContext, invoiceId: string, body: InvoiceTransferInput) =>
	callBackend<InvoiceDetail>(ctx, (init) => recordInvoicePayment(invoiceId, body, init));

export const mutationCheck = (ctx: BackendContext, invoiceId: string, paymentId: string) =>
	callBackend<InvoiceDetail>(ctx, (init) =>
		checkInvoicePaymentMutation(invoiceId, paymentId, init)
	);
