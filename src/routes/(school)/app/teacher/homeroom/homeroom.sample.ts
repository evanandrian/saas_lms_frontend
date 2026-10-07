/**
 * DATA CONTOH dashboard wali kelas — isi persis `FLIXARE App v3.html` layar 06b (konstanta NAMES,
 * MAPEL, MAPEL_FULL, score, ABS, OPTS, PER, SCHED, GURU, THREADS, NOTES0, dan seed kotak persetujuan
 * peran wali kelas). Dipakai di dev & produksi selama modul rombel, presensi, buku penghubung, nilai,
 * rapor, jadwal, dan konseling belum tersedia; selalu berlabel "Data contoh". Angka adalah contoh
 * visual, BUKAN aturan bisnis.
 */

export type AttendanceCode = 'H' | 'S' | 'I' | 'A' | 'T';
export type NoteCategory = 'positive' | 'attention' | 'counseling';

export interface ParentRequestSample {
	readonly kind: 'student' | 'leave';
	readonly title: string;
	readonly requester: string;
	readonly detail: string;
	/** Jam sejak diajukan (SLA 72 jam dihitung dari sini). */
	readonly hoursAgo: number;
}

export interface ThreadSample {
	readonly parent: string;
	readonly student: string;
	readonly messages: readonly {
		readonly from: 'parent' | 'teacher';
		readonly text: string;
		readonly time: string;
	}[];
}

export interface BehaviorNoteSample {
	readonly student: string;
	readonly category: NoteCategory;
	readonly date: string;
	readonly text: string;
	readonly notified: boolean;
}

const NAMES = [
	'Aditya Nugraha',
	'Bunga Lestari',
	'Citra Maharani',
	'Dimas Prasetyo',
	'Eka Saputra',
	'Farah Aulia',
	'Gilang Ramadhan',
	'Hana Safitri',
	'Ilham Maulana',
	'Jihan Putri',
	'Kevin Wijaya',
	'Laras Ayu',
	'Muhammad Rizki',
	'Nabila Zahra',
	'Oktaviani',
	'Pandu Wicaksono',
	'Qonita Rahma',
	'Rafi Ananda',
	'Sekar Arum',
	'Taufik Hidayat',
	'Ulfa Nadia',
	'Vino Saputra',
	'Wulan Dari',
	'Yoga Pratama',
	'Zahra Amelia',
	'Andi Setiawan',
	'Bayu Aji',
	'Cindy Claudia',
	'Dewa Ketut',
	'Elsa Marlina',
	'Fikri Haikal',
	'Gita Savitri'
];
const SUBJECTS = ['MTK', 'FIS', 'KIM', 'BIO', 'BIN', 'BIG', 'SEJ', 'EKO'];
const SUBJECTS_FULL: readonly [string, string][] = [
	['Matematika', 'Rina Pratiwi'],
	['Fisika', 'Budi Santoso'],
	['Kimia', 'Dewi Kartika'],
	['Biologi', 'Hendra Wijaya'],
	['B. Indonesia', 'Bambang Sutrisno'],
	['B. Inggris', 'Indah Permata'],
	['Sejarah', 'Teguh Raharjo'],
	['Ekonomi', 'Maya Sari']
];
const SCORE_MAX = 98;

/** Nilai contoh per murid & mapel (rumus referensi). */
function score(student: number, subject: number): number {
	let value = 70 + ((student * 37 + subject * 53) % 27);
	if (student === 4) value -= 12;
	if (student === 9 && subject < 3) value -= 9;
	if (student === 21 && subject === 0) value -= 14;
	return Math.min(SCORE_MAX, value);
}

/** Rekap ketidakhadiran contoh September (rumus referensi). */
function absences(student: number) {
	return {
		sick: (student * 7) % 5 === 0 ? 2 : student % 6 === 0 ? 1 : 0,
		permit: student % 9 === 0 ? 1 : 0,
		absent: student === 4 ? 2 : student === 15 ? 3 : student === 21 ? 1 : 0,
		late: (student * 3) % 7 === 0 ? 2 : 0
	};
}

const GURU: Readonly<Record<string, string>> = {
	Matematika: 'Rina Pratiwi',
	Fisika: 'Budi Santoso',
	Kimia: 'Dewi Kartika',
	Biologi: 'Hendra Wijaya',
	'B. Indonesia': 'Bambang Sutrisno',
	'B. Inggris': 'Indah Permata',
	Sejarah: 'Teguh Raharjo',
	Ekonomi: 'Maya Sari',
	PJOK: 'Joko Prasetyo',
	Agama: 'Ust. Arif Rahman',
	'Seni Budaya': 'Lestari Wulan',
	Informatika: 'Eko Saputro',
	BK: 'Nur Aini',
	PKn: 'Wawan Setiawan',
	'Upacara · Wali kelas': 'Rina Pratiwi',
	'Kegiatan pagi': 'Semua guru'
};
const SCHEDULE: Readonly<Record<string, readonly string[]>> = {
	Sen: [
		'Upacara · Wali kelas',
		'Matematika',
		'Matematika',
		'B. Indonesia',
		'B. Indonesia',
		'Fisika',
		'Sejarah',
		'Sejarah'
	],
	Sel: ['Biologi', 'Biologi', 'B. Inggris', 'B. Inggris', 'Kimia', 'Kimia', 'PJOK', 'PJOK'],
	Rab: ['Fisika', 'Fisika', 'Matematika', 'Ekonomi', 'Ekonomi', 'Agama', 'Agama', 'Seni Budaya'],
	Kam: [
		'B. Indonesia',
		'Kimia',
		'Biologi',
		'Matematika',
		'Matematika',
		'Informatika',
		'Informatika',
		'BK'
	],
	Jum: ['Kegiatan pagi', 'B. Inggris', 'Sejarah', 'Ekonomi', 'PKn', 'PKn', '', '']
};

export const homeroomSample = {
	date: '2026-10-05',
	className: 'XI-A',
	firstPeriod: '07.00',
	recapMonth: 'September 2026',
	schoolDays: 22,
	kkm: 75,
	reportDeadline: '18 Des',
	students: NAMES,
	subjects: SUBJECTS,
	subjectsFull: SUBJECTS_FULL,
	score,
	absences,
	/** Presensi awal hari ini (referensi): murid no. 2 sakit, no. 4 izin. */
	attendance: { 2: 'S', 4: 'I' } as Readonly<Record<number, AttendanceCode>>,
	attendanceNotes: { 2: 'Surat dari orang tua', 4: 'Izin disetujui' } as Readonly<
		Record<number, string>
	>,
	parentRequests: [
		{
			kind: 'student',
			title: 'Data murid · Dimas Prasetyo',
			requester: 'Sari Wulandari',
			detail: 'Alamat murid',
			hoursAgo: 5
		},
		{
			kind: 'leave',
			title: 'Sakit · Dimas Prasetyo',
			requester: 'Sari Wulandari',
			detail: '7 Okt 2026 – 8 Okt 2026',
			hoursAgo: 2
		},
		{
			kind: 'leave',
			title: 'Izin · Aditya Nugraha',
			requester: 'Yuni Nugraha',
			detail: '9 Okt 2026',
			hoursAgo: 30
		},
		{
			kind: 'student',
			title: 'Data murid · Bunga Lestari',
			requester: 'Ratna Lestari',
			detail: 'Tanggal lahir murid',
			hoursAgo: 76
		}
	] satisfies ParentRequestSample[],
	threads: [
		{
			parent: 'Sari Wulandari',
			student: 'Dimas Prasetyo',
			messages: [
				{
					from: 'parent',
					text: 'Selamat pagi Bu Rina. Dimas demam sejak semalam, surat dokter sudah saya unggah di pengajuan izin. Mohon info tugas yang perlu dikejar ya, Bu.',
					time: '06.21'
				}
			]
		},
		{
			parent: 'Yuni Nugraha',
			student: 'Aditya Nugraha',
			messages: [
				{
					from: 'parent',
					text: 'Bu, Aditya izin hari Jumat untuk acara keluarga di Bandung.',
					time: 'Kemarin 19.40'
				},
				{
					from: 'teacher',
					text: 'Baik Bu, pengajuannya sudah saya terima. Nanti saya proses.',
					time: 'Kemarin 20.02'
				}
			]
		},
		{
			parent: 'Hartono Saputra',
			student: 'Eka Saputra',
			messages: [
				{
					from: 'parent',
					text: 'Bu, nilai Matematika Eka turun. Apakah ada jadwal remedial?',
					time: 'Sabtu 10.15'
				}
			]
		}
	] satisfies ThreadSample[],
	/** Utas yang sudah dibaca saat halaman dibuka (referensi). */
	readThreads: [1],
	/** Mapel yang nilainya sudah final (indeks `subjectsFull`). */
	subjectsDone: [0, 1, 2, 4, 5, 6],
	homeroomNotesDone: 20,
	/** Murid yang diberi draf catatan wali kelas saat "Susun draf" (referensi). */
	draftNotesFor: 12,
	periods: [
		'07.00–07.45',
		'07.45–08.30',
		'08.30–09.15',
		'09.30–10.15',
		'10.15–11.00',
		'11.00–11.45',
		'12.30–13.15',
		'13.15–14.00'
	],
	scheduleDays: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'],
	todayDay: 'Sen',
	/** Jam pelajaran berjalan (indeks `periods`) pada data contoh. */
	currentPeriod: 0,
	schedule: SCHEDULE,
	teacherOf: GURU,
	notes: [
		{
			student: 'Eka Saputra',
			category: 'counseling',
			date: '2 Okt',
			text: 'Sesi bersama guru BK tentang manajemen waktu belajar. Disepakati belajar terjadwal 1 jam setiap malam.',
			notified: true
		},
		{
			student: 'Farah Aulia',
			category: 'positive',
			date: '30 Sep',
			text: 'Lolos seleksi OSN Biologi tingkat kota. Diumumkan saat upacara.',
			notified: true
		},
		{
			student: 'Pandu Wicaksono',
			category: 'attention',
			date: '28 Sep',
			text: 'Tiga kali tidak masuk tanpa keterangan. Orang tua sudah dihubungi melalui telepon.',
			notified: true
		}
	] satisfies BehaviorNoteSample[],
	noteDate: '5 Okt'
};
