import {
	checkTenantInvoicePayment,
	createInvoiceDraft,
	deleteInvoiceDraft,
	duplicateInvoice,
	getBillingSettings,
	getInvoiceOptions,
	getPlatformInvoice,
	getTenantInvoice,
	issueInvoice,
	listPlatformInvoices,
	listTenantInvoices,
	payTenantInvoice,
	recordInvoicePayment,
	rejectInvoicePayment,
	remindInvoice,
	submitTenantTransfer,
	updateBillingSettings,
	updateInvoiceDraft,
	verifyInvoicePayment,
	voidInvoice,
	type BillingSettings,
	type BillingSettingsInput,
	type InvoiceDetail,
	type InvoiceDraftInput,
	type InvoiceList,
	type InvoiceOptions,
	type InvoicePayInputChannel,
	type InvoiceTransferInput,
	type BillingAreaParameter
} from '$lib/api/generated/lms';
import { callBackend, fetchBackendFile, type BackendContext } from '$lib/api/backend-call';

/** Feature API Invoice (referensi "04e Invoice") — server-only. Konsol staf keuangan & tagihan tenant. */
export type TenantBillingArea = BillingAreaParameter;

export const fetchInvoices = (ctx: BackendContext, q = '') =>
	callBackend<InvoiceList>(ctx, (init) => listPlatformInvoices({ q }, init));

export const fetchInvoiceOptions = (ctx: BackendContext) =>
	callBackend<InvoiceOptions>(ctx, (init) => getInvoiceOptions(init));

export const fetchInvoice = (ctx: BackendContext, id: string) =>
	callBackend<InvoiceDetail>(ctx, (init) => getPlatformInvoice(id, init));

export const createDraft = (ctx: BackendContext, body: InvoiceDraftInput) =>
	callBackend<InvoiceDetail>(ctx, (init) => createInvoiceDraft(body, init));

export const updateDraft = (ctx: BackendContext, id: string, body: InvoiceDraftInput) =>
	callBackend<InvoiceDetail>(ctx, (init) => updateInvoiceDraft(id, body, init));

export const deleteDraft = (ctx: BackendContext, id: string) =>
	callBackend<{ deleted?: boolean }>(ctx, (init) => deleteInvoiceDraft(id, init));

export const issue = (ctx: BackendContext, id: string) =>
	callBackend<InvoiceDetail>(ctx, (init) => issueInvoice(id, init));

export const remind = (ctx: BackendContext, id: string) =>
	callBackend<InvoiceDetail>(ctx, (init) => remindInvoice(id, init));

export const duplicate = (ctx: BackendContext, id: string) =>
	callBackend<InvoiceDetail>(ctx, (init) => duplicateInvoice(id, init));

export const voidOne = (ctx: BackendContext, id: string, reason: string) =>
	callBackend<InvoiceDetail>(ctx, (init) => voidInvoice(id, { reason }, init));

export const recordPayment = (ctx: BackendContext, id: string, body: InvoiceTransferInput) =>
	callBackend<InvoiceDetail>(ctx, (init) => recordInvoicePayment(id, body, init));

export const verifyPayment = (ctx: BackendContext, id: string, paymentId: string) =>
	callBackend<InvoiceDetail>(ctx, (init) => verifyInvoicePayment(id, paymentId, init));

export const rejectPayment = (ctx: BackendContext, id: string, paymentId: string, reason: string) =>
	callBackend<InvoiceDetail>(ctx, (init) => rejectInvoicePayment(id, paymentId, { reason }, init));

export const fetchSettings = (ctx: BackendContext) =>
	callBackend<BillingSettings>(ctx, (init) => getBillingSettings(init));

export const saveSettings = (ctx: BackendContext, body: BillingSettingsInput) =>
	callBackend<BillingSettings>(ctx, (init) => updateBillingSettings(body, init));

export const fetchPlatformProof = (ctx: BackendContext, paymentId: string) =>
	fetchBackendFile(
		ctx,
		`/api/v1/platform/invoices/payments/${encodeURIComponent(paymentId)}/proof`
	);

// ===== Tagihan tenant =====

export const fetchTenantInvoices = (ctx: BackendContext, area: TenantBillingArea) =>
	callBackend<InvoiceList>(ctx, (init) => listTenantInvoices({ area }, init));

export const fetchTenantInvoice = (ctx: BackendContext, area: TenantBillingArea, id: string) =>
	callBackend<InvoiceDetail>(ctx, (init) => getTenantInvoice(id, { area }, init));

export const payTenant = (
	ctx: BackendContext,
	area: TenantBillingArea,
	id: string,
	channel: InvoicePayInputChannel
) => callBackend<InvoiceDetail>(ctx, (init) => payTenantInvoice(id, { channel }, { area }, init));

export const checkTenant = (ctx: BackendContext, area: TenantBillingArea, id: string) =>
	callBackend<InvoiceDetail>(ctx, (init) => checkTenantInvoicePayment(id, { area }, init));

export const transferTenant = (
	ctx: BackendContext,
	area: TenantBillingArea,
	id: string,
	body: InvoiceTransferInput
) => callBackend<InvoiceDetail>(ctx, (init) => submitTenantTransfer(id, body, { area }, init));

export const fetchTenantProof = (ctx: BackendContext, area: TenantBillingArea, paymentId: string) =>
	fetchBackendFile(
		ctx,
		`/api/v1/billing/invoices/payments/${encodeURIComponent(paymentId)}/proof?area=${encodeURIComponent(area)}`
	);
