import { describe, expect, it } from 'vitest';
import {
	agendaKinds,
	buildGradebook,
	classThreshold,
	layoutAgenda,
	teacherDashboardFromApi
} from '../src/routes/(school)/app/teacher/teacher-dashboard';

/** Dashboard guru dari data asli (backend `GET /api/v1/dashboards/teacher`), tanpa data contoh. */
const LABELS = {
	status: { done: 'Selesai', open: 'Berlangsung', next: 'Berikutnya', later: 'Terjadwal' },
	period: (n: number) => `Jam ke-${n}`,
	finalScoreCode: 'NA',
	finalScoreName: 'Nilai akhir'
};
const lesson = (id: string, start: number, end: number) => ({
	id,
	period_no: 2,
	start_minutes: start,
	end_minutes: end,
	subject: 'Matematika',
	class_name: 'X-A'
});

describe('teacher dashboard (data asli)', () => {
	it('TD-01: status agenda mengikuti jam sekarang', () => {
		const lessons = [
			{ startMinutes: 420, endMinutes: 465 },
			{ startMinutes: 465, endMinutes: 510 },
			{ startMinutes: 510, endMinutes: 555 },
			{ startMinutes: 600, endMinutes: 645 }
		];
		expect(agendaKinds(lessons, 470)).toEqual(['done', 'open', 'next', 'later']);
		expect(agendaKinds(lessons, 0)).toEqual(['next', 'later', 'later', 'later']);
		expect(agendaKinds(lessons, 900)).toEqual(['done', 'done', 'done', 'done']);
	});

	it('TD-02: mapping API → model; jam nyata, tanpa sesi/tumpukan contoh', () => {
		const model = teacherDashboardFromApi(
			{
				date: '2026-10-12',
				agenda: [lesson('a', 420, 465)],
				gradebook: [
					{
						id: 'g1',
						class_name: 'X-A',
						subject: 'Matematika',
						passing_criteria: 75,
						students: 4,
						filled: 1,
						grades: [
							{ name: 'Dimas', score: 70 },
							{ name: 'Sari', score: null }
						]
					}
				]
			},
			430,
			'Semester ganjil',
			LABELS
		);
		expect(model.clockStartSeconds).toBeNull();
		expect(model.nextSession).toBeNull();
		expect(model.toGrade).toEqual([]);
		expect(model.lobbyRoster).toEqual([]);
		expect(model.agenda[0]).toMatchObject({
			kind: 'open',
			statusLabel: 'Berlangsung',
			title: 'Matematika · X-A',
			meta: 'Jam ke-2'
		});
		expect(model.gradebook[0]).toMatchObject({
			name: 'X-A · Matematika',
			progressPercent: 25,
			remedialThreshold: 75
		});
		expect(model.gradebook[0]?.students[1]?.scores).toEqual([null]);
	});

	it('TD-03: nilai kosong tidak dihitung rata-rata/remedial; KKTP null → tanpa sorotan', () => {
		const cls = {
			id: 'g',
			name: 'X-A',
			progressPercent: 0,
			objectives: [{ code: 'NA', name: 'Nilai akhir' }],
			students: [
				{ name: 'A', scores: [60] },
				{ name: 'B', scores: [null] },
				{ name: 'C', scores: [90] }
			],
			remedialThreshold: 75
		};
		expect(buildGradebook(cls, 75)).toMatchObject({ averages: [75], lowCount: 1 });
		expect(buildGradebook(cls, null).lowCount).toBe(0);
		expect(
			buildGradebook({ ...cls, students: [{ name: 'B', scores: [null] }] }, 75).averages
		).toEqual([null]);
		expect(classThreshold({ ...cls, remedialThreshold: null }, 70)).toBeNull();
		expect(classThreshold({ ...cls, remedialThreshold: undefined }, 70)).toBe(70);
	});

	it('TD-04: kartu agenda jam berurutan tidak tumpang tindih (tinggi dari durasi)', () => {
		const model = teacherDashboardFromApi(
			{ date: '2026-10-12', agenda: [lesson('a', 420, 465), lesson('b', 465, 510)], gradebook: [] },
			0,
			'',
			LABELS
		);
		const [first, second] = layoutAgenda(model.agenda);
		expect(first && second && first.topPx + first.heightPx <= second.topPx).toBe(true);
	});
});
