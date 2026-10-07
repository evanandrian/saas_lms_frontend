/**
 * DATA CONTOH panel mapel guru — isi persis `FLIXARE App v3.html` komponen "06 Guru · panel mapel"
 * (konstanta CLS, TIMES, WEEK, DAYS, BABS, BANK, EXAMS, ITEMS, QTEXT). Dipakai di dev & produksi
 * selama modul jadwal, RPP, dan bank soal belum tersedia; selalu berlabel "Data contoh".
 */

export type RppStatus = 'approved' | 'submitted' | 'draft' | 'none';
export type QuestionLevel = 'easy' | 'medium' | 'hard';

export interface TeachingClass {
	readonly code: string;
	readonly name: string;
	/** Warna identitas kelas pada jadwal & progres (data visual referensi). */
	readonly color: string;
	readonly subjectCode: string;
	readonly chapters: readonly string[];
	readonly chaptersDone: number;
	readonly rpp: RppStatus;
}

export interface BankQuestion {
	readonly subjectCode: string;
	readonly text: string;
	readonly type: string;
	readonly level: QuestionLevel;
	readonly used: number;
	readonly icon: 'sigma' | 'leaf' | 'book';
}

export interface ExamAnalysis {
	readonly title: string;
	readonly meta: string;
	/** [persen benar, daya beda] per butir. */
	readonly items: readonly (readonly [number, number])[];
	/** Teks butir; kosong = "Butir n · judul". */
	readonly questionTexts: readonly string[];
}

const MATH = [
	'Bentuk aljabar',
	'Persamaan linear',
	'Pertidaksamaan',
	'Fungsi kuadrat',
	'Grafik fungsi',
	'Barisan & deret'
];

export const teacherPanelsSample = {
	classCount: 4,
	classes: [
		{
			code: 'MTK XI-A',
			name: 'Matematika XI-A',
			color: '#A8620A',
			subjectCode: 'MTK',
			chapters: MATH,
			chaptersDone: 4,
			rpp: 'approved'
		},
		{
			code: 'MTK XI-B',
			name: 'Matematika XI-B',
			color: '#4169E1',
			subjectCode: 'MTK',
			chapters: MATH,
			chaptersDone: 3,
			rpp: 'approved'
		},
		{
			code: 'BIO XI-B',
			name: 'Biologi XI-B',
			color: '#2A8A5D',
			subjectCode: 'BIO',
			chapters: ['Sel', 'Jaringan', 'Organ', 'Sistem gerak', 'Peredaran darah', 'Metabolisme'],
			chaptersDone: 2,
			rpp: 'draft'
		},
		{
			code: 'BIN X-C',
			name: 'B. Indonesia X-C',
			color: '#6D4AE0',
			subjectCode: 'BIN',
			chapters: ['Teks eksposisi', 'Teks laporan', 'Anekdot', 'Hikayat', 'Negosiasi', 'Debat'],
			chaptersDone: 2,
			rpp: 'none'
		}
	] satisfies TeachingClass[],
	periods: ['07.00', '07.45', '08.30', '09.30', '10.15', '11.00', '12.30', '13.15'],
	days: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'],
	/** Indeks hari ini pada `days` (Senin, sesuai tanggal acuan data contoh). */
	todayIndex: 0,
	/** Per hari: [indeks jam, indeks kelas]. */
	week: [
		[
			[1, 0],
			[2, 0],
			[3, 0]
		],
		[
			[2, 1],
			[3, 1],
			[6, 2],
			[7, 2]
		],
		[
			[0, 3],
			[1, 3],
			[4, 0],
			[5, 1]
		],
		[
			[3, 0],
			[4, 0],
			[0, 2],
			[1, 2]
		],
		[
			[1, 1],
			[2, 1],
			[5, 3],
			[6, 3]
		]
	] as readonly (readonly (readonly [number, number])[])[],
	subjectFilters: ['MTK', 'BIO', 'BIN'],
	bank: [
		{
			subjectCode: 'MTK',
			text: 'Tentukan akar-akar persamaan x² − 5x + 6 = 0.',
			type: 'Pilihan ganda',
			level: 'easy',
			used: 14,
			icon: 'sigma'
		},
		{
			subjectCode: 'MTK',
			text: 'Grafik fungsi f(x) = −x² + 4x memotong sumbu x di titik…',
			type: 'Pilihan ganda',
			level: 'medium',
			used: 6,
			icon: 'sigma'
		},
		{
			subjectCode: 'BIO',
			text: 'Jelaskan perbedaan sel hewan dan sel tumbuhan beserta organel khasnya.',
			type: 'Uraian',
			level: 'medium',
			used: 3,
			icon: 'leaf'
		},
		{
			subjectCode: 'BIN',
			text: 'Tulis paragraf argumentasi untuk teks eksposisi bertema sampah plastik.',
			type: 'Uraian',
			level: 'hard',
			used: 2,
			icon: 'book'
		},
		{
			subjectCode: 'MTK',
			text: 'Nilai maksimum fungsi f(x) = −2x² + 8x − 3 adalah…',
			type: 'Isian singkat',
			level: 'hard',
			used: 4,
			icon: 'sigma'
		},
		{
			subjectCode: 'BIO',
			text: 'Organel yang berfungsi sebagai tempat respirasi sel adalah…',
			type: 'Pilihan ganda',
			level: 'easy',
			used: 11,
			icon: 'leaf'
		}
	] satisfies BankQuestion[],
	newQuestionType: 'Pilihan ganda',
	exams: [
		{
			title: 'Kuis Fungsi Kuadrat',
			meta: 'Matematika XI-A · 32 peserta · rata-rata 71',
			items: [
				[92, 0.31],
				[78, 0.42],
				[85, 0.28],
				[64, 0.51],
				[41, 0.47],
				[33, 0.12],
				[70, 0.39],
				[88, 0.22],
				[52, 0.44],
				[27, -0.05]
			],
			questionTexts: [
				'Akar persamaan x² − 5x + 6 = 0',
				'Sumbu simetri f(x) = x² − 6x + 5',
				'Titik puncak f(x) = −x² + 4x',
				'Diskriminan dan jenis akar',
				'Menyusun persamaan dari akar-akarnya',
				'Nilai maksimum f(x) = −2x² + 8x − 3',
				'Grafik terbuka ke atas atau ke bawah',
				'Titik potong sumbu y',
				'Penerapan: luas maksimum kebun',
				'Fungsi kuadrat dari tiga titik'
			]
		},
		{
			title: 'Ulangan Sel',
			meta: 'Biologi XI-B · 34 peserta · rata-rata 76',
			items: [
				[95, 0.18],
				[81, 0.35],
				[74, 0.41],
				[66, 0.48],
				[59, 0.38],
				[83, 0.29],
				[47, 0.52],
				[71, 0.33],
				[38, 0.21],
				[62, 0.45]
			],
			questionTexts: []
		},
		{
			title: 'Kuis Eksposisi',
			meta: 'B. Indonesia X-C · 33 peserta · rata-rata 69',
			items: [
				[86, 0.26],
				[72, 0.37],
				[55, 0.49],
				[44, 0.4],
				[90, 0.15],
				[63, 0.43],
				[35, 0.09],
				[77, 0.31],
				[58, 0.36],
				[49, 0.46]
			],
			questionTexts: []
		}
	] satisfies ExamAnalysis[],
	/** Butir yang dibuka pertama (referensi: soal 6). */
	defaultItem: 5
};
