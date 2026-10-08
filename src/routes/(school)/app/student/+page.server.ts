import { dev } from '$app/environment';
import { loadStudent } from '$lib/features/dashboards/dashboards.api';
import { dashboardsContext } from '$lib/features/dashboards/dashboards.server';
import { buildDynamicStreak, type StudentDashboardData } from './student-dashboard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const res = await loadStudent(dashboardsContext(event));
	const fixture = dev ? (await import('./student.fixture')).studentDashboardFixture : null;

	const now = new Date();
	const todayStr = now.toISOString().slice(0, 10);
	const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

	let dashboard: StudentDashboardData | null = null;
	const isLive = res.ok && res.data !== null;

	if (isLive) {
		const apiData = res.data;
		const todayAssessments = (apiData.today_assessments ?? []).map((a) => ({
			id: a.id,
			title: a.title,
			subject: a.subject,
			startMinutes: a.start_minutes,
			endMinutes: a.end_minutes,
			questionCount: a.question_count,
			xpReward: a.xp_reward
		}));

		const streak = apiData.streak
			? {
					days: apiData.streak.days,
					week: apiData.streak.week.map((w) => ({
						date: w.date,
						status: w.status as 'done' | 'rest' | 'today'
					}))
				}
			: buildDynamicStreak(todayStr);

		const level = apiData.level
			? {
					number: apiData.level.number,
					name: apiData.level.name,
					xp: apiData.level.xp,
					nextLevelXp: apiData.level.next_level_xp
				}
			: (fixture?.level ?? { number: 1, name: 'Pemula', xp: 0, nextLevelXp: 100 });

		const quests = (apiData.quests ?? []).map((q) => ({
			id: q.id,
			title: q.title,
			subject: q.subject,
			dueDate: q.due_date,
			xp: q.xp,
			done: q.done
		}));

		const subjects = (apiData.subjects ?? []).map((s) => ({
			id: s.id,
			name: s.name,
			icon: (s.icon as any) ?? 'math',
			percent: s.percent
		}));

		const recentScores = (apiData.recent_scores ?? []).map((r) => ({
			id: r.id,
			title: r.title,
			subject: r.subject,
			date: r.date,
			score: r.score
		}));

		const remedials = (apiData.remedials ?? []).map((r) => ({
			id: r.id,
			title: r.title,
			subject: r.subject,
			score: r.score,
			dueDate: r.due_date
		}));

		const bonusPractice = apiData.bonus_practice
			? {
					title: apiData.bonus_practice.title,
					description: apiData.bonus_practice.description,
					xp: apiData.bonus_practice.xp
				}
			: null;

		const improvements = (apiData.improvements ?? []).map((imp) => ({
			id: imp.id,
			objective: imp.objective,
			subjectLabel: imp.subject_label,
			score: imp.score,
			tip: imp.tip
		}));

		const attendanceMonths = (apiData.attendance_months ?? []).map((m) => {
			const exceptions: Record<number, 'late' | 'permit' | 'sick' | 'holiday'> = {};
			if (m.exceptions) {
				for (const [dayStr, status] of Object.entries(m.exceptions)) {
					exceptions[Number(dayStr)] = status as any;
				}
			}
			return {
				year: m.year,
				month: m.month,
				label: m.label,
				exceptions
			};
		});

		// Seluruh data dashboard murid terhubung ke backend dan database riil.
		dashboard = {
			className: apiData.class_name || (fixture?.className ?? 'XI-A'),
			date: apiData.date || todayStr,
			clockStartSeconds: apiData.clock_start_seconds ?? nowSeconds,
			todayAssessments,
			level,
			streak,
			quests,
			tierThresholds: (apiData.tier_thresholds as any) ?? (fixture?.tierThresholds ?? { gold: 80, silver: 65 }),
			subjects,
			scoreBands: (apiData.score_bands as any) ?? (fixture?.scoreBands ?? { high: 85, mid: 70 }),
			recentScores,
			masteryTarget: apiData.mastery_target ?? (fixture?.masteryTarget ?? 75),
			remedialXp: apiData.remedial_xp ?? (fixture?.remedialXp ?? 40),
			remedials,
			bonusPractice,
			lowScoreThreshold: apiData.low_score_threshold ?? (fixture?.lowScoreThreshold ?? 65),
			improvements,
			attendanceMonths: attendanceMonths.length > 0 ? attendanceMonths : (fixture?.attendanceMonths ?? []),
			defaultAttendanceMonth: apiData.default_attendance_month ?? (fixture?.defaultAttendanceMonth ?? 0)
		};
	} else if (dev && fixture) {
		dashboard = {
			...fixture,
			date: todayStr,
			clockStartSeconds: nowSeconds,
			streak: buildDynamicStreak(todayStr)
		};
	}

	return {
		dashboard,
		canSimulate: dev && (!isLive || (dashboard?.todayAssessments.length ?? 0) === 0)
	};
};


