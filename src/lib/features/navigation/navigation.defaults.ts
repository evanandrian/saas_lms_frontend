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
type ItemSeed = [code: string, name: string, icon: string, route: string, badge?: NavigationBadge];
type GroupSeed = [code: string, name: string, icon: string, showLabel: boolean, items: ItemSeed[]];

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
				['pengaturan', 'Pengaturan', 'settings', '/platform/pengaturan']
			]
		]
	],
	school_admin: [
		['grp-utama', 'Utama', 'house', false, [['beranda', 'Beranda', 'house', '/app/admin']]],
		[
			'grp-akademik',
			'Akademik',
			'calendar-range',
			true,
			[
				['tahun-ajaran', 'Tahun ajaran', 'calendar-range', '/sekolah/tahun-ajaran'],
				['kelas', 'Kelas', 'school', '/sekolah/kelas']
			]
		],
		[
			'grp-pengguna',
			'Pengguna',
			'users',
			true,
			[
				['guru', 'Guru', 'users', '/sekolah/guru'],
				['murid', 'Murid', 'graduation-cap', '/sekolah/murid'],
				['orang-tua', 'Orang tua', 'heart-handshake', '/sekolah/orang-tua']
			]
		],
		[
			'grp-kegiatan',
			'Kegiatan',
			'calendar-check',
			true,
			[
				['presensi', 'Presensi', 'calendar-check', '/sekolah/presensi'],
				['rapor', 'Rapor', 'file-text', '/sekolah/rapor']
			]
		],
		[
			'grp-akun',
			'Akun',
			'settings',
			true,
			[
				['langganan', 'Langganan', 'credit-card', '/sekolah/langganan'],
				['pengaturan', 'Pengaturan', 'settings', '/sekolah/pengaturan']
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
			[['pengaturan', 'Pengaturan', 'settings', '/guru/pengaturan']]
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
			[['pengaturan', 'Pengaturan', 'settings', '/orang-tua/pengaturan']]
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
		items: items.map(([itemCode, itemName, itemIcon, route, badge = 'none']) => ({
			id: `${role}:${itemCode}`,
			code: itemCode,
			name: itemName,
			icon: itemIcon,
			route,
			target: 'same',
			hidden: false,
			badge
		}))
	}));
	return { role, version: 0, updated_at: new Date(0).toISOString(), groups };
}
