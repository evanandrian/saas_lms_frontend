import { describe, expect, it } from 'vitest';
import type { SchoolPlanningView, SchoolSetupState } from '$lib/api/generated/lms';
import id from '$lib/i18n/id.json';
import en from '$lib/i18n/en.json';
import {
	charCount,
	intInRange,
	issueMessage,
	lengthIssue,
	lengthMessage,
	parseKktp,
	subjectIssueMessage,
	subjectIssues,
	subjectRows,
	subjectsPayload
} from '$lib/features/school-admin/school-admin.model';

const setup = {
	subjects: [
		{ code: 'MAT', name: 'Matematika', kktp: 75, enabled: true, custom: false },
		{ code: 'SEN', name: 'Seni', kktp: 75, enabled: false, custom: false }
	]
} as unknown as SchoolSetupState;
const planning = {
	subjects: [{ id: 's1', code: 'MAT', name: 'Matematika' }],
	objectives: [
		{ id: 'o1', subject_id: 's1', grade_id: 'g10', code: 'TP-10.1', description: 'x' },
		{ id: 'o2', subject_id: 's1', grade_id: 'g10', code: 'TP-10.2', description: 'y' }
	]
} as unknown as SchoolPlanningView;

describe('subjectRows', () => {
	it('menggabungkan KKTP setup dengan id & jumlah TP planning', () => {
		expect(subjectRows(setup, planning)).toEqual([
			{
				code: 'MAT',
				name: 'Matematika',
				kktp: 75,
				enabled: true,
				custom: false,
				id: 's1',
				objectives: 2
			},
			{
				code: 'SEN',
				name: 'Seni',
				kktp: 75,
				enabled: false,
				custom: false,
				id: null,
				objectives: 0
			}
		]);
	});
});

describe('subjectsPayload', () => {
	it('mengganti item ber-kode sama, mempertahankan urutan', () => {
		const out = subjectsPayload(setup.subjects, {
			code: 'mat',
			name: 'Matematika Wajib',
			kktp: 78,
			enabled: true,
			custom: false
		});
		expect(out.subjects?.[0]).toEqual({
			code: 'MAT',
			name: 'Matematika Wajib',
			kktp: 78,
			enabled: true,
			custom: false
		});
		expect(out.subjects).toHaveLength(2);
		expect(out.subjects?.[1]).toEqual(setup.subjects[1]);
		expect(setup.subjects[0]?.name).toBe('Matematika');
		expect(out.subjects?.[0]).not.toBe(setup.subjects[0]);
	});
	it('menambah mapel sekolah baru di akhir sebagai custom', () => {
		const out = subjectsPayload(setup.subjects, {
			code: 'TIK',
			name: 'TIK',
			kktp: 70,
			enabled: true,
			custom: true
		});
		expect(out.subjects?.at(-1)).toEqual({
			code: 'TIK',
			name: 'TIK',
			kktp: 70,
			enabled: true,
			custom: true
		});
	});
});

describe('intInRange', () => {
	it('menerima number dan string bilangan bulat di dalam rentang (inklusif)', () => {
		expect(intInRange(75, 0, 100)).toBe(75);
		expect(intInRange('80', 0, 100)).toBe(80);
		expect(intInRange(0, 0, 100)).toBe(0);
		expect(intInRange(100, 0, 100)).toBe(100);
	});
	it('menolak null, kosong, NaN, di luar rentang, dan desimal', () => {
		for (const bad of [null, undefined, '', '  ', 'abc', Number.NaN, 101, -1, 70.5])
			expect(intInRange(bad, 0, 100)).toBeNull();
	});
});

describe('parseKktp', () => {
	it('KKTP = bilangan bulat 0–100 (lihat intInRange), selain itu null', () => {
		expect(parseKktp('75')).toBe(75);
		expect(parseKktp(101)).toBeNull();
	});
});

describe('subjectIssues', () => {
	const existing = ['MAT', 'SEN'];
	it('kode & nama sah (kode dinormalisasi huruf besar) → tanpa masalah', () => {
		expect(subjectIssues({ code: ' inf ', name: 'Informatika' }, existing)).toEqual({});
	});
	it('kode format salah → code_invalid; kode sudah ada → code_taken', () => {
		expect(subjectIssues({ code: 'X', name: 'Mapel' }, existing).code).toBe('code_invalid');
		expect(subjectIssues({ code: 'MAT-1', name: 'Mapel' }, existing).code).toBe('code_invalid');
		expect(subjectIssues({ code: 'mat', name: 'Mapel' }, existing).code).toBe('code_taken');
	});
	it('nama kosong → required; < 2 code point (ter-trim) → too_short, sama dengan backend', () => {
		expect(subjectIssues({ code: 'INF', name: '   ' }, existing).name).toBe('required');
		expect(subjectIssues({ code: 'INF', name: ' I ' }, existing).name).toBe('too_short');
		expect(subjectIssues({ code: 'INF', name: 'IP' }, existing).name).toBeUndefined();
		// Satu emoji = 1 code point (UTF-16 .length = 2) → tetap terlalu pendek, seperti rune di BE.
		expect(subjectIssues({ code: 'INF', name: '😀' }, existing).name).toBe('too_short');
		expect(subjectIssues({ code: 'INF', name: 'Ü😀' }, existing).name).toBeUndefined();
	});
	it('existing null (mode ubah, kode terkunci) → kode tidak divalidasi', () => {
		expect(subjectIssues({ code: 'MAT', name: 'Matematika' }, null)).toEqual({});
	});
});

describe('panjang teks (code point Unicode)', () => {
	const t = (k: string, p?: Readonly<Record<string, string | number>>) =>
		p ? `${k}${JSON.stringify(p)}` : k;
	it('charCount menghitung code point, bukan unit UTF-16', () => {
		expect(charCount('abc')).toBe(3);
		expect(charCount('😀')).toBe(1);
		expect(charCount('Bahasa 日本語 🎌')).toBe(12);
	});
	it('lengthIssue: kosong/terlalu pendek/terlalu panjang/sah', () => {
		expect(lengthIssue('  ', 2, 5)).toBe('required');
		expect(lengthIssue(undefined, 2, 5)).toBe('required');
		expect(lengthIssue('a', 2, 5)).toBe('too_short');
		expect(lengthIssue('abcdef', 2, 5)).toBe('too_long');
		expect(lengthIssue('😀😀😀😀😀', 2, 5)).toBeNull();
		expect(lengthIssue('😀😀😀😀😀😀', 2, 5)).toBe('too_long');
	});
	it('lengthMessage: required → Wajib diisi; selain itu menyebut batas', () => {
		expect(lengthMessage(t, 'required', 2, 120)).toBe('school_admin.errors.required');
		expect(lengthMessage(t, 'too_short', 2, 120)).toBe('school_admin.errors.min_chars{"min":2}');
		expect(lengthMessage(t, 'too_long', 2, 120)).toBe('school_admin.errors.max_chars{"max":120}');
	});
	it('subjectIssueMessage: nama pendek → min_chars; kode → errors.<kode>', () => {
		expect(subjectIssueMessage(t, 'too_short')).toBe('school_admin.errors.min_chars{"min":2}');
		expect(subjectIssueMessage(t, 'required')).toBe('school_admin.errors.required');
		expect(subjectIssueMessage(t, 'code_taken')).toBe('school_admin.errors.code_taken');
		expect(subjectIssueMessage(t, 'code_invalid')).toBe('school_admin.errors.code_invalid');
		// Nama mapel tanpa batas atas: `too_long` bukan SubjectIssue (tidak ada "Maksimal Infinity").
		// @ts-expect-error — 'too_long' sengaja tidak termasuk tipe SubjectIssue.
		expect(subjectIssueMessage(t, 'too_long')).not.toMatch(/Infinity/);
	});
	it('isu server code_taken (BE SaveSubjects) = pesan validasi klien yang sama (id & en)', () => {
		for (const dict of [id, en]) {
			const real = (key: string, params?: Readonly<Record<string, string | number>>) => {
				const v = key
					.split('.')
					.reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], dict);
				const s = typeof v === 'string' ? v : key;
				return s.replace(/\{(\w+)\}/g, (m, n: string) => String(params?.[n] ?? m));
			};
			expect(issueMessage(real, 'code_taken')).toBe(subjectIssueMessage(real, 'code_taken'));
			expect(issueMessage(real, 'code_taken')).not.toBe(real('school_admin.errors.generic'));
			expect(subjectIssueMessage(real, 'too_short')).toMatch(/2/);
			expect(lengthMessage(real, 'too_long', 2, 120)).toMatch(/120/);
			// Isu server ekskul `max_chars:120` (nama/tempat) = pesan klien `lengthMessage` (satu sumber).
			expect(issueMessage(real, 'max_chars:120')).toBe(lengthMessage(real, 'too_long', 2, 120));
			expect(issueMessage(real, 'max_chars:120')).not.toMatch(/\{max\}/);
		}
	});
});
