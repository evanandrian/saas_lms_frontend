import type { AbsenceStatus, ClassRoom, SchoolDashboardData } from './school-dashboard';

/**
 * DATA CONTOH dashboard sekolah — hanya dimuat saat `dev` (FE-04 D2), dipakai bila data asli belum ada.
 * Isi sama persis dengan `FLIXARE App v3.html` layar 05 (konstanta FLOORS, WALI, POOL, TODO).
 */
const STUDENTS_PER_CLASS = 32;
const ABSENTEE_POOL = [
	'Aldi Firmansyah',
	'Bella Anjani',
	'Cahyo Nugroho',
	'Desi Ratnasari',
	'Fajar Hidayat',
	'Gita Lestari'
];
const ABSENCE_CYCLE: AbsenceStatus[] = ['sick', 'permit', 'absent', 'sick'];

const FLOORS: [string, string[], (number | null)[], string[]][] = [
	[
		'X',
		['A', 'B', 'C', 'D', 'E', 'F', 'G'],
		[96, 93, 89, 97, 95, 91, 98],
		[
			'Sri Handayani',
			'Hendra Wijaya',
			'Dewi Kartika',
			'Yusuf Maulana',
			'Lina Marlina',
			'Agus Salim',
			'Ratna Sari'
		]
	],
	[
		'XI',
		['A', 'B', 'C', 'D', 'E', 'F', 'G'],
		[100, null, 94, 96, 92, 97, 90],
		[
			'Rina Pratiwi',
			'Budi Santoso',
			'Bambang Sutrisno',
			'Indah Permata',
			'Joko Prasetyo',
			'Maya Sari',
			'Teguh Raharjo'
		]
	],
	[
		'XII',
		['IPA 1', 'IPA 2', 'IPA 3', 'IPS 1', 'IPS 2', 'IPS 3', 'Bahasa'],
		[95, 92, 93, 97, 88, 94, 96],
		[
			'Wawan Setiawan',
			'Fitri Handayani',
			'Dodi Kurniawan',
			'Nur Aini',
			'Eko Saputro',
			'Lestari Wulan',
			'Arif Rahman'
		]
	]
];

/** Daftar tidak hadir dibangkitkan dengan rumus referensi (jumlah = kursi − hadir). */
function classRoom(id: string, homeroomTeacher: string, percent: number | null): ClassRoom {
	const present = percent === null ? 0 : Math.round((percent * STUDENTS_PER_CLASS) / 100);
	const absentCount = percent === null ? 0 : STUDENTS_PER_CLASS - present;
	return {
		id,
		homeroomTeacher,
		attendancePercent: percent,
		absentees: Array.from({ length: absentCount }, (_, index) => ({
			name: ABSENTEE_POOL[(index + id.length) % ABSENTEE_POOL.length] ?? '',
			status: ABSENCE_CYCLE[(index + id.length) % ABSENCE_CYCLE.length] ?? 'sick'
		}))
	};
}

export const schoolDashboardFixture: SchoolDashboardData = {
	greetingName: 'Pak Ahmad',
	date: '2026-10-05',
	clockStartSeconds: 7 * 3600 + 35 * 60,
	academicYearLabel: 'TA 2026/2027',
	semesterLabel: 'Semester Ganjil',
	schoolName: 'SMA Nusantara Jakarta',
	planName: 'Standard',
	trial: {
		days: ['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07'],
		endTimeLabel: '23.59',
		studentsUsed: 64,
		studentLimit: 100
	},
	attendanceBands: { high: 95, mid: 90 },
	studentsPerClass: STUDENTS_PER_CLASS,
	firstPeriodStartMinutes: 7 * 60,
	defaultRoomId: 'XI-B',
	grades: FLOORS.map(([grade, names, values, teachers]) => ({
		label: grade,
		rooms: names.map((name, index) =>
			classRoom(`${grade}-${name}`, teachers[index] ?? '', values[index] ?? null)
		)
	})),
	reportCard: {
		semesterName: 'ganjil',
		approvalDeadlineLabel: '18 Des',
		steps: [
			{ label: 'Nilai dipublikasikan', count: 18 },
			{ label: 'Deskripsi capaian disunting', count: 12 },
			{ label: 'Diajukan wali kelas', count: 5 },
			{ label: 'Disetujui kepala sekolah', count: 0 }
		]
	},
	seats: {
		used: 612,
		capacity: 800,
		activeStudents7d: 548,
		activeTeachers7d: 41,
		totalTeachers: 48,
		storageUsedGb: 38,
		storageCapacityGb: 100
	},
	followUps: [
		{
			id: 'presensi-xi-b',
			title: 'Presensi XI-B belum diisi',
			detail: 'Wali kelas: Budi Santoso · hari ini',
			actionLabel: 'Ingatkan'
		},
		{
			id: 'guru-tidak-aktif',
			title: '3 guru belum aktif 7 hari',
			detail: 'Belum membuat atau menilai apa pun',
			actionLabel: 'Kirim pengingat'
		},
		{
			id: 'deskripsi-rapor',
			title: '9 kelas belum menyunting deskripsi rapor',
			detail: 'Tenggat persetujuan 18 Des',
			actionLabel: 'Lihat kelas'
		},
		{
			id: 'undangan-ortu',
			title: 'Undangan orang tua kelas X belum dikirim',
			detail: '214 akun orang tua menunggu',
			actionLabel: 'Kirim undangan'
		}
	]
};
