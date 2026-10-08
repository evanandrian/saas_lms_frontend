import type {
	BankAccount,
	BillingSettings,
	InvoiceDetail,
	InvoiceDraftInput,
	InvoiceLineInputItemType,
	InvoiceList,
	InvoiceOptions,
	InvoicePayment,
	InvoiceStatus,
	InvoiceSummary,
	InvoiceTenantOption
} from '$lib/api/generated/lms';

/**
 * Model Invoice (client-safe; referensi "04e Invoice"). Nilai final selalu dari backend; perhitungan di
 * sini hanya pratinjau saat staf mengubah draf (rumus sama dengan `billing.CalculateInvoice`).
 */
export type {
	BankAccount,
	BillingSettings,
	InvoiceDetail,
	InvoiceList,
	InvoiceOptions,
	InvoicePayment,
	InvoiceStatus,
	InvoiceSummary,
	InvoiceTenantOption
};

export const TERMS_OPTIONS = [7, 14, 30] as const;
export const DEFAULT_TAX_BP = 1100;
const BASIS_POINTS = 10000;
const PERCENT_MAX = 100;
const MAX_ROWS = 30;
export const PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const PROOF_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;

/** Tab daftar (referensi): "Belum bayar" juga memuat yang lewat jatuh tempo. */
export const TABS = ['all', 'draft', 'issued', 'overdue', 'paid'] as const;
export type InvoiceTab = (typeof TABS)[number];

export function inTab(status: InvoiceStatus, tab: InvoiceTab): boolean {
	if (tab === 'all') return true;
	if (tab === 'issued') return status === 'issued' || status === 'overdue';
	return status === tab;
}

/** Warna lencana status & stempel cetak (referensi ST / STAMP). */
export const STATUS_TONE: Readonly<Record<InvoiceStatus, string>> = {
	draft: 'bg-lms-surface-muted text-lms-muted',
	issued: 'bg-lms-interactive-subtle text-lms-interactive-subtle-text',
	overdue: 'lms-tone-warning',
	paid: 'lms-tone-success',
	void: 'lms-tone-danger'
};
export const STAMP_COLOR: Readonly<Record<InvoiceStatus, string>> = {
	draft: '#94A3B8',
	issued: '#3355C4',
	overdue: '#C2410C',
	paid: '#267D53',
	void: '#B42323'
};

// ===== Form draf =====

export interface InvoiceRowForm {
	itemType: InvoiceLineInputItemType;
	description: string;
	quantity: string;
	unitLabel: string;
	unitPrice: string;
}

export interface InvoiceForm {
	tenantId: string;
	subscriptionId: string;
	issueDate: string;
	termsDays: number;
	periodLabel: string;
	rows: InvoiceRowForm[];
	discountType: 'percent' | 'amount';
	discountValue: string;
	taxEnabled: boolean;
	bankAccountId: string;
	note: string;
}

export const emptyRow = (unitLabel = ''): InvoiceRowForm => ({
	itemType: 'other',
	description: '',
	quantity: '1',
	unitLabel,
	unitPrice: ''
});

export function emptyForm(settings: BillingSettings, today: string, period: string): InvoiceForm {
	return {
		tenantId: '',
		subscriptionId: '',
		issueDate: today,
		termsDays: settings.default_terms_days,
		periodLabel: period,
		rows: [emptyRow()],
		discountType: 'percent',
		discountValue: '',
		taxEnabled: true,
		bankAccountId: settings.bank_accounts.find((b) => b.is_default)?.id ?? '',
		note: ''
	};
}

export function formFromDetail(d: InvoiceDetail): InvoiceForm {
	return {
		tenantId: d.tenant_id,
		subscriptionId: d.subscription_id ?? '',
		issueDate: d.issue_date ?? '',
		termsDays: d.terms_days ?? TERMS_OPTIONS[1],
		periodLabel: d.period_label,
		rows: d.items.map((it) => ({
			itemType: it.item_type as InvoiceLineInputItemType,
			description: it.description,
			quantity: String(it.quantity),
			unitLabel: it.unit_label,
			unitPrice: String(it.unit_price_idr)
		})),
		discountType: d.discount_type,
		discountValue: d.discount_value ? String(d.discount_value) : '',
		taxEnabled: d.tax_enabled,
		bankAccountId: d.bank_account_id ?? d.bank?.id ?? '',
		note: d.note
	};
}

const num = (v: string) => Number(v) || 0;

export function toDraftInput(f: InvoiceForm): InvoiceDraftInput {
	return {
		tenant_id: f.tenantId,
		subscription_id: f.subscriptionId,
		issue_date: f.issueDate,
		terms_days: f.termsDays as InvoiceDraftInput['terms_days'],
		period_label: f.periodLabel.trim(),
		items: f.rows.map((r) => ({
			item_type: r.itemType,
			description: r.description.trim(),
			quantity: num(r.quantity),
			unit_label: r.unitLabel.trim(),
			unit_price_idr: num(r.unitPrice)
		})),
		discount_type: f.discountType,
		discount_value: num(f.discountValue),
		tax_enabled: f.taxEnabled,
		bank_account_id: f.bankAccountId,
		note: f.note.trim()
	};
}

export interface Totals {
	subtotal: number;
	discount: number;
	dpp: number;
	tax: number;
	total: number;
}

const roundDiv = (a: number, b: number) => Math.floor((a + Math.floor(b / 2)) / b);

/** PPN dari DPP setelah diskon (sama dengan backend). */
export function calcTotals(f: InvoiceForm, taxBp = DEFAULT_TAX_BP): Totals {
	const subtotal = f.rows.reduce((sum, r) => sum + num(r.quantity) * num(r.unitPrice), 0);
	const discount =
		f.discountType === 'percent'
			? roundDiv(subtotal * Math.min(PERCENT_MAX, num(f.discountValue)), PERCENT_MAX)
			: Math.min(subtotal, num(f.discountValue));
	const dpp = subtotal - discount;
	const tax = f.taxEnabled ? roundDiv(dpp * taxBp, BASIS_POINTS) : 0;
	return { subtotal, discount, dpp, tax, total: dpp + tax };
}

/** Kode galat isian (i18n `invoices.err.<kode>`); `tried` = setelah tombol Terbitkan ditekan. */
export function formErrors(f: InvoiceForm): Record<string, string> {
	const e: Record<string, string> = {};
	if (!f.tenantId) e.tenant = 'tenant';
	if (
		!f.rows.length ||
		f.rows.length > MAX_ROWS ||
		f.rows.some((r) => !r.description.trim() || !(num(r.quantity) > 0) || !(num(r.unitPrice) > 0))
	)
		e.rows = 'rows';
	if (f.discountType === 'percent' && num(f.discountValue) > PERCENT_MAX) e.disc = 'disc';
	if (!f.issueDate) e.issue = 'issue';
	return e;
}

/**
 * "Isi dari langganan tenant": baris dari langganan terakhir. Bulanan per kursi = kursi × harga per
 * bulan; tahunan = kursi × harga × bulan ditagih (12 − bulan gratis); flat per bulan/tahun; paket sesi.
 */
export function rowsFromSubscription(
	t: InvoiceTenantOption,
	period: string,
	labels: {
		plan: string;
		seat: string;
		month: string;
		year: string;
		package: string;
		yearly: string;
	}
): InvoiceRowForm[] {
	const yearly = t.billing_cycle === 'year';
	const billedMonths = yearly ? Math.max(1, 12 - t.free_months) : 1;
	const suffix = period ? ` · ${period}` : '';
	if (t.pricing_model === 'seat') {
		return [
			{
				itemType: 'plan',
				description: `${labels.plan} ${t.plan_name}${yearly ? ` ${labels.yearly}` : ''}${suffix}`,
				quantity: String(t.seat_count || 1),
				unitLabel: labels.seat,
				unitPrice: String(t.unit_price_idr * billedMonths)
			}
		];
	}
	if (t.pricing_model === 'package') {
		return [
			{
				itemType: 'session_credit',
				description: `${labels.plan} ${t.plan_name}${suffix}`,
				quantity: '1',
				unitLabel: labels.package,
				unitPrice: String(t.unit_price_idr)
			}
		];
	}
	return [
		{
			itemType: 'plan',
			description: `${labels.plan} ${t.plan_name}${suffix}`,
			quantity: '1',
			unitLabel: yearly ? labels.year : labels.month,
			unitPrice: String(t.unit_price_idr * billedMonths)
		}
	];
}

// ===== Format =====

export const rupiah = (n: number, locale = 'id') =>
	(n < 0 ? '−Rp' : 'Rp') +
	Math.abs(Math.round(n)).toLocaleString(locale === 'en' ? 'en-US' : 'id-ID');

export const dateLocale = (locale: string) => (locale === 'en' ? 'en-GB' : 'id-ID');

/** "6 Oktober 2026" dari YYYY-MM-DD (tanpa geser zona). */
export function longDate(iso: string | null | undefined, locale: string): string {
	if (!iso) return '—';
	const [y = 0, m = 1, d = 1] = iso.slice(0, 10).split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(dateLocale(locale), {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});
}

/** Tanggal (WIB) dari timestamp ISO. */
export function longDateTs(ts: string | null | undefined, locale: string): string {
	if (!ts) return '—';
	return new Date(ts).toLocaleDateString(dateLocale(locale), {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Asia/Jakarta'
	});
}

export function addDays(iso: string, n: number): string {
	if (!iso) return '';
	const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
	const t = new Date(Date.UTC(y, m - 1, d + n));
	return t.toISOString().slice(0, 10);
}

/** Hari ini (WIB) sebagai YYYY-MM-DD. */
export const todayJakarta = () =>
	new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

const SAT = [
	'',
	'satu',
	'dua',
	'tiga',
	'empat',
	'lima',
	'enam',
	'tujuh',
	'delapan',
	'sembilan',
	'sepuluh',
	'sebelas'
];

function words(x: number): string {
	const n = Math.floor(x);
	if (n < 12) return SAT[n] ?? '';
	if (n < 20) return `${words(n - 10)} belas`;
	if (n < 100) return `${words(n / 10)} puluh${n % 10 ? ` ${words(n % 10)}` : ''}`;
	if (n < 200) return `seratus${n - 100 ? ` ${words(n - 100)}` : ''}`;
	if (n < 1000) return `${words(n / 100)} ratus${n % 100 ? ` ${words(n % 100)}` : ''}`;
	if (n < 2000) return `seribu${n - 1000 ? ` ${words(n - 1000)}` : ''}`;
	if (n < 1e6) return `${words(n / 1000)} ribu${n % 1000 ? ` ${words(n % 1000)}` : ''}`;
	if (n < 1e9) return `${words(n / 1e6)} juta${n % 1e6 ? ` ${words(n % 1e6)}` : ''}`;
	if (n < 1e12) return `${words(n / 1e9)} miliar${n % 1e9 ? ` ${words(n % 1e9)}` : ''}`;
	return `${words(n / 1e12)} triliun${n % 1e12 ? ` ${words(n % 1e12)}` : ''}`;
}

/** Terbilang rupiah (dokumen tagihan berbahasa Indonesia, referensi). */
export function terbilang(n: number): string {
	const s = n > 0 ? `${words(n)} rupiah` : 'nol rupiah';
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Pembayaran yang menunggu verifikasi staf keuangan. */
export const pendingProof = (d: InvoiceDetail | null) =>
	d?.payments.find((p) => p.method === 'manual_transfer' && p.status === 'pending') ?? null;
