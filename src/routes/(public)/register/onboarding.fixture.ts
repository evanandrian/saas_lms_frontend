/**
 * DATA CONTOH alur pendaftaran & berlangganan (FE-04 D2) — hanya dimuat saat `dev`.
 * Jenis tenant, jenjang, zona waktu, paket, harga, fitur, dan ketentuan trial berasal dari data
 * referensi/paket di backend kelak (BLOCKED-01). Angka di sini BUKAN aturan bisnis kanonik;
 * frontend tidak menghitung harga.
 */
export const registerFixture = {
	steps: [
		{ label: 'Isi data', state: 'current' as const },
		{ label: 'Verifikasi email', state: 'upcoming' as const },
		{ label: 'Persetujuan', state: 'upcoming' as const },
		{ label: 'Pembayaran / trial', state: 'upcoming' as const },
		{ label: 'Lembaga aktif', state: 'upcoming' as const }
	],
	institutionTypes: [
		{
			value: 'school',
			title: 'Sekolah',
			description: 'SD, SMP, SMA, SMK. Kelas, guru, murid, orang tua, dan rapor.',
			meta: 'Mulai Rp5.000/murid/bulan · Trial 5 hari kerja'
		},
		{
			value: 'personal',
			title: 'Guru pribadi',
			description: 'Les privat atau bimbel kecil, hingga 5 lembaga.',
			meta: 'Mulai Rp49.000/bulan · Trial 1 hari'
		},
		{
			value: 'event',
			title: 'Penyelenggara sesi ujian',
			description: 'Tryout atau ujian terbuka dengan kode sesi untuk peserta tamu.',
			meta: 'Sekali bayar per paket · Tanpa trial'
		}
	],
	levels: [
		{ value: 'SD', label: 'SD' },
		{ value: 'SMP', label: 'SMP' },
		{ value: 'SMA', label: 'SMA' },
		{ value: 'SMK', label: 'SMK' }
	],
	timezones: [
		{ value: 'Asia/Jakarta', title: 'WIB' },
		{ value: 'Asia/Makassar', title: 'WITA' },
		{ value: 'Asia/Jayapura', title: 'WIT' }
	],
	timezoneHint:
		'Ditebak dari peramban Anda. Konfirmasi sebelum mengirim; admin dapat mengubahnya nanti.',
	trialHint: '5 hari kerja setelah database aktif, maks. 100 murid.',
	defaults: {
		type: 'school',
		institutionName: 'SMA Nusantara Jakarta',
		npsn: '20100123',
		level: 'SMA',
		studentsEstimate: '800',
		picName: 'Rina Pratiwi',
		email: 'rina@sman-nusantara.sch.id',
		whatsapp: '+62 812 0000 0000',
		timezone: 'Asia/Jakarta'
	}
};

export const planFixture = {
	title: 'Pilih paket untuk SMA Nusantara',
	description: 'Harga per murid per bulan, ditagih tahunan. Sama untuk SD, SMP, SMA, dan SMK.',
	steps: [
		{ label: 'Data lembaga', state: 'done' as const },
		{ label: 'Paket & kursi', state: 'current' as const },
		{ label: 'Pembayaran', state: 'upcoming' as const },
		{ label: 'Aktivasi', state: 'upcoming' as const }
	],
	plans: [
		{
			value: 'SCH_BASIC',
			title: 'Basic',
			meta: 'Rp5.000 /murid/bulan',
			features: [
				'LMS inti, tugas, bank soal',
				'Ujian dengan penilaian otomatis',
				'Rapor & presensi'
			]
		},
		{
			value: 'SCH_STANDARD',
			title: 'Standard',
			meta: 'Rp6.000 /murid/bulan',
			features: [
				'Semua fitur Basic',
				'Portal orang tua',
				'Dasbor kepala sekolah',
				'Analisis butir soal'
			]
		},
		{
			value: 'SCH_PREMIUM',
			title: 'Premium',
			meta: 'Rp7.500 /murid/bulan',
			features: ['Semua fitur Standard', 'Asisten AI', 'White-label']
		}
	],
	selectedPlan: 'SCH_STANDARD',
	seats: { value: 800, min: 50, max: 2000, display: '800', minDisplay: '50', maxDisplay: '2.000' },
	paymentMethods: [
		{
			value: 'transfer',
			title: 'Transfer bank',
			description: 'Unggah bukti, diverifikasi tim keuangan. Cocok untuk pembayaran via bendahara.'
		},
		{
			value: 'va',
			title: 'Virtual account / QRIS',
			description: 'Terverifikasi otomatis melalui payment gateway.'
		}
	],
	selectedPayment: 'transfer',
	// Ringkasan dihitung backend (frontend tidak menghitung tagihan).
	summary: {
		rows: [
			{ label: 'Paket', value: 'Standard' },
			{ label: 'Harga', value: 'Rp6.000 × 800 × 12' },
			{ label: 'Per bulan', value: 'Rp4.800.000' }
		],
		totalLabel: 'Tagihan tahunan',
		total: 'Rp57.600.000',
		trialTitle: 'Trial 5 hari kerja · Rp0',
		trialBody:
			'Aktif Kamis, 1 Okt 2026. Berakhir Rabu, 7 Okt 2026 pukul 23.59 WIB. Sabtu dan Minggu tidak dihitung.',
		note: 'Pengajuan sekolah ditinjau tim FLIXARE. Anda menerima email saat database siap.'
	}
};
