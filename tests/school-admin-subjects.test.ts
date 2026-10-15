import { describe, expect, it } from 'vitest';
import type { SchoolPlanningView, SchoolSetupState } from '$lib/api/generated/lms';
import { subjectRows, subjectsPayload } from '$lib/features/school-admin/school-admin.model';

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
