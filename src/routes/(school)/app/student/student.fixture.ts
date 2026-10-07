import type { StudentDashboardData } from './student-dashboard';

/**
 * DATA CONTOH dashboard murid — hanya dimuat saat `dev` (FE-04 D2), dipakai bila data asli belum ada.
 * Isi sama persis dengan `FLIXARE App v3.html` layar 07 (QUESTS, REMEDIAL, IMPROVE, ATT, koleksi & stiker).
 */
export const studentDashboardFixture: StudentDashboardData = {
	className: 'XI-A',
	date: '2026-10-05',
	clockStartSeconds: 7 * 3600 + 35 * 60,
	todayAssessments: [
		{
			id: 'kuis-aljabar',
			title: 'Kuis Aljabar',
			subject: 'Matematika',
			startMinutes: 8 * 60,
			endMinutes: 8 * 60 + 30,
			questionCount: 20,
			xpReward: 50
		}
	],
	level: { number: 7, name: 'Penjelajah', xp: 720, nextLevelXp: 1000 },
	streak: {
		days: 12,
		week: [
			{ date: '2026-09-29', status: 'done' },
			{ date: '2026-09-30', status: 'done' },
			{ date: '2026-10-01', status: 'done' },
			{ date: '2026-10-02', status: 'done' },
			{ date: '2026-10-03', status: 'rest' },
			{ date: '2026-10-04', status: 'rest' },
			{ date: '2026-10-05', status: 'today' }
		]
	},
	quests: [
		{
			id: 'praktikum-sel',
			title: 'Laporan Praktikum Sel',
			subject: 'Biologi',
			dueDate: '2026-10-06',
			xp: 30,
			done: false
		},
		{
			id: 'esai-eksposisi',
			title: 'Esai Teks Eksposisi',
			subject: 'Bahasa Indonesia',
			dueDate: '2026-10-07',
			xp: 40,
			done: false
		},
		{
			id: 'ujian-bab-3',
			title: 'Ujian Bab 3',
			subject: 'Biologi · 40 soal',
			dueDate: '2026-10-09',
			xp: 60,
			done: false
		},
		{
			id: 'peta-sejarah',
			title: 'Proyek Peta Sejarah',
			subject: 'Sejarah',
			dueDate: '2026-10-12',
			xp: 30,
			done: true
		}
	],
	tierThresholds: { gold: 80, silver: 65 },
	subjects: [
		{ id: 'mat', name: 'Matematika', icon: 'math', percent: 78 },
		{ id: 'bio', name: 'Biologi', icon: 'biology', percent: 64 },
		{ id: 'ind', name: 'B. Indonesia', icon: 'indonesian', percent: 81 },
		{ id: 'ing', name: 'B. Inggris', icon: 'english', percent: 70 },
		{ id: 'sej', name: 'Sejarah', icon: 'history', percent: 59 },
		{ id: 'fis', name: 'Fisika', icon: 'physics', percent: 62 }
	],
	scoreBands: { high: 85, mid: 70 },
	recentScores: [
		{
			id: 'kuis-linear',
			title: 'Kuis Persamaan Linear',
			subject: 'Matematika',
			date: '2026-10-02',
			score: 88
		},
		{
			id: 'esai-laporan',
			title: 'Esai Teks Laporan',
			subject: 'B. Indonesia',
			date: '2026-09-30',
			score: 91
		},
		{
			id: 'kuis-kuadrat',
			title: 'Kuis Fungsi Kuadrat',
			subject: 'Matematika',
			date: '2026-09-28',
			score: 64
		},
		{
			id: 'praktikum-mikroskop',
			title: 'Praktikum Mikroskop',
			subject: 'Biologi',
			date: '2026-09-25',
			score: 85
		}
	],
	masteryTarget: 75,
	remedialXp: 40,
	remedials: [
		{
			id: 'rem-kuadrat',
			title: 'Kuis Fungsi Kuadrat',
			subject: 'Matematika',
			score: 64,
			dueDate: '2026-10-09'
		},
		{
			id: 'rem-hindu-buddha',
			title: 'Ulangan Kerajaan Hindu-Buddha',
			subject: 'Sejarah',
			score: 68,
			dueDate: '2026-10-12'
		}
	],
	bonusPractice: {
		title: 'Latihan bonus: Fungsi kuadrat',
		description: 'Guru sudah menyiapkan latihan pengayaan sebelum remedial.',
		xp: 40
	},
	lowScoreThreshold: 65,
	improvements: [
		{
			id: 'tp-kuadrat',
			objective: 'Fungsi kuadrat',
			subjectLabel: 'Matematika · TP 4',
			score: 64,
			tip: 'Ulangi video "Akar persamaan kuadrat" (12 menit), lalu kerjakan latihan pengayaan 10 soal.'
		},
		{
			id: 'tp-grafik',
			objective: 'Grafik fungsi',
			subjectLabel: 'Matematika · TP 5',
			score: 61,
			tip: 'Latih membaca titik puncak dan sumbu simetri dari grafik. Ada 3 latihan interaktif di modul Bab 4.'
		},
		{
			id: 'tp-sumber-sejarah',
			objective: 'Analisis sumber sejarah',
			subjectLabel: 'Sejarah · TP 2',
			score: 59,
			tip: 'Bandingkan dua sumber primer di materi Kerajaan Hindu-Buddha, lalu baca umpan balik guru pada esai terakhir.'
		},
		{
			id: 'tp-praktikum',
			objective: 'Laporan praktikum',
			subjectLabel: 'Biologi · TP 3',
			score: 70,
			tip: 'Bagian pembahasan masih singkat. Gunakan templat laporan di materi Praktikum Sel.'
		}
	],
	attendanceMonths: [
		{ year: 2026, month: 8, label: 'Agu', exceptions: { 12: 'sick', 13: 'sick', 17: 'holiday' } },
		{ year: 2026, month: 9, label: 'Sep', exceptions: { 8: 'late', 16: 'permit' } },
		{ year: 2026, month: 10, label: 'Okt', exceptions: {} }
	],
	defaultAttendanceMonth: 1
};
