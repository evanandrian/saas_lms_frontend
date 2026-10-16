import type {
	NavigationBadge,
	NavigationGroup,
	NavigationLayout,
	NavigationRole
} from './navigation.model';

/**
 * Susunan bawaan FLIXARE per peran — CERMIN `saas_lms_backend/internal/platform/navigation/defaults.go`
 * (referensi FLIXARE App v3 · MenuMaster SEED). Backend adalah sumber kebenaran; salinan ini hanya
 * cadangan saat backend tidak terjangkau (sidebar tetap tampil) dan data simulasi editor saat dev.
 * Ubah keduanya bersamaan.
 */
type ItemSeed = [
	code: string,
	name: string,
	icon: string,
	route: string,
	badge?: NavigationBadge,
	hidden?: boolean
];
type GroupSeed = [code: string, name: string, icon: string, showLabel: boolean, items: ItemSeed[]];

/** Menu fase berikut: sudah di-seed, tersembunyi sampai halamannya dibangun (keputusan pemilik 15 Okt 2026). */
const LATER = true;

const SEEDS: Record<NavigationRole, GroupSeed[]> = {
	platform: [
		[
			'grp-utama',
			'Utama',
			'layout-dashboard',
			false,
			[
				['dashboard', 'Dashboard', 'layout-dashboard', '/console'],
				['pengajuan', 'Pengajuan', 'inbox', '/platform/pengajuan', 'apps'],
				['tenant', 'Tenant', 'building-2', '/platform/tenant']
			]
		],
		[
			'grp-produk',
			'Produk',
			'package',
			true,
			[
				['paket', 'Paket & fitur', 'package', '/settings/plans'],
				['master-data', 'Master data', 'database', '/settings/master-data'],
				['menu-navigasi', 'Menu & navigasi', 'list-tree', '/settings/navigation']
			]
		],
		[
			'grp-keuangan',
			'Keuangan',
			'wallet',
			true,
			[
				['invoice', 'Invoice', 'receipt', '/platform/invoice'],
				['pembayaran', 'Pembayaran', 'wallet', '/platform/pembayaran']
			]
		],
		[
			'grp-sistem',
			'Sistem',
			'server',
			true,
			[
				['cluster-db', 'Cluster DB', 'server', '/platform/cluster-db'],
				['audit-log', 'Audit log', 'scroll-text', '/platform/audit-log'],
				['persetujuan', 'Persetujuan akun', 'inbox', '/settings/approvals'],
				['pengaturan', 'Pengaturan', 'settings', '/settings/account']
			]
		]
	],
	school_admin: [
		[
			'grp-utama',
			'Utama',
			'house',
			false,
			[
				['beranda', 'Beranda', 'house', '/app/admin'],
				['persetujuan', 'Persetujuan', 'inbox', '/app/admin/approvals', 'approvals']
			]
		],
		[
			'grp-akademik',
			'Akademik',
			'calendar-range',
			true,
			[
				['tahun-ajaran', 'Tahun ajaran', 'calendar-range', '/app/admin/years'],
				['kelas', 'Kelas', 'school', '/app/admin/classes'],
				['mapel-tp', 'Mapel & TP', 'book-marked', '/app/admin/subjects'],
				['penugasan', 'Penugasan mengajar', 'network', '/app/admin/assignments'],
				['asesmen-bobot', 'Asesmen & bobot', 'scale', '/app/admin/assessments']
			]
		],
		[
			'grp-pengguna',
			'Pengguna',
			'users',
			true,
			[
				['guru', 'Guru', 'users', '/app/admin/teachers'],
				['murid', 'Murid', 'graduation-cap', '/app/admin/students'],
				['orang-tua', 'Orang tua', 'heart-handshake', '/app/admin/guardians']
			]
		],
		[
			'grp-kegiatan',
			'Kegiatan',
			'calendar-check',
			true,
			[
				['presensi', 'Presensi', 'calendar-check', '/app/admin/attendance'],
				[
					'presensi-guru',
					'Presensi guru',
					'user-check',
					'/app/admin/teacher-attendance',
					'none',
					LATER
				],
				['rapor', 'Rapor', 'file-text', '/app/admin/reports'],
				['ekstrakurikuler', 'Ekstrakurikuler', 'trophy', '/app/admin/extracurriculars'],
				['pengumuman', 'Pengumuman', 'megaphone', '/app/admin/announcements']
			]
		],
		[
			'grp-keuangan',
			'Keuangan & Penerimaan',
			'wallet',
			true,
			[
				['pendaftaran', 'Pendaftaran', 'user-plus', '/app/admin/admissions', 'none', LATER],
				['spp-iuran', 'SPP & iuran', 'wallet', '/app/admin/fees', 'none', LATER],
				['kwitansi', 'Kwitansi & invoice', 'receipt', '/app/admin/receipts', 'none', LATER]
			]
		],
		[
			'grp-sistem',
			'Sistem',
			'settings',
			true,
			[
				['langganan', 'Langganan', 'credit-card', '/app/admin/subscription'],
				[
					'identitas-rapor',
					'Identitas rapor',
					'stamp',
					'/app/admin/report-branding',
					'none',
					LATER
				],
				['log-audit', 'Log audit', 'history', '/app/admin/audit'],
				['pengaturan', 'Pengaturan', 'settings', '/app/admin/settings']
			]
		]
	],
	principal: [
		[
			'grp-utama',
			'Utama',
			'house',
			false,
			[
				['beranda', 'Beranda', 'house', '/app/admin/principal'],
				['persetujuan', 'Persetujuan', 'inbox', '/app/admin/approvals', 'approvals'],
				['presensi', 'Presensi', 'calendar-check', '/app/admin/principal#presensi'],
				['laporan', 'Laporan', 'chart-column', '/app/admin/principal#laporan'],
				['kelas', 'Kelas', 'school', '/app/admin/principal#kelas'],
				['rapor', 'Rapor', 'file-text', '/app/admin/reports'],
				['guru', 'Guru', 'users', '/app/admin/principal#guru'],
				['murid', 'Murid', 'graduation-cap', '/app/admin/principal#murid'],
				['pengumuman', 'Pengumuman', 'megaphone', '/app/admin/principal#pengumuman'],
				['pengaturan', 'Pengaturan', 'settings', '/app/admin/settings']
			]
		]
	],
	// Guru mapel, wali kelas, murid, orang tua: referensi FLIXARE App v5, dikelompokkan (spec 16 Okt 2026).
	// "Tagihan" guru (PERSONAL_OWNER) bukan data menu — ditambahkan layout guru secara bersyarat.
	teacher: [
		['grp-utama', 'Utama', 'house', false, [['beranda', 'Beranda', 'house', '/app/teacher']]],
		[
			'grp-mengajar',
			'Mengajar',
			'book-open',
			true,
			[
				['kelas', 'Kelas', 'school', '/app/teacher/classes', 'none', LATER],
				['materi', 'Materi', 'book-open', '/app/teacher/materials', 'none', LATER],
				['tugas', 'Tugas', 'clipboard-list', '/app/teacher/tasks', 'tasks', LATER],
				['bank-soal', 'Bank soal', 'library', '/app/teacher/question-bank', 'none', LATER],
				['assessment', 'Assessment', 'file-question', '/app/teacher/assessments', 'none', LATER],
				[
					'jadwal-ujian',
					'Jadwal Ujian',
					'calendar-clock',
					'/app/teacher/exam-schedule',
					'none',
					LATER
				]
			]
		],
		[
			'grp-penilaian',
			'Penilaian',
			'award',
			true,
			[
				['nilai-akhir', 'Nilai akhir rapor', 'table', '/app/teacher/grades'],
				['progres', 'Progres', 'chart-line', '/app/teacher/progress', 'none', LATER],
				[
					'deskripsi-rapor',
					'Deskripsi rapor',
					'file-pen-line',
					'/app/teacher/report-descriptions',
					'none',
					LATER
				],
				[
					'analisis-capaian',
					'Analisis capaian',
					'chart-no-axes-column',
					'/app/teacher/achievement-analysis',
					'none',
					LATER
				]
			]
		],
		[
			'grp-presensi',
			'Presensi',
			'calendar-check',
			true,
			[
				[
					'presensi-mapel',
					'Presensi mapel',
					'scan-qr-code',
					'/app/teacher/subject-attendance',
					'none',
					LATER
				],
				[
					'presensi-saya',
					'Presensi saya',
					'user-check',
					'/app/teacher/my-attendance',
					'none',
					LATER
				],
				['piket', 'Piket hari ini', 'shield-alert', '/app/teacher/duty', 'none', LATER]
			]
		],
		[
			'grp-komunikasi',
			'Komunikasi',
			'message-square',
			true,
			[['pesan', 'Pesan', 'message-square', '/app/teacher/messages', 'none', LATER]]
		],
		[
			'grp-akun',
			'Akun',
			'settings',
			true,
			[['pengaturan', 'Pengaturan', 'settings', '/app/teacher/settings']]
		]
	],
	homeroom: [
		[
			'grp-utama',
			'Utama',
			'house',
			false,
			[
				['beranda', 'Beranda', 'house', '/app/teacher/homeroom'],
				['persetujuan', 'Persetujuan', 'inbox', '/app/teacher/homeroom#persetujuan', 'approvals']
			]
		],
		[
			'grp-perwalian',
			'Kelas perwalian',
			'users',
			true,
			[
				['murid-kelas', 'Murid kelas', 'users', '/app/teacher/homeroom#murid'],
				['jadwal-kelas', 'Jadwal kelas', 'calendar-days', '/app/teacher/homeroom#jadwal'],
				['catatan-perilaku', 'Catatan perilaku', 'notebook-pen', '/app/teacher/homeroom#catatan'],
				[
					'buku-penghubung',
					'Buku penghubung',
					'message-circle',
					'/app/teacher/homeroom#buku-penghubung'
				]
			]
		],
		[
			'grp-presensi',
			'Presensi',
			'calendar-check',
			true,
			[
				['presensi-kelas', 'Presensi kelas', 'calendar-check', '/app/teacher/homeroom/attendance'],
				[
					'presensi-per-mapel',
					'Presensi per mapel',
					'scan-qr-code',
					'/app/teacher/homeroom/subject-attendance',
					'none',
					LATER
				]
			]
		],
		[
			'grp-penilaian',
			'Penilaian & rapor',
			'file-text',
			true,
			[
				['rekap-nilai', 'Rekap nilai', 'table', '/app/teacher/homeroom#rekap-nilai'],
				['rapor', 'Rapor', 'file-text', '/app/teacher/homeroom/report'],
				['nilai-akhir', 'Nilai akhir mapel', 'clipboard-list', '/app/teacher/grades']
			]
		],
		[
			'grp-akun',
			'Akun',
			'settings',
			true,
			[['pengaturan', 'Pengaturan', 'settings', '/app/teacher/settings']]
		]
	],
	student: [
		['grp-utama', 'Utama', 'house', false, [['beranda', 'Beranda', 'house', '/app/student']]],
		[
			'grp-belajar',
			'Belajar',
			'book-open',
			true,
			[
				['materi', 'Materi', 'book-open', '/app/student/materials'],
				['tugas', 'Tugas', 'clipboard-list', '/app/student/tasks', 'due'],
				['ujian', 'Ujian', 'clipboard-check', '/app/student/assessments']
			]
		],
		[
			'grp-hasil',
			'Hasil belajar',
			'award',
			true,
			[
				['nilai', 'Nilai & rapor', 'award', '/app/student/grades'],
				['presensi', 'Presensi', 'calendar-check', '/app/student/attendance']
			]
		],
		[
			'grp-komunikasi',
			'Komunikasi',
			'message-square',
			true,
			[['pesan', 'Pesan', 'message-square', '/app/student/messages']]
		],
		[
			'grp-akun',
			'Akun',
			'settings',
			true,
			[['pengaturan', 'Pengaturan', 'settings', '/app/student/settings']]
		]
	],
	guardian: [
		['grp-utama', 'Utama', 'house', false, [['beranda', 'Beranda', 'house', '/app/guardian']]],
		[
			'grp-anak',
			'Anak',
			'graduation-cap',
			true,
			[
				['nilai', 'Nilai', 'award', '/app/guardian/grades', 'none', LATER],
				['presensi', 'Presensi', 'calendar-check', '/app/guardian/attendance', 'none', LATER],
				['tugas-anak', 'Tugas anak', 'clipboard-list', '/app/guardian/tasks', 'none', LATER],
				['rapor', 'Rapor', 'file-text', '/app/guardian/report']
			]
		],
		[
			'grp-komunikasi',
			'Komunikasi',
			'message-square',
			true,
			[
				['pengumuman', 'Pengumuman', 'megaphone', '/app/guardian/announcements'],
				['pesan', 'Pesan', 'message-square', '/app/guardian/messages', 'msgs', LATER],
				['notifikasi', 'Notifikasi', 'bell', '/app/guardian/notifications', 'none', LATER]
			]
		],
		[
			'grp-keuangan',
			'Keuangan',
			'wallet',
			true,
			[['tagihan-spp', 'Tagihan & SPP', 'wallet', '/app/guardian/billing', 'none', LATER]]
		],
		[
			'grp-akun',
			'Akun',
			'settings',
			true,
			[['pengaturan', 'Pengaturan', 'settings', '/app/guardian/settings']]
		]
	]
};

/** Susunan bawaan sebuah peran. ID = `<role>:<code>` (stabil, bukan UUID backend). */
export function defaultNavigationLayout(role: NavigationRole): NavigationLayout {
	const groups: NavigationGroup[] = SEEDS[role].map(([code, name, icon, showLabel, items]) => ({
		id: `${role}:${code}`,
		code,
		name,
		icon,
		route: '',
		show_label: showLabel,
		default_open: true,
		clickable: false,
		hidden: false,
		items: items.map(([itemCode, itemName, itemIcon, route, badge = 'none', hidden = false]) => ({
			id: `${role}:${itemCode}`,
			code: itemCode,
			name: itemName,
			icon: itemIcon,
			route,
			target: 'same',
			hidden,
			badge
		}))
	}));
	return { role, version: 0, updated_at: new Date(0).toISOString(), groups };
}
