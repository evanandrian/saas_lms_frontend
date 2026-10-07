/**
 * Model & fungsi turunan dashboard platform (FE-07, acuan `FLIXARE App v3.html` layar 04).
 * Halaman menerima data mentah; ringkasan, SLA, kapasitas cluster, tinggi batang pendapatan,
 * tren, dan porsi penagihan dihitung di sini.
 */

export type PeriodKey = '7' | '30' | '90';
export const PERIOD_KEYS: readonly PeriodKey[] = ['7', '30', '90'];

export interface PeriodMetric {
	readonly label: string;
	readonly value: string;
	readonly note: string;
	/** `progress` = catatan positif (hijau di hero). */
	readonly tone: 'progress' | 'muted';
}

export interface TenantApplication {
	readonly id: string;
	readonly name: string;
	readonly meta: string;
	readonly typeLabel: string;
	readonly students: number | null;
	/** Umur pengajuan dalam jam. */
	readonly ageHours: number;
	readonly databaseName: string;
}

export interface DatabaseCluster {
	readonly name: string;
	readonly usedUnits: number;
}

export type ProvisioningStatus = 'OK' | 'RETRY' | 'RUN';

export interface ProvisioningEntry {
	readonly id: string;
	readonly timeLabel: string;
	readonly status: ProvisioningStatus;
	readonly database: string;
	readonly durationLabel: string;
}

export interface RevenueMonth {
	readonly label: string;
	readonly amountMillions: number;
	readonly paidInvoices: number;
	/** Bulan berjalan (belum tutup buku). */
	readonly inProgress?: boolean;
}

export type InvoiceStatus = 'paid' | 'unpaid' | 'overdue';

export interface InvoiceBucket {
	readonly status: InvoiceStatus;
	readonly count: number;
	readonly amountMillions: number;
}

export type ChurnLevel = 'high' | 'medium' | 'low';

export interface ChurnRisk {
	readonly name: string;
	readonly reason: string;
	readonly level: ChurnLevel;
}

export interface PlatformDashboardData {
	/** Tanggal hari ini `YYYY-MM-DD` (WIB). */
	readonly date: string;
	/** Jam awal data contoh (detik sejak tengah malam WIB); `null` = jam nyata. */
	readonly clockStartSeconds: number | null;
	readonly servicesHealthy: boolean;
	readonly snapshotLabel: string;
	readonly defaultPeriod: PeriodKey;
	readonly metricsByPeriod: Readonly<Record<PeriodKey, readonly PeriodMetric[]>>;
	readonly applications: readonly TenantApplication[];
	/** Target layanan peninjauan pengajuan (jam). */
	readonly slaHours: number;
	readonly clusterCapacityUnits: number;
	/** Ambang peringatan pemakaian cluster (%). */
	readonly clusterWarningPercent: number;
	readonly clusters: readonly DatabaseCluster[];
	readonly provisioningTargetMinutes: number;
	readonly provisioningLog: readonly ProvisioningEntry[];
	readonly revenueYear: number;
	readonly revenue: readonly RevenueMonth[];
	readonly billingMonthLabel: string;
	readonly invoices: readonly InvoiceBucket[];
	readonly churn: readonly ChurnRisk[];
}

const HOURS_PER_DAY = 24;
const PERCENT = 100;
/** Pengajuan berumur ≥ 2/3 SLA ditandai peringatan (48 dari 72 jam di referensi). */
const SLA_WARNING_RATIO = 2 / 3;
export const CLUSTER_SEGMENTS = 20;
const REVENUE_MAX_BAR_PX = 120;
export const PROVISIONING_LOG_LIMIT = 6;

export type AgeUnit = { readonly unit: 'days' | 'hours'; readonly value: number };

export const applicationAge = (hours: number): AgeUnit =>
	hours >= HOURS_PER_DAY
		? { unit: 'days', value: Math.floor(hours / HOURS_PER_DAY) }
		: { unit: 'hours', value: hours };

export type SlaTone = 'breach' | 'warning' | 'ok';

export function slaStatus(ageHours: number, slaHours: number) {
	const tone: SlaTone =
		ageHours >= slaHours ? 'breach' : ageHours >= slaHours * SLA_WARNING_RATIO ? 'warning' : 'ok';
	return { percent: Math.min(PERCENT, Math.round((ageHours / slaHours) * PERCENT)), tone };
}

export function clusterUsage(cluster: DatabaseCluster, capacity: number, warningPercent: number) {
	const percent = Math.round((cluster.usedUnits / capacity) * PERCENT);
	return {
		...cluster,
		percent,
		warning: percent >= warningPercent,
		filledSegments: Math.round((percent / PERCENT) * CLUSTER_SEGMENTS)
	};
}

export function revenueBars(months: readonly RevenueMonth[]) {
	const max = Math.max(...months.map((month) => month.amountMillions), 1);
	return months.map((month) => ({
		...month,
		heightPx: Math.round((month.amountMillions / max) * REVENUE_MAX_BAR_PX)
	}));
}

/** Tren bulan tutup buku terakhir terhadap bulan sebelumnya. */
export function revenueTrend(months: readonly RevenueMonth[]) {
	const closed = months.filter((month) => !month.inProgress);
	const latest = closed.at(-1);
	const previous = closed.at(-2);
	if (!latest || !previous || previous.amountMillions === 0) return null;
	return {
		percent:
			((latest.amountMillions - previous.amountMillions) / previous.amountMillions) * PERCENT,
		previousLabel: previous.label
	};
}

/** Indeks bulan tutup buku terakhir (pilihan awal grafik). */
export function latestClosedIndex(months: readonly RevenueMonth[]): number {
	for (let index = months.length - 1; index >= 0; index -= 1) {
		if (!months[index]?.inProgress) return index;
	}
	return Math.max(0, months.length - 1);
}

export function invoiceShares(invoices: readonly InvoiceBucket[]) {
	const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amountMillions, 0);
	return {
		totalCount: invoices.reduce((sum, invoice) => sum + invoice.count, 0),
		items: invoices.map((invoice) => ({
			...invoice,
			sharePercent: totalAmount ? (invoice.amountMillions / totalAmount) * PERCENT : 0
		}))
	};
}

export const formatMillions = (value: number, locale: string) =>
	new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);

export const formatPercentOneDecimal = (value: number, locale: string) =>
	new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
		value
	);
