export type {
	BankAccount,
	InvoiceTransferInput,
	PlatformPayment,
	PlatformPaymentList,
	UnpaidInvoice,
	UnpaidInvoiceList
} from '$lib/api/generated/lms';
import type { PlatformPayment } from '$lib/api/generated/lms';

/** Model UX Pembayaran (referensi 04f): tab, kanal, status, dan pemetaan teks lewat i18n. */
export const PREFIX = 'payments';

export const TABS = ['pending', 'all', 'succeeded', 'failed'] as const;
export type PaymentTab = (typeof TABS)[number];

export const MANUAL_CHANNELS = ['transfer', 'va', 'qris', 'cash'] as const;
export type ManualChannel = (typeof MANUAL_CHANNELS)[number];

/** Alasan tolak cepat (referensi); teks dari i18n, dikirim sebagai alasan ke tenant. */
export const REJECT_REASONS = [
	'unreadable',
	'amount_mismatch',
	'not_in_statement',
	'wrong_account'
] as const;

export const PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const PROOF_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;
export const DISPLAY_ID_LENGTH = 8;

export const STATUS_TONE = {
	pending: 'warning',
	succeeded: 'success',
	failed: 'danger',
	refunded: 'neutral'
} as const;

/** Nomor tampilan pembayaran, mis. PAY-01A129BF (dari UUID, bukan data contoh). */
export const displayId = (id: string) =>
	`PAY-${id.replace(/-/g, '').slice(0, DISPLAY_ID_LENGTH).toUpperCase()}`;

/** Kunci i18n kanal: manual (transfer/va/qris/cash) atau gateway (va_bca, qris, …). */
export function channelKey(
	p: Pick<PlatformPayment, 'method' | 'manual_channel' | 'channel'>
): string {
	if (p.method === 'gateway') return p.channel === 'qris' ? 'qris' : 'va';
	return (p.manual_channel || 'transfer') as ManualChannel;
}

export const bankOfChannel = (channel: string) => channel.replace(/^va_/, '').toUpperCase();

export const remainingOf = (p: Pick<PlatformPayment, 'invoice_total_idr' | 'invoice_paid_idr'>) =>
	Math.max(0, p.invoice_total_idr - p.invoice_paid_idr);
