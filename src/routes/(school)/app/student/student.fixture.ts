import type { StudentDashboardData } from './student-dashboard';

/**
 * Data default fallback dashboard murid — seluruh data riil diambil dari API backend.
 */
export const studentDashboardFixture: StudentDashboardData = {
	className: '-',
	date: '',
	clockStartSeconds: 7 * 3600 + 35 * 60,
	todayAssessments: [],
	level: { number: 1, name: 'Pemula', xp: 0, nextLevelXp: 100 },
	streak: {
		days: 0,
		week: []
	},
	quests: [],
	tierThresholds: { gold: 80, silver: 65 },
	subjects: [],
	scoreBands: { high: 85, mid: 70 },
	recentScores: [],
	masteryTarget: 75,
	remedialXp: 40,
	remedials: [],
	bonusPractice: null,
	lowScoreThreshold: 65,
	improvements: [],
	attendanceMonths: [],
	defaultAttendanceMonth: 0
};

