import { describe, expect, it } from 'vitest';
import type { SchoolPlanningView, SchoolSetupState } from '$lib/api/generated/lms';
import {
	intInRange,
	parseKktp,
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
	it('nama < 2 karakter (ter-trim) → required, sama dengan backend', () => {
		expect(subjectIssues({ code: 'INF', name: ' I ' }, existing).name).toBe('required');
		expect(subjectIssues({ code: 'INF', name: 'IP' }, existing).name).toBeUndefined();
	});
	it('existing null (mode ubah, kode terkunci) → kode tidak divalidasi', () => {
		expect(subjectIssues({ code: 'MAT', name: 'Matematika' }, null)).toEqual({});
	});
});
