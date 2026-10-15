import { describe, expect, it } from 'vitest';
import type { SchoolPlanningView } from '$lib/api/generated/lms';
import {
	TEACHING_LOAD_MAX_JP,
	TEACHING_LOAD_MIN_JP,
	loadFlag,
	teacherLoads
} from '$lib/features/school-admin/school-admin.model';

const cell = (teacher_id: string, n: number) =>
	Array.from({ length: n }, (_, i) => ({
		class_id: 'c1',
		weekday: 1 + (i % 6),
		period_no: i + 1,
		subject_id: 's1',
		teacher_id
	}));

const planning = {
	teachers: [
		{ value: 't1', label: 'Budi' },
		{ value: 't2', label: 'Rina' },
		{ value: 't3', label: 'Sari' }
	],
	classes: [{ id: 'c1', name: 'X-A', grade_id: 'g', homeroom_id: null }],
	subjects: [{ id: 's1', code: 'MAT', name: 'Matematika' }],
	assignments: [
		{ class_id: 'c1', subject_id: 's1', teacher_id: 't1', teacher_name: 'Budi' },
		{ class_id: 'c1', subject_id: 's1', teacher_id: 't2', teacher_name: 'Rina' }
	],
	schedule: [...cell('t1', 30), ...cell('t2', 41)]
} as unknown as SchoolPlanningView;

describe('teacherLoads', () => {
	it('JP = jumlah sel jadwal; tanda low/ok/high memakai 24–40', () => {
		const out = teacherLoads(planning);
		expect(out.map((l) => [l.teacher_id, l.jp, l.flag])).toEqual([
			['t1', 30, 'ok'],
			['t2', 41, 'high']
		]);
		expect(out[0]).toMatchObject({ name: 'Budi', subjects: ['MAT'], classes: ['X-A'] });
	});
	it('guru berpenugasan tanpa jadwal → 0 JP, low', () => {
		const out = teacherLoads({ ...planning, schedule: [] });
		expect(out.every((l) => l.jp === 0 && l.flag === 'low')).toBe(true);
	});
	it('tanpa penugasan & tanpa jadwal tidak dimasukkan', () => {
		const out = teacherLoads({ ...planning, assignments: [], schedule: [] });
		expect(out).toEqual([]);
	});
});

describe('loadFlag batas', () => {
	it('konstanta 24 dan 40', () => {
		expect([TEACHING_LOAD_MIN_JP, TEACHING_LOAD_MAX_JP]).toEqual([24, 40]);
	});
	it('23 low, 24 ok, 40 ok, 41 high, 0 low', () => {
		expect([0, 23, 24, 40, 41].map(loadFlag)).toEqual(['low', 'low', 'ok', 'ok', 'high']);
	});
});
