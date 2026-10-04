import type { GuardianDashboardData } from './guardian-dashboard';

/**
 * DATA CONTOH dashboard orang tua — hanya dimuat saat `dev` (FE-04 D2), dipakai bila data asli belum ada.
 * Isi sama persis dengan `FLIXARE App v3.html` layar 08 (konstanta CH, sepDays, announce).
 * Jam contoh 16.00 agar sapaan "Selamat sore" sama dengan referensi.
 */
export const guardianDashboardFixture: GuardianDashboardData = {
	greetingName: 'Ibu Sari',
	date: '2026-10-05',
	clockStartSeconds: 16 * 3600,
	masteryTarget: 75,
	excellentThreshold: 85,
	attendanceMonth: { year: 2026, month: 9 },
	children: [
		{
			id: 'dimas',
			fullName: 'Dimas Prasetyo',
			shortName: 'Dimas',
			className: 'XI-A',
			homeroomTeacher: 'Rina Pratiwi',
			headline: 'Dimas hadir dan mengikuti pelajaran dengan baik hari ini.',
			actionNeeded: 'Esai Teks Eksposisi belum dikumpulkan. Tenggatnya Rabu, 7 Oktober.',
			today: [
				{
					time: '06.48',
					icon: 'check',
					tone: 'ok',
					title: 'Hadir di sekolah',
					detail: 'Tercatat oleh wali kelas'
				},
				{
					time: '08.30',
					icon: 'check',
					tone: 'ok',
					title: 'Kuis Aljabar selesai',
					detail: 'Matematika · nilai 86'
				},
				{
					time: '10.30',
					icon: 'alert',
					tone: 'warning',
					title: 'Esai Teks Eksposisi',
					detail: 'Belum dikumpulkan · tenggat Rabu'
				}
			],
			subjects: [
				{ name: 'Matematika', score: 80 },
				{ name: 'Biologi', score: 78 },
				{ name: 'Bahasa Indonesia', score: 88 },
				{ name: 'Bahasa Inggris', score: 84 },
				{ name: 'Sejarah', score: 73 },
				{ name: 'Fisika', score: 76 }
			],
			homeroomNote: {
				text: 'Dimas aktif bertanya di kelas dan rapi dalam mengerjakan tugas. Pada tujuan "Fungsi kuadrat" masih perlu latihan; materi pengayaan sudah tersedia di akunnya.',
				date: '2026-10-02'
			},
			absences: { 16: 'permit' },
			agenda: [
				{
					id: 'dimas-praktikum',
					date: '2026-10-06',
					title: 'Laporan Praktikum Sel',
					detail: 'Biologi · sedang dikerjakan'
				},
				{
					id: 'dimas-esai',
					date: '2026-10-07',
					title: 'Esai Teks Eksposisi',
					detail: 'Bahasa Indonesia · belum dikumpulkan'
				},
				{ id: 'dimas-ujian', date: '2026-10-09', title: 'Ujian Bab 3', detail: 'Biologi · 40 soal' }
			]
		},
		{
			id: 'nadia',
			fullName: 'Nadia Prasetyo',
			shortName: 'Nadia',
			className: 'X-B',
			homeroomTeacher: 'Hendra Wijaya',
			headline: 'Nadia hadir hari ini, dan semua tugasnya minggu ini sudah terkumpul.',
			actionNeeded: null,
			today: [
				{
					time: '06.52',
					icon: 'check',
					tone: 'ok',
					title: 'Hadir di sekolah',
					detail: 'Tercatat oleh wali kelas'
				},
				{
					time: '09.15',
					icon: 'check',
					tone: 'ok',
					title: 'Latihan Vocabulary selesai',
					detail: 'Bahasa Inggris · nilai 92'
				},
				{
					time: '13.00',
					icon: 'book',
					tone: 'muted',
					title: 'Materi baru: Sel Hewan',
					detail: 'Biologi · 2 dari 5 bagian dibaca'
				}
			],
			subjects: [
				{ name: 'Matematika', score: 84 },
				{ name: 'Biologi', score: 82 },
				{ name: 'Bahasa Indonesia', score: 87 },
				{ name: 'Bahasa Inggris', score: 92 },
				{ name: 'Sejarah', score: 85 },
				{ name: 'Kimia', score: 79 }
			],
			homeroomNote: {
				text: 'Nadia konsisten dan teliti. Ia bisa didorong untuk lebih percaya diri saat presentasi kelompok.',
				date: '2026-10-02'
			},
			absences: {},
			agenda: [
				{
					id: 'nadia-poster',
					date: '2026-10-08',
					title: 'Proyek Poster Ekosistem',
					detail: 'Biologi · sedang dikerjakan'
				},
				{
					id: 'nadia-kuis',
					date: '2026-10-12',
					title: 'Kuis Persamaan Linear',
					detail: 'Matematika · 15 soal'
				}
			]
		}
	],
	announcements: [
		{
			id: 'pertemuan-ortu',
			date: '2026-10-17',
			title: 'Pertemuan orang tua & wali kelas',
			detail: '09.00 WIB · Aula'
		},
		{
			id: 'asesmen-sumatif',
			date: '2026-11-16',
			title: 'Pekan asesmen sumatif',
			detail: '16–20 Nov 2026 · jadwal menyusul'
		}
	]
};
