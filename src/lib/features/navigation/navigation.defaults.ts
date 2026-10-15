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
				['mapel-tp', 'Mapel & TP', 'book-marked', '/app/admin/subjects', 'none', LATER],
				['penugasan', 'Penugasan mengajar', 'network', '/app/admin/assignments', 'none', LATER],
				['asesmen-bobot', 'Asesmen & bobot', 'scale', '/app/admin/assessments', 'none', LATER]
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
				[
					'ekstrakurikuler',
					'Ekstrakurikuler',
					'trophy',
					'/app/admin/extracurriculars',
					'none',
					LATER
				],
				['pengumuman', 'Pengumuman', 'megaphone', '/app/admin/announcements', 'none', LATER]
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
	teacher: [
		['grp-utama', 'Utama', 'house', false, [['beranda', 'Beranda', 'house', '/app/teacher']]],
		[
			'grp-mengajar',
			'Mengajar',
			'book-open',
			true,
			[
				['kelas', 'Kelas', 'school', '/guru/kelas'],
				['materi', 'Materi', 'book-open', '/guru/materi'],
				['tugas', 'Tugas', 'clipboard-list', '/guru/tugas', 'tasks'],
				['assessment', 'Assessment', 'file-question', '/guru/assessment'],
				['jadwal-ujian', 'Jadwal Ujian', 'calendar-clock', '/guru/jadwal-ujian'],
				['progres', 'Progres', 'chart-line', '/guru/progres']
			]
		],
		[
			'grp-komunikasi',
			'Komunikasi',
			'message-square',
			true,
			[['pesan', 'Pesan', 'message-square', '/guru/pesan']]
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
				['presensi-kelas', 'Presensi kelas', 'calendar-check', '/app/teacher/homeroom/attendance'],
				['persetujuan', 'Persetujuan', 'inbox', '/app/teacher/homeroom#persetujuan'],
				[
					'buku-penghubung',
					'Buku penghubung',
					'message-circle',
					'/app/teacher/homeroom#buku-penghubung'
				],
				['rekap-nilai', 'Rekap nilai', 'table', '/app/teacher/homeroom#rekap-nilai'],
				['murid-kelas', 'Murid kelas', 'users', '/app/teacher/homeroom#murid'],
				['rapor', 'Rapor', 'file-text', '/app/teacher/homeroom/report'],
				['nilai-akhir', 'Nilai akhir mapel', 'clipboard-list', '/app/teacher/grades'],
				['jadwal-kelas', 'Jadwal kelas', 'calendar-days', '/app/teacher/homeroom#jadwal'],
				['catatan-perilaku', 'Catatan perilaku', 'notebook-pen', '/app/teacher/homeroom#catatan'],
				['pengaturan', 'Pengaturan', 'settings', '/app/teacher/settings']
			]
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
				['materi', 'Materi', 'book-open', '/murid/materi'],
				['tugas', 'Tugas', 'clipboard-list', '/murid/tugas', 'due'],
				['ujian', 'Ujian', 'clipboard-check', '/murid/ujian'],
				['nilai', 'Nilai & rapor', 'award', '/murid/nilai'],
				['presensi', 'Presensi', 'calendar-check', '/murid/presensi']
			]
		],
		[
			'grp-komunikasi',
			'Komunikasi',
			'message-square',
			true,
			[['pesan', 'Pesan', 'message-square', '/murid/pesan']]
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
				['nilai', 'Nilai', 'award', '/orang-tua/nilai'],
				['presensi', 'Presensi', 'calendar-check', '/orang-tua/presensi'],
				['tugas-anak', 'Tugas anak', 'clipboard-list', '/orang-tua/tugas'],
				['rapor', 'Rapor', 'file-text', '/orang-tua/rapor']
			]
		],
		[
			'grp-komunikasi',
			'Komunikasi',
			'message-square',
			true,
			[
				['pengumuman', 'Pengumuman', 'megaphone', '/orang-tua/pengumuman'],
				['pesan', 'Pesan', 'message-square', '/orang-tua/pesan', 'msgs']
			]
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
