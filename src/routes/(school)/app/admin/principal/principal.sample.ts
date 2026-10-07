/**
 * DATA CONTOH dashboard kepala sekolah — isi persis `FLIXARE App v3.html` layar 05b (konstanta GR,
 * WALI, ATT, NIL, TUG, SUBJ, TREND, KPI, TEACHERS, RISK, AGENDA, ANN, dan seed kotak persetujuan).
 *
 * Dipakai di dev & produksi per bagian yang modul backend-nya belum tersedia (backend mengirim `null`),
 * selalu berlabel "Data contoh" (keputusan pemilik produk 7 Okt 2026). Angka adalah contoh visual,
 * BUKAN aturan bisnis.
 */

export type KpiPeriod = 'today' | 'week' | 'month';
export type KpiKey = 'student_attendance' | 'teacher_attendance' | 'average_score' | 'at_risk';
export type NoteTone = 'warning' | 'muted' | 'success';

export interface KpiSample {
	readonly key: KpiKey;
	readonly value: string;
	readonly note: string;
	readonly tone: NoteTone;
}

export interface SubjectSample {
	readonly name: string;
	readonly byGrade: readonly [number, number, number];
}

export interface ClassSample {
	readonly key: string;
	readonly grade: 'X' | 'XI' | 'XII';
	readonly homeroom: string;
	readonly students: number;
	/** `null` = presensi belum diisi. */
	readonly attendance: number | null;
	readonly score: number;
	readonly tasks: number;
}

export interface TeacherActivitySample {
	readonly name: string;
	readonly subjects: string;
	readonly classes: number;
	readonly materials: number;
	readonly pending: number;
	readonly lastLogin: string;
	/** Hari sejak login terakhir (status aktivitas dihitung dari data, bukan label). */
	readonly daysSinceLogin: number;
}

export interface RiskSample {
	readonly name: string;
	readonly className: string;
	readonly homeroom: string;
	readonly average: number;
	readonly absentDays: number;
	readonly weakSubjects: string;
}

export interface DatedItem {
	readonly date: string;
	readonly title: string;
	readonly detail: string;
}

const GRADES: readonly ['X' | 'XI' | 'XII', readonly string[]][] = [
	['X', ['A', 'B', 'C', 'D', 'E', 'F', 'G']],
	['XI', ['A', 'B', 'C', 'D', 'E', 'F', 'G']],
	['XII', ['IPA 1', 'IPA 2', 'IPA 3', 'IPS 1', 'IPS 2', 'IPS 3', 'Bahasa']]
];
const HOMEROOMS = [
	[
		'Sri Handayani',
		'Hendra Wijaya',
		'Dewi Kartika',
		'Yusuf Maulana',
		'Lina Marlina',
		'Agus Salim',
		'Ratna Sari'
	],
	[
		'Rina Pratiwi',
		'Budi Santoso',
		'Bambang Sutrisno',
		'Indah Permata',
		'Joko Prasetyo',
		'Maya Sari',
		'Teguh Raharjo'
	],
	[
		'Wawan Setiawan',
		'Fitri Handayani',
		'Dodi Kurniawan',
		'Nur Aini',
		'Eko Saputro',
		'Lestari Wulan',
		'Arif Rahman'
	]
];
const ATTENDANCE: readonly (readonly (number | null)[])[] = [
	[96, 93, 89, 97, 95, 91, 98],
	[100, null, 94, 96, 92, 97, 90],
	[95, 92, 93, 97, 88, 94, 96]
];
const SCORES = [
	[81, 78, 74, 83, 80, 76, 84],
	[84, 77, 79, 82, 75, 80, 73],
	[82, 79, 80, 85, 72, 77, 81]
];
const TASKS = [
	[92, 88, 79, 94, 90, 83, 95],
	[95, 81, 86, 90, 78, 88, 76],
	[91, 87, 89, 93, 74, 82, 90]
];
const BASE_CLASS_SIZE = 32;
const CLASS_SIZE_SPREAD = 5;

export const principalSample = {
	/** Tanggal acuan data contoh (Senin, 5 Oktober 2026). */
	date: '2026-10-05',
	attendanceToday: '94,6%',
	kkm: 75,
	reportClassTotal: 21,
	reportDeadline: '18 Desember 2026',
	monthlyReport: 'September 2026',
	kpis: {
		today: [
			{ key: 'student_attendance', value: '94,6%', note: 'XI-B belum mengisi', tone: 'warning' },
			{ key: 'teacher_attendance', value: '46/48', note: '2 izin/dinas', tone: 'muted' },
			{ key: 'average_score', value: '79,6', note: '+0,8 dari pekan lalu', tone: 'success' },
			{ key: 'at_risk', value: '23', note: '3,1% dari 738 murid', tone: 'warning' }
		],
		week: [
			{ key: 'student_attendance', value: '94,8%', note: '-0,4% dari pekan lalu', tone: 'warning' },
			{ key: 'teacher_attendance', value: '97,5%', note: 'Stabil', tone: 'muted' },
			{ key: 'average_score', value: '79,6', note: '+0,8 dari pekan lalu', tone: 'success' },
			{ key: 'at_risk', value: '23', note: '+2 dari pekan lalu', tone: 'warning' }
		],
		month: [
			{ key: 'student_attendance', value: '95,2%', note: 'September 2026', tone: 'muted' },
			{ key: 'teacher_attendance', value: '97,9%', note: 'September 2026', tone: 'muted' },
			{ key: 'average_score', value: '78,8', note: 'Sumatif bulan ini', tone: 'muted' },
			{ key: 'at_risk', value: '21', note: 'Akhir September', tone: 'muted' }
		]
	} satisfies Record<KpiPeriod, KpiSample[]>,
	trend: {
		students: [
			{ day: 'Sen', value: 95.1 },
			{ day: 'Sel', value: 94.3 },
			{ day: 'Rab', value: 96.0 },
			{ day: 'Kam', value: 93.8 },
			{ day: 'Jum', value: 94.9 },
			{ day: 'Hari ini', value: 94.6 }
		],
		teachers: [
			{ day: 'Sen', value: 97.9 },
			{ day: 'Sel', value: 95.8 },
			{ day: 'Rab', value: 100 },
			{ day: 'Kam', value: 97.9 },
			{ day: 'Jum', value: 95.8 },
			{ day: 'Hari ini', value: 95.8 }
		]
	},
	attendanceGroups: {
		students: [
			{ label: 'Kelas X', value: 95.6 },
			{ label: 'Kelas XI', value: 94.8 },
			{ label: 'Kelas XII', value: 93.6 }
		],
		teachers: [
			{ label: 'Tetap', value: 96.9 },
			{ label: 'Honorer', value: 93.3 },
			{ label: 'Total', value: 95.8 }
		]
	},
	teachersPresent: 46,
	teachersTotal: 48,
	absentTeachers: [
		{ name: 'Hendra Wijaya', detail: 'Biologi · pelatihan di dinas pendidikan', status: 'duty' },
		{ name: 'Joko Prasetyo', detail: 'PJOK · surat dokter terlampir', status: 'sick' }
	] as const,
	absenceNote: 'Presensi XI-B belum diisi wali kelas. Pengingat dikirim oleh admin sekolah.',
	/** Rata-rata sumatif per jenjang [X, XI, XII]. */
	subjects: [
		{ name: 'Matematika', byGrade: [72, 76, 75] },
		{ name: 'Fisika', byGrade: [74, 75, 77] },
		{ name: 'Kimia', byGrade: [78, 76, 79] },
		{ name: 'Biologi', byGrade: [80, 79, 81] },
		{ name: 'B. Indonesia', byGrade: [84, 85, 83] },
		{ name: 'B. Inggris', byGrade: [79, 81, 82] },
		{ name: 'Sejarah', byGrade: [82, 80, 79] },
		{ name: 'Ekonomi', byGrade: [73, 78, 80] }
	] satisfies SubjectSample[],
	classes: GRADES.flatMap(([grade, names], gradeIndex) =>
		names.map((name, index): ClassSample => ({
			key: `${grade}-${name}`,
			grade,
			homeroom: HOMEROOMS[gradeIndex]?.[index] ?? '',
			students: BASE_CLASS_SIZE + ((index * 3 + gradeIndex) % CLASS_SIZE_SPREAD),
			attendance: ATTENDANCE[gradeIndex]?.[index] ?? null,
			score: SCORES[gradeIndex]?.[index] ?? 0,
			tasks: TASKS[gradeIndex]?.[index] ?? 0
		}))
	),
	defaultClass: 'XI-A',
	/** Tahap rapor sebelum pengajuan wali kelas (seed referensi). */
	reportPipeline: { published: 18, edited: 12, submittedBeforeInbox: 3 },
	reportRequests: [
		{
			className: 'XI-B',
			requester: 'Budi Santoso',
			detail: '34 murid · 14 mapel',
			status: 'pending'
		},
		{
			className: 'X-A',
			requester: 'Sri Handayani',
			detail: '32 murid · 14 mapel',
			status: 'pending'
		}
	] as const,
	/** Kotak persetujuan kepala sekolah (seed referensi): rapor & izin guru belum punya modul backend. */
	pendingReportCards: 2,
	reportsApproved: 0,
	pendingTeacherLeave: 2,
	pendingDataChanges: 1,
	subscription: {
		plan: 'Standard',
		trialDay: 3,
		trialDays: 5,
		trialEnds: 'Rab, 7 Okt 2026',
		seatsUsed: 612,
		seatCount: 800,
		activeStudents: '548 dari 612 (90%)',
		activeTeachers: '41 dari 48',
		storage: '38 / 100 GB'
	},
	teachers: [
		{
			name: 'Rina Pratiwi',
			subjects: 'Matematika, Biologi',
			classes: 4,
			materials: 9,
			pending: 12,
			lastLogin: 'Hari ini 06.12',
			daysSinceLogin: 0
		},
		{
			name: 'Budi Santoso',
			subjects: 'Fisika',
			classes: 5,
			materials: 6,
			pending: 3,
			lastLogin: 'Hari ini 06.40',
			daysSinceLogin: 0
		},
		{
			name: 'Hendra Wijaya',
			subjects: 'Biologi',
			classes: 4,
			materials: 5,
			pending: 0,
			lastLogin: 'Kemarin',
			daysSinceLogin: 1
		},
		{
			name: 'Maya Sari',
			subjects: 'Ekonomi',
			classes: 6,
			materials: 4,
			pending: 21,
			lastLogin: 'Hari ini 07.02',
			daysSinceLogin: 0
		},
		{
			name: 'Joko Prasetyo',
			subjects: 'PJOK',
			classes: 7,
			materials: 1,
			pending: 0,
			lastLogin: '5 hari lalu',
			daysSinceLogin: 5
		},
		{
			name: 'Indah Permata',
			subjects: 'B. Inggris',
			classes: 5,
			materials: 7,
			pending: 8,
			lastLogin: 'Hari ini 06.55',
			daysSinceLogin: 0
		},
		{
			name: 'Teguh Raharjo',
			subjects: 'Sejarah',
			classes: 6,
			materials: 0,
			pending: 34,
			lastLogin: '9 hari lalu',
			daysSinceLogin: 9
		},
		{
			name: 'Dewi Kartika',
			subjects: 'Kimia',
			classes: 4,
			materials: 3,
			pending: 15,
			lastLogin: '2 hari lalu',
			daysSinceLogin: 2
		},
		{
			name: 'Bambang Sutrisno',
			subjects: 'B. Indonesia',
			classes: 5,
			materials: 8,
			pending: 6,
			lastLogin: 'Hari ini 06.30',
			daysSinceLogin: 0
		}
	] satisfies TeacherActivitySample[],
	risks: [
		{
			name: 'Eka Saputra',
			className: 'XI-A',
			homeroom: 'Rina Pratiwi',
			average: 62,
			absentDays: 2,
			weakSubjects: 'Matematika, Fisika'
		},
		{
			name: 'Raka Pratama',
			className: 'X-C',
			homeroom: 'Dewi Kartika',
			average: 58,
			absentDays: 4,
			weakSubjects: 'Matematika, Kimia'
		},
		{
			name: 'Lutfi Anwar',
			className: 'XI-B',
			homeroom: 'Budi Santoso',
			average: 71,
			absentDays: 5,
			weakSubjects: '—'
		},
		{
			name: 'Salsa Bila',
			className: 'X-C',
			homeroom: 'Dewi Kartika',
			average: 66,
			absentDays: 1,
			weakSubjects: 'B. Inggris, Matematika'
		},
		{
			name: 'Tegar Wibowo',
			className: 'XII-IPS 2',
			homeroom: 'Eko Saputro',
			average: 64,
			absentDays: 3,
			weakSubjects: 'Ekonomi, Sejarah'
		},
		{
			name: 'Naufal Rizky',
			className: 'XI-B',
			homeroom: 'Budi Santoso',
			average: 77,
			absentDays: 4,
			weakSubjects: '—'
		},
		{
			name: 'Umi Kalsum',
			className: 'XII-IPS 2',
			homeroom: 'Eko Saputro',
			average: 69,
			absentDays: 0,
			weakSubjects: 'Matematika'
		}
	] satisfies RiskSample[],
	agenda: [
		{
			date: '7 Okt',
			title: 'Rapat dinas guru',
			detail: '14.00 WIB · Ruang guru · pembahasan asesmen tengah semester'
		},
		{
			date: '12 Okt',
			title: 'Pelatihan Kurikulum Merdeka',
			detail: '12–14 Okt · Bandung · 3 guru'
		},
		{ date: '17 Okt', title: 'Pertemuan orang tua & wali kelas', detail: '09.00 WIB · Aula' },
		{ date: '16 Nov', title: 'Pekan asesmen sumatif', detail: '16–20 Nov 2026' },
		{ date: '18 Des', title: 'Tenggat persetujuan rapor', detail: 'Seluruh kelas' }
	] satisfies DatedItem[],
	announcements: [
		{
			date: '2 Okt',
			title: 'Jadwal asesmen tengah semester',
			detail: 'Ahmad Fauzi · dikirim ke guru, murid, dan orang tua'
		},
		{
			date: '30 Sep',
			title: 'Libur Maulid Nabi',
			detail: 'Ahmad Fauzi · dikirim ke semua pengguna'
		},
		{
			date: '25 Sep',
			title: 'Pembaruan tata tertib seragam',
			detail: 'Dewi Anggraini · dikirim ke murid dan orang tua'
		}
	] satisfies DatedItem[]
};
