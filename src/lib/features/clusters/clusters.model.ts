import type {
	ClusterBackup,
	ClusterDatabaseList,
	ClusterDatabaseListItemsItem,
	ClusterInput,
	ClusterInputStatus,
	ClusterList,
	ClusterRegion,
	ClusterSSLMode,
	ClusterStatus,
	ClusterTestInput,
	ClusterTestResult,
	ClusterView
} from '$lib/api/generated/lms';

/**
 * Model Cluster DB (client-safe; referensi "04g Cluster DB"). Validasi di sini hanya cermin UX dari
 * `internal/platform/cluster/validate.go`; backend tetap otoritas (status `full`, kapasitas, uji ulang).
 */
export type {
	ClusterBackup,
	ClusterDatabaseList,
	ClusterInput,
	ClusterInputStatus,
	ClusterList,
	ClusterRegion,
	ClusterSSLMode,
	ClusterStatus,
	ClusterTestInput,
	ClusterTestResult,
	ClusterView
};
export type ClusterDatabase = ClusterDatabaseListItemsItem;

/** Isu sintetis dari action server: kode kelas error koneksi (`connection_failed`/`cluster_unreachable`). */
export const CONNECTION_ISSUE_FIELD = 'connection';

export const SSL_MODES: readonly ClusterSSLMode[] = ['verify-full', 'require', 'disable'];
export const BACKUP_SCHEDULES = ['6h', 'daily', 'weekly'] as const;
export type BackupSchedule = (typeof BACKUP_SCHEDULES)[number];
export const RETENTION_DAYS = [7, 14, 30, 90] as const;
export type RetentionDays = (typeof RETENTION_DAYS)[number];
/** Status yang bisa dipilih staf; `full` dihitung server, `retired` tidak dikelola di layar ini. */
export const INPUT_STATUSES: readonly ClusterInputStatus[] = [
	'available',
	'draining',
	'maintenance'
];
export const CONNECTION_ERROR_CODES = [
	'connection_dns',
	'connection_refused',
	'connection_auth',
	'connection_tls',
	'connection_timeout',
	'connection_failed'
] as const;

export const CAPACITY_SEGMENTS = 20;
export const PORT_MAX = 65535;
export const POOL_MIN = 5;
export const POOL_MAX = 100;
export const WARN_MIN = 50;
export const WARN_MAX = 95;
export const WARN_STEP = 5;
const PASSWORD_MIN = 12;
const ADMIN_USER_MIN = 3;
const HOST_MAX = 253;
const PERCENT = 100;

/** Nilai awal cluster baru (keputusan: tanpa nama/host contoh; status awal Drain seperti referensi). */
const NEW_CLUSTER_DEFAULTS = {
	port: '5432',
	ssl_mode: 'verify-full',
	max_databases: '200',
	pool_size: '20',
	warn_pct: 70,
	status: 'draining',
	backup_schedule: 'daily',
	backup_retention_days: 30,
	pitr: true
} as const;

const CODE_PATTERN = /^[a-z0-9-]{4,24}$/;
const HOST_PATTERN =
	/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const IPV6_PATTERN = /^[0-9a-fA-F:.]+$/;

/** Draft form; angka disimpan sebagai string agar input kosong dapat divalidasi. */
export interface ClusterDraft {
	code: string;
	region_code: string;
	host: string;
	port: string;
	admin_user: string;
	password: string;
	ssl_mode: ClusterSSLMode;
	max_databases: string;
	pool_size: string;
	warn_pct: number;
	status: ClusterInputStatus;
	backup_schedule: BackupSchedule;
	backup_retention_days: RetentionDays;
	pitr: boolean;
}

/** Isian yang bila diubah membatalkan hasil uji koneksi. */
export const CONNECTION_FIELDS: readonly (keyof ClusterDraft)[] = [
	'host',
	'port',
	'admin_user',
	'password',
	'ssl_mode'
];

/** Cluster `full` ditampilkan sebagai "Menerima tenant" (server menghitung ulang penuh/tidaknya). */
export function inputStatus(status: ClusterStatus): ClusterInputStatus {
	if (status === 'full') return 'available';
	return (INPUT_STATUSES as readonly string[]).includes(status)
		? (status as ClusterInputStatus)
		: 'draining';
}

export function draftFromView(v: ClusterView): ClusterDraft {
	return {
		code: v.code,
		region_code: v.region_code,
		host: v.host,
		port: String(v.port),
		admin_user: v.admin_user,
		password: '',
		ssl_mode: v.ssl_mode,
		max_databases: String(v.max_databases),
		pool_size: String(v.pool_size),
		warn_pct: v.warn_pct,
		status: inputStatus(v.status),
		backup_schedule: v.backup_schedule,
		backup_retention_days: v.backup_retention_days,
		pitr: v.pitr
	};
}

export function blankDraft(regions: readonly ClusterRegion[]): ClusterDraft {
	return {
		code: '',
		region_code: regions[0]?.code ?? '',
		host: '',
		admin_user: '',
		password: '',
		...NEW_CLUSTER_DEFAULTS
	};
}

export function toInput(d: ClusterDraft, isNew: boolean): ClusterInput {
	const input: ClusterInput = {
		region_code: d.region_code,
		host: d.host.trim(),
		port: Number(d.port),
		admin_user: d.admin_user.trim(),
		ssl_mode: d.ssl_mode,
		max_databases: Number(d.max_databases),
		pool_size: Number(d.pool_size),
		warn_pct: d.warn_pct,
		status: d.status,
		backup_schedule: d.backup_schedule,
		backup_retention_days: d.backup_retention_days,
		pitr: d.pitr
	};
	if (isNew) input.code = d.code;
	if (d.password) input.password = d.password;
	return input;
}

export function toTestInput(d: ClusterDraft, clusterId: string | null): ClusterTestInput {
	return {
		...(clusterId ? { cluster_id: clusterId } : {}),
		host: d.host.trim(),
		port: Number(d.port),
		admin_user: d.admin_user.trim(),
		...(d.password ? { password: d.password } : {}),
		ssl_mode: d.ssl_mode
	};
}

/** Kunci i18n `clusters.errors.<key>`. */
export type ClusterErrorKey =
	| 'code_format'
	| 'code_taken'
	| 'region_required'
	| 'host_invalid'
	| 'port_range'
	| 'user_required'
	| 'user_short'
	| 'password_required'
	| 'password_short'
	| 'max_required'
	| 'max_below_used'
	| 'pool_range'
	| 'warn_range'
	| 'invalid'
	| 'test_required';
export type ClusterErrorField = keyof ClusterDraft | 'test';
export type ClusterErrors = Partial<Record<ClusterErrorField, ClusterErrorKey>>;

/** Isian yang divalidasi langsung saat diketik (referensi); lainnya setelah tombol simpan ditekan. */
export const LIVE_FIELDS: readonly ClusterErrorField[] = [
	'code',
	'port',
	'max_databases',
	'pool_size'
];

export function validHost(host: string): boolean {
	if (!host || host.length > HOST_MAX) return false;
	return HOST_PATTERN.test(host) || (host.includes(':') && IPV6_PATTERN.test(host));
}

const inRange = (value: string, min: number, max: number) => {
	const n = Number(value);
	return value !== '' && Number.isInteger(n) && n >= min && n <= max;
};

export interface ValidationContext {
	isNew: boolean;
	used: number;
	takenCodes: readonly string[];
	testOk: boolean;
}

/** Validasi UX (cermin referensi `errs()` & `validate.go`). */
export function validateDraft(d: ClusterDraft, ctx: ValidationContext): ClusterErrors {
	const e: ClusterErrors = {};
	if (ctx.isNew) {
		if (!CODE_PATTERN.test(d.code)) e.code = 'code_format';
		else if (ctx.takenCodes.includes(d.code)) e.code = 'code_taken';
	}
	if (!d.region_code) e.region_code = 'region_required';
	if (!validHost(d.host.trim())) e.host = 'host_invalid';
	if (!inRange(d.port, 1, PORT_MAX)) e.port = 'port_range';
	const user = d.admin_user.trim();
	if (!user) e.admin_user = 'user_required';
	else if ([...user].length < ADMIN_USER_MIN) e.admin_user = 'user_short';
	if (ctx.isNew && !d.password) e.password = 'password_required';
	else if (d.password && [...d.password].length < PASSWORD_MIN) e.password = 'password_short';
	const max = Number(d.max_databases);
	if (!(max > 0)) e.max_databases = 'max_required';
	else if (max < ctx.used) e.max_databases = 'max_below_used';
	if (!inRange(d.pool_size, POOL_MIN, POOL_MAX)) e.pool_size = 'pool_range';
	if (d.warn_pct < WARN_MIN || d.warn_pct > WARN_MAX || d.warn_pct % WARN_STEP !== 0) {
		e.warn_pct = 'warn_range';
	}
	if (ctx.isNew && !ctx.testOk) e.test = 'test_required';
	return e;
}

const DRAFT_FIELDS: Readonly<Record<string, keyof ClusterDraft>> = {
	code: 'code',
	region_code: 'region_code',
	host: 'host',
	port: 'port',
	admin_user: 'admin_user',
	password: 'password',
	ssl_mode: 'ssl_mode',
	max_databases: 'max_databases',
	pool_size: 'pool_size',
	warn_pct: 'warn_pct',
	status: 'status',
	backup_schedule: 'backup_schedule',
	backup_retention_days: 'backup_retention_days'
};

/** Isu backend `{field, code}` → isian + pesan form (kode tak dikenal → pesan umum isian). */
export function serverIssueError(
	field: string,
	code: string
): { field: keyof ClusterDraft; key: ClusterErrorKey } | null {
	const target = DRAFT_FIELDS[field];
	if (!target) return null;
	const byField: Partial<Record<keyof ClusterDraft, ClusterErrorKey>> = {
		code: code === 'code_taken' ? 'code_taken' : 'code_format',
		region_code: 'region_required',
		host: 'host_invalid',
		port: 'port_range',
		admin_user: code === 'too_short' ? 'user_short' : 'user_required',
		password: code === 'required' ? 'password_required' : 'password_short',
		max_databases: code === 'below_used' ? 'max_below_used' : 'max_required',
		pool_size: 'pool_range',
		warn_pct: 'warn_range'
	};
	return { field: target, key: byField[target] ?? 'invalid' };
}

export function connectionErrorKey(code: string): (typeof CONNECTION_ERROR_CODES)[number] {
	return (CONNECTION_ERROR_CODES as readonly string[]).includes(code)
		? (code as (typeof CONNECTION_ERROR_CODES)[number])
		: 'connection_failed';
}

// ===== Kapasitas =====

export const usagePct = (used: number, max: number) =>
	max > 0 ? Math.round((used / max) * PERCENT) : 0;

/** Cermin `AboveWarning` backend: used/max*100 ≥ ambang, tanpa pembulatan. */
export const aboveWarning = (used: number, max: number, warnPct: number) =>
	max > 0 && used * PERCENT >= max * warnPct;

/** Jumlah DB saat peringatan dikirim (referensi `Math.ceil(max * warn / 100)`). */
export const warnAt = (max: number, warnPct: number) => Math.ceil((max * warnPct) / PERCENT);

export const filledSegments = (pct: number) =>
	Math.min(CAPACITY_SEGMENTS, Math.round(pct / (PERCENT / CAPACITY_SEGMENTS)));

// ===== Format tampilan =====

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
const BYTE_STEP = 1024;
const TIME_ZONE = 'Asia/Jakarta';

export const localeTag = (locale: string) => (locale === 'en' ? 'en-GB' : 'id-ID');

export function formatBytes(bytes: number, locale: string): string {
	let value = Math.max(0, bytes);
	let unit = 0;
	while (value >= BYTE_STEP && unit < BYTE_UNITS.length - 1) {
		value /= BYTE_STEP;
		unit += 1;
	}
	const digits = unit === 0 ? 0 : 1;
	const number = new Intl.NumberFormat(localeTag(locale), {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	}).format(value);
	return `${number} ${BYTE_UNITS[unit]}`;
}

export const regionLabel = (name: string, zone: string) => (zone ? `${name} · ${zone}` : name);

/** Waktu snapshot dalam WIB (zona operasional platform). */
export function formatJakartaTime(iso: string, locale: string): string {
	return new Intl.DateTimeFormat(localeTag(locale), {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: TIME_ZONE
	}).format(new Date(iso));
}

const RELATIVE_STEPS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
	['second', 60],
	['minute', 60],
	['hour', 24],
	['day', 30],
	['month', 12],
	['year', Number.POSITIVE_INFINITY]
];

export function relativeTime(iso: string, now: number, locale: string): string {
	let delta = (new Date(iso).getTime() - now) / 1000;
	const format = new Intl.RelativeTimeFormat(localeTag(locale), { numeric: 'auto' });
	for (const [unit, size] of RELATIVE_STEPS) {
		if (Math.abs(delta) < size) return format.format(Math.round(delta), unit);
		delta /= size;
	}
	return format.format(Math.round(delta), 'year');
}
