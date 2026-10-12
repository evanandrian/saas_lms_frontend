import type { TranslationParams } from '$lib/i18n';
import { APP_TIME_ZONE, intlLocale } from '$lib/utils/format';
import type { AuditActorOption, AuditEntry, ListPlatformAuditParams } from './platform-audit.types';

/** Model UX Audit log platform (referensi v4 "04h Audit Log"): filter ↔ query URL/API, format WIB, label i18n. */
export const PREFIX = 'audit_log';

export const AUDIT_RANGES = ['today', '7', '30', 'custom'] as const;
export type AuditRange = (typeof AUDIT_RANGES)[number];
export const DEFAULT_RANGE: AuditRange = '7';
/** Rentang yang dipakai tombol "Aktivitas pelaku ini". */
export const ACTOR_ACTIVITY_RANGE: AuditRange = '30';

export const AUDIT_SEVERITIES = ['info', 'warn', 'crit'] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

/** Kode modul yang diterima filter backend (`activity.Modules`); `other` hanya muncul di entri. */
export const AUDIT_MODULES = [
	'applications',
	'tenants',
	'invoices',
	'payments',
	'clusters',
	'plans',
	'auth',
	'master_data',
	'navigation',
	'audit'
] as const;

export const ACTOR_SYSTEM = 'system';
export const ACTOR_GATEWAY = 'gateway';

/** Ukuran halaman = default backend (`limit` 10); "Muat 10 lagi" memakai cursor `next_before`. */
export const PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 300;
export const TOAST_MS = 5000;
export const MAX_QUERY_LENGTH = 200;
/** Rentang kustom bawaan saat "Atur" dipilih: 7 hari terakhir (hari ini + 6 hari sebelumnya). */
export const CUSTOM_DEFAULT_DAYS = 6;

export const AUDIT_TIME_ZONE = APP_TIME_ZONE;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export interface AuditFilters {
	q: string;
	actor: string;
	range: AuditRange;
	from: string;
	to: string;
	modules: string[];
	severities: AuditSeverity[];
	failed: boolean;
}

export const emptyFilters = (): AuditFilters => ({
	q: '',
	actor: '',
	range: DEFAULT_RANGE,
	from: '',
	to: '',
	modules: [],
	severities: [],
	failed: false
});

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const list = (v: unknown): string[] =>
	(Array.isArray(v) ? v : text(v).split(',')).map((x) => text(x)).filter(Boolean);
const unique = <T>(xs: T[]) => [...new Set(xs)];

const isRange = (v: string): v is AuditRange => (AUDIT_RANGES as readonly string[]).includes(v);
const isSeverity = (v: string): v is AuditSeverity =>
	(AUDIT_SEVERITIES as readonly string[]).includes(v);
const isModule = (v: string) => (AUDIT_MODULES as readonly string[]).includes(v);

export const isValidActor = (v: string) =>
	v === ACTOR_SYSTEM || v === ACTOR_GATEWAY || UUID_PATTERN.test(v);

/** Normalisasi filter dari body aksi / query URL: nilai tak dikenal dibuang agar backend tidak 400. */
export function sanitizeFilters(raw: unknown): AuditFilters {
	const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	const range = text(r.range);
	const actor = text(r.actor);
	const from = text(r.from);
	const to = text(r.to);
	const custom = range === 'custom';
	return {
		q: text(r.q).slice(0, MAX_QUERY_LENGTH),
		actor: isValidActor(actor) ? actor : '',
		range: isRange(range) ? range : DEFAULT_RANGE,
		from: custom && DATE_PATTERN.test(from) ? from : '',
		to: custom && DATE_PATTERN.test(to) ? to : '',
		modules: unique(list(r.modules ?? r.module).filter(isModule)),
		severities: unique(list(r.severities ?? r.severity).filter(isSeverity)),
		failed: r.failed === true || r.failed === 'true'
	};
}

/** Query URL halaman = nama parameter API; nilai bawaan tidak ditulis agar URL ringkas. */
export function filtersToQuery(f: AuditFilters): URLSearchParams {
	const p = new URLSearchParams();
	if (f.q) p.set('q', f.q);
	if (f.actor) p.set('actor', f.actor);
	if (f.range !== DEFAULT_RANGE) p.set('range', f.range);
	if (f.range === 'custom') {
		if (f.from) p.set('from', f.from);
		if (f.to) p.set('to', f.to);
	}
	if (f.modules.length) p.set('module', f.modules.join(','));
	if (f.severities.length) p.set('severity', f.severities.join(','));
	if (f.failed) p.set('failed', 'true');
	return p;
}

export const filtersFromQuery = (params: URLSearchParams): AuditFilters =>
	sanitizeFilters(Object.fromEntries(params.entries()));

export function toApiParams(f: AuditFilters, before?: number | null): ListPlatformAuditParams {
	const out: Record<string, string | number> = {};
	for (const [key, value] of filtersToQuery(f)) out[key] = value;
	if (before) out.before = before;
	out.limit = PAGE_SIZE;
	return out as ListPlatformAuditParams;
}

export const hasActiveFilters = (f: AuditFilters) =>
	Boolean(
		f.q ||
		f.actor ||
		f.range !== DEFAULT_RANGE ||
		f.modules.length ||
		f.severities.length ||
		f.failed
	);

/** Rentang kustom terbalik (validasi UX; backend juga menolak dengan `to/range_invalid`). */
export const rangeInvalid = (f: AuditFilters) =>
	f.range === 'custom' && Boolean(f.from && f.to && f.from > f.to);

// ===== Tanggal & waktu (WIB) =====

/** Tanggal hari ini di Asia/Jakarta, format `YYYY-MM-DD`. */
export function todayWib(now = new Date()): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: AUDIT_TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(now);
}

export function shiftDate(date: string, days: number): string {
	const t = Date.parse(`${date}T00:00:00Z`) + days * MS_PER_DAY;
	return new Date(t).toISOString().slice(0, 10);
}

function parts(iso: string, locale: string, options: Intl.DateTimeFormatOptions) {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	const out: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
	for (const p of new Intl.DateTimeFormat(intlLocale(locale), {
		timeZone: AUDIT_TIME_ZONE,
		...options
	}).formatToParts(d))
		out[p.type] = p.value;
	return out;
}

/** Jam WIB `HH:mm:ss` (pemisah titik dua di semua locale, seperti referensi). */
export function formatTime(iso: string, locale: string): string {
	const p = parts(iso, locale, {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	});
	return p ? `${p.hour}:${p.minute}:${p.second}` : '—';
}

// ===== Label =====

type Translate = (key: string, params?: TranslationParams) => string;

/** Terjemahan dengan cadangan: kunci yang tidak ada di i18n → `fallback`. */
function translateOr(t: Translate, key: string, fallback: string, params?: TranslationParams) {
	const value = t(key, params);
	return value === key ? fallback : value;
}

const MASTER_ACTION = /^master_data\.([a-z_]+)\.(create|update|delete)$/;

/** Label aksi dari kode mentah backend; kode yang belum punya terjemahan tampil apa adanya. */
export function actionLabel(t: Translate, action: string): string {
	const master = MASTER_ACTION.exec(action);
	if (master) {
		const [, code = '', verb = ''] = master;
		const name = translateOr(
			t,
			`master_data.masters.${code}.name`,
			translateOr(t, `${PREFIX}.masters.${code}`, code)
		);
		return t(`${PREFIX}.master_action.${verb}`, { master: name });
	}
	return translateOr(t, `${PREFIX}.actions.${action}`, action);
}

/** Catatan entri; alasan gagal masuk (`auth.login_failed`) dikirim sebagai kode → teks i18n. */
export function noteText(t: Translate, entry: Pick<AuditEntry, 'action' | 'note'>): string {
	if (!entry.note) return '';
	if (entry.action === 'auth.login_failed')
		return translateOr(t, `${PREFIX}.login_reason.${entry.note}`, entry.note);
	return entry.note;
}

export const moduleLabel = (t: Translate, code: string) =>
	translateOr(t, `${PREFIX}.modules.${code}`, code);

/** Kunci filter pelaku dari entri: UUID user, atau `system`/`gateway`. */
export const actorKey = (actor: AuditEntry['actor']) =>
	actor.type === 'user' ? (actor.id ?? '') : actor.type;

/** Nama pelaku; sistem & payment gateway dikirim kosong oleh backend → label i18n. */
export function actorName(
	t: Translate,
	actor: Pick<AuditEntry['actor'], 'type' | 'name'> & { email?: string }
): string {
	if (actor.type === ACTOR_SYSTEM || actor.type === ACTOR_GATEWAY)
		return t(`${PREFIX}.actor.${actor.type}`);
	return actor.name || actor.email || t(`${PREFIX}.actor.unknown`);
}

export const actorOptionName = (t: Translate, option: AuditActorOption) =>
	actorName(t, { type: option.type, name: option.name });

/** Warna avatar deterministik dari token nada lms (tanpa palet hex). */
const USER_AVATAR_TONES = ['lms-tone-info', 'lms-tone-success', 'lms-tone-warning'] as const;
export function avatarTone(actor: AuditEntry['actor']): string {
	if (actor.type === ACTOR_SYSTEM) return 'bg-lms-surface-muted text-lms-muted';
	if (actor.type === ACTOR_GATEWAY) return 'bg-lms-interactive text-lms-on-interactive';
	const key = actor.id ?? actor.email;
	let hash = 0;
	for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
	return USER_AVATAR_TONES[hash % USER_AVATAR_TONES.length] ?? USER_AVATAR_TONES[0];
}

export const SEVERITY_TONE: Record<AuditSeverity, string> = {
	info: 'lms-tone-info',
	warn: 'lms-tone-warning',
	crit: 'lms-tone-danger'
};

/** Titik & garis chip filter tingkat. */
export const SEVERITY_DOT: Record<AuditSeverity, string> = {
	info: 'bg-lms-interactive',
	warn: 'bg-lms-warning-text',
	crit: 'bg-lms-danger-text'
};
export const SEVERITY_ACTIVE: Record<AuditSeverity, string> = {
	info: 'border-lms-interactive bg-lms-interactive-subtle',
	warn: 'border-lms-warning-text bg-lms-warning-subtle',
	crit: 'border-lms-danger-text bg-lms-danger-subtle'
};
