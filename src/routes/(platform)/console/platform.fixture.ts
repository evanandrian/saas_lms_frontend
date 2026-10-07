import type { PlatformDashboardData } from './platform-dashboard';

/**
 * DATA CONTOH dashboard platform — hanya dimuat saat `dev` (FE-04 D2), dipakai bila data asli belum ada.
 * Isi sama persis dengan `FLIXARE App v3.html` layar 04 (konstanta TICK, APPS, REV, log & churn).
 */
export const platformDashboardFixture: PlatformDashboardData = {
	date: '2026-10-05',
	clockStartSeconds: 7 * 3600 + 35 * 60,
	servicesHealthy: true,
	snapshotLabel: '02.10.2026 23.00 WIB',
	defaultPeriod: '30',
	metricsByPeriod: {
		'7': [
			{
				label: 'PENDAPATAN',
				value: 'Rp96,3 jt',
				note: '▲ 4,0% dari 7 hari sebelumnya',
				tone: 'progress'
			},
			{ label: 'TENANT BARU', value: '4', note: '3 sekolah · 1 guru', tone: 'muted' },
			{ label: 'KONVERSI TRIAL', value: '41%', note: '7 dari 17 trial', tone: 'muted' },
			{ label: 'MURID AKTIF', value: '71%', note: '43.480 dari 61.240 kursi', tone: 'muted' }
		],
		'30': [
			{ label: 'PENDAPATAN', value: 'Rp412,6 jt', note: '▲ 12,4% dari Agustus', tone: 'progress' },
			{ label: 'TENANT BARU', value: '15', note: '11 sekolah · 3 guru · 1 sesi', tone: 'muted' },
			{ label: 'KONVERSI TRIAL', value: '38%', note: '17 trial berjalan', tone: 'muted' },
			{ label: 'MURID AKTIF', value: '71%', note: '43.480 dari 61.240 kursi', tone: 'muted' }
		],
		'90': [
			{
				label: 'PENDAPATAN',
				value: 'Rp1,11 M',
				note: '▲ 18,9% dari kuartal lalu',
				tone: 'progress'
			},
			{ label: 'TENANT BARU', value: '38', note: '27 sekolah · 9 guru · 2 sesi', tone: 'muted' },
			{ label: 'KONVERSI TRIAL', value: '35%', note: 'Rata-rata 3 bulan', tone: 'muted' },
			{ label: 'MURID AKTIF', value: '68%', note: 'Rata-rata 3 bulan', tone: 'muted' }
		]
	},
	applications: [
		{
			id: 'app-1',
			name: 'SMA Nusantara Jakarta',
			meta: 'NPSN 20100123 · SMA · WIB · trial',
			typeLabel: 'SEKOLAH',
			students: 820,
			ageHours: 72,
			databaseName: 'lms_t_sch_20100123'
		},
		{
			id: 'app-2',
			name: 'SMP Harapan Bangsa',
			meta: 'NPSN 20234567 · SMP · WITA · trial',
			typeLabel: 'SEKOLAH',
			students: 410,
			ageHours: 48,
			databaseName: 'lms_t_sch_20234567'
		},
		{
			id: 'app-3',
			name: 'Bimbel Cerdas Prima',
			meta: 'Penyelenggara · Paket 5 Sesi',
			typeLabel: 'SESI',
			students: null,
			ageHours: 24,
			databaseName: 'lms_t_evt_bcp02'
		},
		{
			id: 'app-4',
			name: 'SD Tunas Mulia',
			meta: 'NPSN 20311890 · SD · WIB · berbayar',
			typeLabel: 'SEKOLAH',
			students: 265,
			ageHours: 6,
			databaseName: 'lms_t_sch_20311890'
		},
		{
			id: 'app-5',
			name: 'SMK Teknologi Makassar',
			meta: 'NPSN 40312211 · SMK · WITA · trial',
			typeLabel: 'SEKOLAH',
			students: 1140,
			ageHours: 2,
			databaseName: 'lms_t_sch_40312211'
		}
	],
	slaHours: 72,
	clusterCapacityUnits: 200,
	clusterWarningPercent: 70,
	clusters: [
		{ name: 'pg-jkt-01', usedUnits: 144 },
		{ name: 'pg-jkt-02', usedUnits: 82 },
		{ name: 'pg-jkt-03', usedUnits: 19 }
	],
	provisioningTargetMinutes: 5,
	provisioningLog: [
		{
			id: 'log-1',
			timeLabel: '02.10 21:14',
			status: 'OK',
			database: 'lms_t_sch_20311890',
			durationLabel: '3m12s'
		},
		{
			id: 'log-2',
			timeLabel: '02.10 19:02',
			status: 'OK',
			database: 'lms_t_tch_r8k2p',
			durationLabel: '1m48s'
		},
		{
			id: 'log-3',
			timeLabel: '02.10 18:40',
			status: 'RETRY',
			database: 'lms_t_evt_bcp01',
			durationLabel: '2/5'
		},
		{
			id: 'log-4',
			timeLabel: '01.10 09:03',
			status: 'OK',
			database: 'lms_t_sch_20177342',
			durationLabel: '4m05s'
		}
	],
	revenueYear: 2026,
	revenue: [
		{ label: 'MEI', amountMillions: 248, paidInvoices: 88 },
		{ label: 'JUN', amountMillions: 281, paidInvoices: 94 },
		{ label: 'JUL', amountMillions: 335, paidInvoices: 101 },
		{ label: 'AGU', amountMillions: 367, paidInvoices: 106 },
		{ label: 'SEP', amountMillions: 412.6, paidInvoices: 112 },
		{ label: 'OKT', amountMillions: 158, paidInvoices: 41, inProgress: true }
	],
	billingMonthLabel: 'Okt',
	invoices: [
		{ status: 'paid', count: 96, amountMillions: 318.2 },
		{ status: 'unpaid', count: 14, amountMillions: 74.1 },
		{ status: 'overdue', count: 6, amountMillions: 20.3 }
	],
	churn: [
		{ name: 'SMP Bina Ilmu', reason: 'Overdue 11 hari', level: 'high' },
		{ name: 'Guru · Les Pak Hendra', reason: 'Login turun 80% dalam 14 hari', level: 'high' },
		{ name: 'SMA Cahaya Timur', reason: 'Murid aktif 22% dari kursi', level: 'medium' },
		{ name: 'SD Pelita Hati', reason: 'Belum ada rapor terbit', level: 'low' }
	]
};
