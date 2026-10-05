import type {
	MasterKind,
	MasterRecord,
	MasterStatus,
	SaveMasterRecordRequest
} from '$lib/api/generated/lms';
import type { LucideIcon } from '@lucide/svelte';
import BellRing from '@lucide/svelte/icons/bell-ring';
import BookMarked from '@lucide/svelte/icons/book-marked';
import BookOpen from '@lucide/svelte/icons/book-open';
import Building2 from '@lucide/svelte/icons/building-2';
import CalendarRange from '@lucide/svelte/icons/calendar-range';
import KeyRound from '@lucide/svelte/icons/key-round';
import Layers from '@lucide/svelte/icons/layers';
import Shapes from '@lucide/svelte/icons/shapes';
import Shield from '@lucide/svelte/icons/shield';
import Signal from '@lucide/svelte/icons/signal';
import UserRound from '@lucide/svelte/icons/user-round';

export type {
	MasterIssue,
	MasterKind,
	MasterRecord,
	MasterStatus,
	MasterSubjectGroup,
	MasterUsage,
	SaveMasterRecordRequest
} from '$lib/api/generated/lms';

/** Tenant platform (lms_core): sah sebagai tenant pengguna walau tidak tampil di master Institusi. */
export const PLATFORM_TENANT_CODE = 'lms_core';

/** Variabel template notifikasi (cermin `notificationVariables` backend & referensi VARS). */
export const NOTIFICATION_VARIABLES = [
	'nama_siswa',
	'nama_tugas',
	'tenggat',
	'nama_kelas',
	'nilai',
	'nama_sekolah'
] as const;

/** Jenis isian form (cermin tipe isian referensi DataMaster). */
export type FieldType =
	| 'text'
	| 'code'
	| 'key'
	| 'email'
	| 'tel'
	| 'number'
	| 'date'
	| 'textarea'
	| 'select'
	| 'seg'
	| 'toggle'
	| 'chips';

export type FieldKey =
	| 'name'
	| 'code'
	| 'description'
	| 'sort_order'
	| 'version'
	| 'subject_group'
	| 'education_level_code'
	| 'curriculum_code'
	| 'tenant_type_code'
	| 'email'
	| 'phone'
	| 'data_region'
	| 'address'
	| 'start_date'
	| 'end_date'
	| 'is_current'
	| 'account_kind'
	| 'tenant_code'
	| 'role_code'
	| 'note'
	| 'scope'
	| 'module'
	| 'action'
	| 'channels'
	| 'subject'
	| 'body';

/** Grup label i18n `master_data.options.<group>.<value>` untuk pilihan tetap. */
export type OptionGroup =
	'groups' | 'regions' | 'kinds' | 'scopes' | 'modules' | 'actions' | 'channels';

export interface MasterField {
	key: FieldKey;
	type: FieldType;
	required?: boolean;
	full?: boolean;
	/** Sumber pilihan select dari master lain. */
	source?: MasterKind;
	/** Pilihan tetap untuk `seg`/`select`/`chips`. */
	options?: readonly string[];
	optionGroup?: OptionGroup;
	/** Ada placeholder i18n `master_data.fields.<master>.<key>_ph`. */
	placeholder?: boolean;
	/** Ada catatan bantuan i18n `master_data.fields.<master>.<key>_help`. */
	help?: boolean;
	/** Select boleh kosong (label i18n `..._none`). */
	optional?: boolean;
}

export type MasterSection = 'platform' | 'academic' | 'identity';

export interface MasterDefinition {
	kind: MasterKind;
	section: MasterSection;
	icon: LucideIcon;
	/** Kolom yang diringkas di baris daftar (referensi `meta`). */
	meta: readonly FieldKey[];
	fields: readonly MasterField[];
}

export const MASTER_STATUSES: readonly MasterStatus[] = ['active', 'inactive', 'archived'];
const SUBJECT_GROUPS = ['wajib', 'peminatan', 'muatan_lokal'] as const;
const DATA_REGIONS = ['jakarta', 'bandung', 'surabaya'] as const;
const ACCOUNT_KINDS = ['human', 'system'] as const;
const ROLE_SCOPES = ['platform', 'tenant', 'user'] as const;
const PERMISSION_MODULES = [
	'platform',
	'nilai',
	'pengguna',
	'kelas',
	'tugas',
	'ujian',
	'rapor'
] as const;
const PERMISSION_ACTIONS = ['read', 'create', 'update', 'delete', 'manage'] as const;
export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'push', 'whatsapp'] as const;

const name = (o: Partial<MasterField> = {}): MasterField => ({
	key: 'name',
	type: 'text',
	required: true,
	...o
});
const code = (o: Partial<MasterField> = {}): MasterField => ({
	key: 'code',
	type: 'code',
	required: true,
	...o
});
const description = (type: FieldType = 'textarea'): MasterField => ({
	key: 'description',
	type,
	full: true
});

/**
 * 11 master referensi FLIXARE App v3 · DataMaster (keputusan pemilik 5 Okt 2026), urutan = referensi.
 * Teks (nama, deskripsi, label isian) lewat i18n `master_data.masters.<kind>` / `master_data.fields.<kind>`.
 */
export const MASTER_DEFINITIONS: readonly MasterDefinition[] = [
	{
		kind: 'institution',
		section: 'platform',
		icon: Building2,
		meta: ['tenant_type_code', 'education_level_code', 'data_region'],
		fields: [
			name({ full: true }),
			code({ help: true }),
			{ key: 'tenant_type_code', type: 'select', source: 'tenant_type', required: true },
			{ key: 'education_level_code', type: 'select', source: 'education_level', optional: true },
			{ key: 'email', type: 'email', required: true, placeholder: true },
			{ key: 'phone', type: 'tel', placeholder: true },
			{
				key: 'data_region',
				type: 'seg',
				options: DATA_REGIONS,
				optionGroup: 'regions',
				full: true,
				help: true
			},
			{ key: 'address', type: 'textarea', full: true }
		]
	},
	{
		kind: 'tenant_type',
		section: 'platform',
		icon: Shapes,
		meta: ['description'],
		fields: [name(), code({ help: true }), description()]
	},
	{
		kind: 'education_level',
		section: 'platform',
		icon: Layers,
		meta: ['sort_order', 'description'],
		fields: [
			name(),
			code(),
			{ key: 'sort_order', type: 'number', required: true, help: true },
			description('text')
		]
	},
	{
		kind: 'academic_year',
		section: 'academic',
		icon: CalendarRange,
		meta: ['start_date', 'end_date'],
		fields: [
			name({ placeholder: true, help: true }),
			code({ placeholder: true }),
			{ key: 'start_date', type: 'date', required: true },
			{ key: 'end_date', type: 'date', required: true },
			{ key: 'is_current', type: 'toggle', full: true, help: true }
		]
	},
	{
		kind: 'curriculum',
		section: 'academic',
		icon: BookMarked,
		meta: ['version', 'description'],
		fields: [
			name({ full: true }),
			code(),
			{ key: 'version', type: 'text', placeholder: true },
			description()
		]
	},
	{
		kind: 'subject',
		section: 'academic',
		icon: BookOpen,
		meta: ['subject_group', 'education_level_code'],
		fields: [
			name(),
			code(),
			{
				key: 'subject_group',
				type: 'seg',
				options: SUBJECT_GROUPS,
				optionGroup: 'groups',
				full: true
			},
			{ key: 'education_level_code', type: 'select', source: 'education_level', required: true },
			{ key: 'curriculum_code', type: 'select', source: 'curriculum', optional: true },
			description('text')
		]
	},
	{
		kind: 'grade_level',
		section: 'academic',
		icon: Signal,
		meta: ['education_level_code', 'sort_order'],
		fields: [
			name({ placeholder: true }),
			code(),
			{ key: 'education_level_code', type: 'select', source: 'education_level', required: true },
			{ key: 'sort_order', type: 'number', required: true }
		]
	},
	{
		kind: 'user',
		section: 'identity',
		icon: UserRound,
		meta: ['tenant_code', 'role_code'],
		fields: [
			name({ full: true }),
			code({ type: 'email', help: true }),
			{ key: 'phone', type: 'tel' },
			{
				key: 'account_kind',
				type: 'seg',
				options: ACCOUNT_KINDS,
				optionGroup: 'kinds',
				full: true,
				help: true
			},
			{ key: 'tenant_code', type: 'select', source: 'institution', required: true },
			{ key: 'role_code', type: 'select', source: 'role', required: true },
			{ key: 'note', type: 'textarea', full: true }
		]
	},
	{
		kind: 'role',
		section: 'identity',
		icon: Shield,
		meta: ['scope', 'description'],
		fields: [
			name(),
			code({ help: true }),
			{ key: 'scope', type: 'seg', options: ROLE_SCOPES, optionGroup: 'scopes', full: true },
			description()
		]
	},
	{
		kind: 'permission',
		section: 'identity',
		icon: KeyRound,
		meta: ['module', 'action'],
		fields: [
			{
				key: 'module',
				type: 'select',
				options: PERMISSION_MODULES,
				optionGroup: 'modules',
				required: true
			},
			{
				key: 'action',
				type: 'seg',
				options: PERMISSION_ACTIONS,
				optionGroup: 'actions',
				full: true
			},
			code({ type: 'key', full: true, help: true }),
			name({ full: true }),
			description()
		]
	},
	{
		kind: 'notification_template',
		section: 'identity',
		icon: BellRing,
		meta: ['channels'],
		fields: [
			name(),
			code({ type: 'key', placeholder: true }),
			{
				key: 'channels',
				type: 'chips',
				options: NOTIFICATION_CHANNELS,
				optionGroup: 'channels',
				required: true,
				full: true
			},
			{ key: 'subject', type: 'text', required: true, full: true },
			{ key: 'body', type: 'textarea', required: true, full: true }
		]
	}
];

export const MASTER_SECTIONS: readonly MasterSection[] = ['platform', 'academic', 'identity'];

export function masterDefinition(kind: MasterKind): MasterDefinition {
	return (
		MASTER_DEFINITIONS.find((m) => m.kind === kind) ?? (MASTER_DEFINITIONS[0] as MasterDefinition)
	);
}

export function isMasterKind(value: string): value is MasterKind {
	return MASTER_DEFINITIONS.some((m) => m.kind === value);
}

/** Jenis isian kunci (`code`) tiap master: kode, email (pengguna), atau kunci modul.aksi. */
export function codeType(kind: MasterKind): FieldType {
	return masterDefinition(kind).fields.find((f) => f.key === 'code')?.type ?? 'code';
}

/** Draft form; angka disimpan sebagai string agar input kosong dapat divalidasi. */
export interface MasterDraft {
	code: string;
	name: string;
	description: string;
	status: MasterStatus;
	sort_order: string;
	version: string;
	subject_group: string;
	education_level_code: string;
	curriculum_code: string;
	tenant_type_code: string;
	email: string;
	phone: string;
	data_region: string;
	address: string;
	start_date: string;
	end_date: string;
	is_current: boolean;
	account_kind: string;
	tenant_code: string;
	role_code: string;
	note: string;
	scope: string;
	module: string;
	action: string;
	channels: string[];
	subject: string;
	body: string;
	updated_at?: string;
}

/** Draft kosong; seg/select tetap/chips memakai pilihan pertama seperti referensi `blank()`. */
export function blankDraft(kind?: MasterKind): MasterDraft {
	const d: MasterDraft = {
		code: '',
		name: '',
		description: '',
		status: 'active',
		sort_order: '',
		version: '',
		subject_group: SUBJECT_GROUPS[0],
		education_level_code: '',
		curriculum_code: '',
		tenant_type_code: '',
		email: '',
		phone: '',
		data_region: DATA_REGIONS[0],
		address: '',
		start_date: '',
		end_date: '',
		is_current: false,
		account_kind: ACCOUNT_KINDS[0],
		tenant_code: '',
		role_code: '',
		note: '',
		scope: ROLE_SCOPES[0],
		module: '',
		action: PERMISSION_ACTIONS[0],
		channels: [],
		subject: '',
		body: ''
	};
	if (kind === 'permission') {
		d.module = PERMISSION_MODULES[1];
		d.code = permissionKey(d.module, d.action);
	}
	if (kind === 'notification_template') d.channels = [NOTIFICATION_CHANNELS[0]];
	// Institusi baru belum diprovisi: hanya boleh Nonaktif sampai database tenant siap.
	if (kind === 'institution') d.status = 'inactive';
	return d;
}

export function permissionKey(module: string, action: string): string {
	return `${module.toLowerCase()}.${action}`;
}

export function draftFromRecord(r: MasterRecord): MasterDraft {
	return {
		...blankDraft(),
		code: r.code,
		name: r.name,
		description: r.description,
		status: r.status,
		sort_order: r.sort_order === undefined ? '' : String(r.sort_order),
		version: r.version ?? '',
		subject_group: r.subject_group ?? SUBJECT_GROUPS[0],
		education_level_code: r.education_level_code ?? '',
		curriculum_code: r.curriculum_code ?? '',
		tenant_type_code: r.tenant_type_code ?? '',
		email: r.email ?? '',
		phone: r.phone ?? '',
		data_region: r.data_region ?? DATA_REGIONS[0],
		address: r.address ?? '',
		start_date: r.start_date ?? '',
		end_date: r.end_date ?? '',
		is_current: r.is_current ?? false,
		account_kind: r.account_kind ?? ACCOUNT_KINDS[0],
		tenant_code: r.tenant_code ?? '',
		role_code: r.role_code ?? '',
		note: r.note ?? '',
		scope: r.scope ?? ROLE_SCOPES[0],
		module: r.module ?? '',
		action: r.action ?? PERMISSION_ACTIONS[0],
		channels: [...(r.channels ?? [])],
		subject: r.subject ?? '',
		body: r.body ?? '',
		updated_at: r.updated_at
	};
}

type RequestValue = SaveMasterRecordRequest[keyof SaveMasterRecordRequest];

/** Payload simpan; hanya isian milik master yang dikirim (backend menolak isian tak dikenal). */
export function toSaveRequest(
	kind: MasterKind,
	d: MasterDraft,
	isNew: boolean
): SaveMasterRecordRequest {
	const body: Record<string, RequestValue> = {
		name: d.name.trim(),
		description: d.description.trim(),
		status: d.status as MasterStatus
	};
	if (isNew) body.code = d.code.trim();
	else body.updated_at = d.updated_at;
	for (const f of masterDefinition(kind).fields) {
		if (f.key === 'code' || f.key === 'name' || f.key === 'description') continue;
		const value = d[f.key];
		if (f.type === 'number') body[f.key] = Number(value);
		else if (typeof value === 'string') {
			const trimmed = value.trim();
			if (trimmed || !f.optional) body[f.key] = trimmed;
		} else body[f.key] = value as RequestValue;
	}
	return body as unknown as SaveMasterRecordRequest;
}

/** Normalisasi input kunci seperti referensi (kode huruf besar, kunci huruf kecil). */
export function normalizeCode(kind: MasterKind, value: string): string {
	if (kind === 'tenant_type') return value.toLowerCase().replace(/[^a-z0-9_]/g, '');
	if (kind === 'institution') return value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
	switch (codeType(kind)) {
		case 'key':
			return value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
		case 'email':
			return value.replace(/\s/g, '');
		default:
			return value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
	}
}

export type FieldErrorKey =
	| 'required'
	| 'channels_required'
	| 'code_upper'
	| 'code_lower'
	| 'code_grade'
	| 'code_institution'
	| 'key'
	| 'email'
	| 'tel'
	| 'number'
	| 'year_name'
	| 'end_date'
	| 'current_active'
	| 'unknown_vars'
	| 'duplicate'
	| 'server';
export interface FieldError {
	key: FieldErrorKey;
	other?: string;
	message?: string;
}

/** Pola cermin `validate.go` (backend tetap otoritas). */
const CODE_PATTERNS: Partial<Record<MasterKind, [RegExp, FieldErrorKey]>> = {
	tenant_type: [/^[a-z][a-z0-9_]{1,49}$/, 'code_lower'],
	institution: [/^[a-z0-9_-]{3,50}$/, 'code_institution'],
	grade_level: [/^[A-Z0-9_]{1,20}$/, 'code_grade']
};
const CODE_UPPER = /^[A-Z0-9_]{2,20}$/;
const KEY = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TEL = /^[0-9+\-\s]{8,16}$/;
const ACADEMIC_YEAR = /^(\d{4})\/(\d{4})$/;
const TEMPLATE_VAR = /\{\{(\w+)\}\}/g;

function formatError(kind: MasterKind, f: MasterField, value: string): FieldError | undefined {
	switch (f.type) {
		case 'code': {
			const [pattern, key] = CODE_PATTERNS[kind] ?? [CODE_UPPER, 'code_upper'];
			return pattern.test(value) ? undefined : { key };
		}
		case 'key':
			return KEY.test(value) ? undefined : { key: 'key' };
		case 'email':
			return EMAIL.test(value) ? undefined : { key: 'email' };
		case 'tel':
			return TEL.test(value) ? undefined : { key: 'tel' };
		case 'number':
			return Number(value) > 0 ? undefined : { key: 'number' };
	}
	return undefined;
}

/** Variabel `{{x}}` yang tidak dikenal di judul/isi template. */
export function unknownVariables(text: string): string[] {
	const out = new Set<string>();
	for (const m of text.matchAll(TEMPLATE_VAR)) {
		if (!(NOTIFICATION_VARIABLES as readonly string[]).includes(m[1] ?? '')) out.add(m[0]);
	}
	return [...out];
}

/** Validasi UX (cermin referensi `errs()` & `validate.go`; backend tetap otoritas). */
export function validateDraft(
	kind: MasterKind,
	d: MasterDraft,
	isNew: boolean,
	rows: readonly MasterRecord[]
): Partial<Record<FieldKey, FieldError>> {
	const errors: Partial<Record<FieldKey, FieldError>> = {};
	for (const f of masterDefinition(kind).fields) {
		if (f.key === 'code' && !isNew) continue;
		const raw = d[f.key];
		if (Array.isArray(raw)) {
			if (f.required && !raw.length) errors[f.key] = { key: 'channels_required' };
			continue;
		}
		if (typeof raw === 'boolean') continue;
		const value = raw.trim();
		if (f.required && !value) {
			errors[f.key] = { key: 'required' };
			continue;
		}
		if (!value) continue;
		const error = formatError(kind, f, value);
		if (error) {
			errors[f.key] = error;
			continue;
		}
		if (f.key === 'code') {
			const other = rows.find((r) => r.code.toLowerCase() === value.toLowerCase());
			if (other) errors.code = { key: 'duplicate', other: other.name };
		}
		if (kind === 'institution' && f.key === 'email') {
			const other = rows.find(
				(r) => r.code !== d.code && (r.email ?? '').toLowerCase() === value.toLowerCase()
			);
			if (other) errors.email = { key: 'duplicate', other: other.name };
		}
	}
	if (kind === 'academic_year') validateAcademicYear(d, rows, errors);
	if (kind === 'notification_template' && !errors.body) {
		const unknown = unknownVariables(`${d.subject} ${d.body}`);
		if (unknown.length) errors.body = { key: 'unknown_vars', other: unknown.join(', ') };
	}
	return errors;
}

function validateAcademicYear(
	d: MasterDraft,
	rows: readonly MasterRecord[],
	errors: Partial<Record<FieldKey, FieldError>>
) {
	const name = d.name.trim();
	if (name && !errors.name) {
		const m = ACADEMIC_YEAR.exec(name);
		if (!m || Number(m[2]) !== Number(m[1]) + 1) errors.name = { key: 'year_name' };
		else {
			const other = rows.find((r) => r.code !== d.code && r.name === name);
			if (other) errors.name = { key: 'duplicate', other: other.code };
		}
	}
	if (d.start_date && d.end_date && d.end_date <= d.start_date && !errors.end_date)
		errors.end_date = { key: 'end_date' };
	if (d.is_current && d.status !== 'active') errors.is_current = { key: 'current_active' };
}

/** Isi contoh variabel template (referensi SAMPLE) untuk pratinjau. */
export function fillTemplate(text: string, sample: Readonly<Record<string, string>>): string {
	return text.replace(TEMPLATE_VAR, (all, key: string) => sample[key] ?? all);
}

export function totalUsage(r: MasterRecord): number {
	return r.usage.reduce((sum, u) => sum + u.count, 0);
}

/** CSV seperti referensi: semua isian + status, rujukan ditampilkan sebagai nama, BOM UTF-8. */
export function buildCsv(
	kind: MasterKind,
	rows: readonly MasterRecord[],
	header: (key: FieldKey | 'status') => string,
	display: (key: FieldKey | 'status', r: MasterRecord) => string
): string {
	const keys: (FieldKey | 'status')[] = [
		...masterDefinition(kind).fields.map((f) => f.key),
		'status'
	];
	const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
	const lines = [
		keys.map((k) => quote(header(k))).join(','),
		...rows.map((r) => keys.map((k) => quote(display(k, r))).join(','))
	];
	return '﻿' + lines.join('\n');
}
