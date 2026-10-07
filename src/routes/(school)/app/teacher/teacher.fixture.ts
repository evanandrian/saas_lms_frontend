import type { GradebookClass, LearningObjective, TeacherDashboardData } from './teacher-dashboard';

/**
 * DATA CONTOH dashboard guru mapel — isi sama persis dengan `FLIXARE App v3.html` layar 06 (konstanta
 * EVENTS, TOGRADE, CLASSES, HEAT_BASE). Dipakai di dev & produksi selama modul backend agenda, tugas,
 * dan penilaian belum tersedia, selalu berlabel "Data contoh" (keputusan pemilik produk 7 Okt 2026,
 * menggantikan aturan FE-04 D2 untuk dashboard ini). Angka & ambang adalah contoh visual, BUKAN aturan bisnis.
 */
const REFERENCE_CLOCK_SECONDS = 7 * 3600 + 35 * 60;
const SCORE_MIN = 10;
const SCORE_MAX = 100;

const TP_MATH: LearningObjective[] = [
	{ code: 'TP 1', name: 'Bentuk aljabar' },
	{ code: 'TP 2', name: 'Persamaan linear' },
	{ code: 'TP 3', name: 'Pertidaksamaan' },
	{ code: 'TP 4', name: 'Fungsi kuadrat' },
	{ code: 'TP 5', name: 'Grafik fungsi' },
	{ code: 'TP 6', name: 'Barisan & deret' }
];
const TP_BIO: LearningObjective[] = [
	{ code: 'TP 1', name: 'Sel' },
	{ code: 'TP 2', name: 'Jaringan' },
	{ code: 'TP 3', name: 'Organ' },
	{ code: 'TP 4', name: 'Sistem gerak' },
	{ code: 'TP 5', name: 'Peredaran darah' },
	{ code: 'TP 6', name: 'Metabolisme' }
];
const TP_IND: LearningObjective[] = [
	{ code: 'TP 1', name: 'Teks eksposisi' },
	{ code: 'TP 2', name: 'Teks laporan' },
	{ code: 'TP 3', name: 'Anekdot' },
	{ code: 'TP 4', name: 'Hikayat' },
	{ code: 'TP 5', name: 'Negosiasi' },
	{ code: 'TP 6', name: 'Debat' }
];

const STUDENTS_A = [
	'Aditya Nugraha',
	'Bunga Lestari',
	'Citra Maharani',
	'Dimas Prasetyo',
	'Eka Saputra',
	'Farah Aulia',
	'Gilang Ramadhan'
];
const STUDENTS_B = [
	'Hana Safitri',
	'Irfan Hakim',
	'Joko Susilo',
	'Kirana Putri',
	'Lutfi Anwar',
	'Maya Anggraini',
	'Naufal Rizky'
];
const STUDENTS_C = [
	'Oki Setiawan',
	'Putri Ayu',
	'Qori Ramadhani',
	'Raka Pratama',
	'Salsa Bila',
	'Tegar Wibowo',
	'Umi Kalsum'
];

const BASE_SCORES = [
	[92, 88, 74, 58, 66, 41],
	[95, 91, 85, 79, 82, 62],
	[88, 84, 70, 48, 55, 36],
	[90, 86, 72, 64, 61, 44],
	[78, 72, 61, 42, 50, 30],
	[97, 94, 88, 83, 86, 71],
	[85, 80, 66, 51, 58, 39]
];

/** Nilai per kelas = nilai dasar + selisih per TP, dibatasi 10–100 (rumus referensi). */
function gradebookClass(
	id: string,
	name: string,
	progressPercent: number,
	objectives: LearningObjective[],
	students: string[],
	offsets: number[]
): GradebookClass {
	return {
		id,
		name,
		progressPercent,
		objectives,
		students: students.map((student, row) => ({
			name: student,
			scores: (BASE_SCORES[row] ?? []).map((score, column) =>
				Math.max(SCORE_MIN, Math.min(SCORE_MAX, score + (offsets[column] ?? 0)))
			)
		}))
	};
}

export const teacherDashboardFixture: TeacherDashboardData = {
	date: '2026-10-05',
	semesterLabel: 'Semester Ganjil',
	clockStartSeconds: REFERENCE_CLOCK_SECONDS,
	nextSession: {
		title: 'Kuis Aljabar',
		classLabel: 'Matematika XI-A',
		startMinutes: 8 * 60,
		endMinutes: 8 * 60 + 30,
		questionCount: 20,
		studentCount: 32
	},
	agenda: [
		{
			id: 'presensi',
			startMinutes: 7 * 60 + 15,
			title: 'Presensi wali kelas · XI-A',
			meta: 'XI-A · 32 murid',
			statusLabel: 'Selesai',
			kind: 'done'
		},
		{
			id: 'kuis-aljabar',
			startMinutes: 8 * 60,
			title: 'Kuis Aljabar',
			meta: 'Matematika XI-A · 20 soal · 32 murid',
			statusLabel: 'Berikutnya',
			kind: 'next'
		},
		{
			id: 'tenggat-esai',
			startMinutes: 10 * 60 + 30,
			title: 'Tenggat Esai',
			meta: 'B. Indonesia X-C',
			statusLabel: 'Terbuka',
			kind: 'open'
		},
		{
			id: 'ujian-bab-3',
			startMinutes: 13 * 60,
			title: 'Ujian Bab 3',
			meta: 'Biologi XI-B · 40 soal',
			statusLabel: 'Terjadwal',
			kind: 'later'
		}
	],
	toGrade: [
		{
			id: 'esai-eksposisi',
			title: 'Esai Teks Eksposisi',
			classLabel: 'B. Indonesia X-C',
			dueLabel: 'ditutup kemarin',
			count: 8
		},
		{
			id: 'praktikum-sel',
			title: 'Laporan Praktikum Sel',
			classLabel: 'Biologi XI-B',
			dueLabel: 'ditutup 3 Okt',
			count: 5
		},
		{
			id: 'persamaan-kuadrat',
			title: 'Latihan Persamaan Kuadrat',
			classLabel: 'Matematika XI-A',
			dueLabel: 'ditutup 2 Okt',
			count: 3
		},
		{
			id: 'proyek-statistik',
			title: 'Proyek Statistik',
			classLabel: 'Matematika XI-B',
			dueLabel: 'ditutup 1 Okt',
			count: 2
		}
	],
	remedialThreshold: 60,
	gradebook: [
		gradebookClass('mat-xi-a', 'Matematika XI-A', 82, TP_MATH, STUDENTS_A, [0, 0, 0, 0, 0, 0]),
		gradebookClass('mat-xi-b', 'Matematika XI-B', 71, TP_MATH, STUDENTS_B, [-4, -6, 2, 5, -3, 8]),
		gradebookClass('bio-xi-b', 'Biologi XI-B', 64, TP_BIO, STUDENTS_B, [3, -2, -5, 6, 4, -1]),
		gradebookClass('ind-x-c', 'B. Indonesia X-C', 47, TP_IND, STUDENTS_C, [-6, 3, 7, -4, 2, 5])
	],
	lobbyRoster: [...STUDENTS_A, ...STUDENTS_B]
};
