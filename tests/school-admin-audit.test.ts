import { describe, expect, it } from 'vitest';
import {
	AUDIT_ACTOR_ROLES,
	AUDIT_CATEGORIES,
	AUDIT_QUERY_MAX,
	auditExportErrorCode,
	auditExportErrorMessage,
	auditExportQuery,
	auditExportRangeValid,
	auditRoleLabel,
	localIsoDate
} from '$lib/features/school-admin/school-admin.model';

describe('audit filter', () => {
	it('kategori & peran mengikuti enum kontrak', () => {
		expect(AUDIT_CATEGORIES).toEqual([
			'person',
			'guardian',
			'account',
			'report',
			'academic',
			'planning',
			'reminder',
			'export',
			'announcement'
		]);
		expect(AUDIT_ACTOR_ROLES).toEqual([
			'SCHOOL_ADMIN',
			'PRINCIPAL',
			'TEACHER',
			'HOMEROOM_TEACHER',
			'SYSTEM'
		]);
	});

	it('query ekspor hanya memuat filter terisi, q dipangkas', () => {
		const query = auditExportQuery({
			category: '',
			from: '2026-10-01',
			to: '2026-10-15',
			q: '  rapor  ',
			actorRole: 'TEACHER'
		});
		expect(query.toString()).toBe('from=2026-10-01&to=2026-10-15&q=rapor&actor_role=TEACHER');
	});

	it('q dipotong ke batas', () => {
		const query = auditExportQuery({
			category: '',
			from: '',
			to: '',
			q: 'x'.repeat(AUDIT_QUERY_MAX + 5),
			actorRole: ''
		});
		expect(query.get('q')).toHaveLength(AUDIT_QUERY_MAX);
	});
});

/** PF7(a): cermin `auditExportRange` backend — default 90 hari s.d. hari ini, maks 90 hari inklusif. */
describe('rentang ekspor (PF7a)', () => {
	const TODAY = '2026-10-15';

	it.each([
		['', '', true],
		['2026-10-15', '2026-10-15', true],
		['2026-07-18', '2026-10-15', true],
		['2026-07-17', '2026-10-15', false],
		['2026-10-16', '2026-10-15', false],
		['2026-07-18', '', true],
		['2026-07-17', '', false],
		['', '2026-01-01', true],
		['2026-03-01', '2026-04-01', true]
	])('from=%s to=%s → %s', (from, to, valid) => {
		expect(auditExportRangeValid(from, to, TODAY)).toBe(valid);
	});

	it('rentang lintas DST tetap dihitung per hari kalender', () => {
		expect(auditExportRangeValid('2026-01-01', '2026-03-31', TODAY)).toBe(true);
		expect(auditExportRangeValid('2025-12-31', '2026-03-31', TODAY)).toBe(false);
	});

	it('tanggal rusak ditolak', () => {
		expect(auditExportRangeValid('bukan-tanggal', '', TODAY)).toBe(false);
	});

	it('localIsoDate memakai tanggal lokal', () => {
		expect(localIsoDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
	});
});

/** PF7(b): kode galat ekspor dari backend → query `export_error` → Toast i18n. */
describe('galat ekspor (PF7b)', () => {
	const KEYS: Record<string, string> = {
		'school_admin.errors.audit_export_range_invalid': 'Rentang maks 90 hari',
		'school_admin.errors.too_long': 'Terlalu panjang',
		'school_admin.audit.export_failed': 'Ekspor gagal'
	};
	const t = (key: string) => KEYS[key] ?? key;

	it('issue pertama diutamakan, lalu code', () => {
		expect(
			auditExportErrorCode({
				code: 'validation_failed',
				issues: [{ field: 'q', code: 'too_long' }]
			})
		).toBe('too_long');
		expect(auditExportErrorCode({ code: 'audit_export_range_invalid', issues: [] })).toBe(
			'audit_export_range_invalid'
		);
	});

	it('kode tidak aman diganti internal_error', () => {
		expect(auditExportErrorCode({ code: '<script>', issues: [] })).toBe('internal_error');
		expect(auditExportErrorCode({ code: 'a'.repeat(65), issues: [] })).toBe('internal_error');
	});

	it('pesan memakai kunci errors bila ada, selain itu pesan ekspor umum', () => {
		expect(auditExportErrorMessage(t, 'audit_export_range_invalid')).toBe('Rentang maks 90 hari');
		expect(auditExportErrorMessage(t, 'too_long')).toBe('Terlalu panjang');
		expect(auditExportErrorMessage(t, 'internal_error')).toBe('Ekspor gagal');
	});
});

/** PF7(c): peran tak dikenal → "Lainnya", bukan "Sistem". */
describe('label peran', () => {
	const t = (key: string) => key;

	it('peran kontrak memakai labelnya, peran lain → other', () => {
		expect(auditRoleLabel(t, 'TEACHER')).toBe('school_admin.audit.role.TEACHER');
		expect(auditRoleLabel(t, 'SYSTEM')).toBe('school_admin.audit.role.SYSTEM');
		expect(auditRoleLabel(t, 'EVENT_ORGANIZER')).toBe('school_admin.audit.role.other');
		expect(auditRoleLabel(t, '')).toBe('school_admin.audit.role.other');
	});
});
