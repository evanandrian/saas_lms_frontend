import type { MasterKind, MasterRecord } from '$lib/features/master-data/master-data.model';

/**
 * DATA CONTOH Master data — hanya dimuat saat `dev` tanpa backend (FE-04 D2), simpan disimulasikan lokal.
 * Isi CERMIN seeder backend (`cmd/lmsctl/seed.go`, `seed_users.go` + migration `20231003000006`/`000007`),
 * bukan aturan bisnis.
 */
const at = '2026-10-05T00:00:00.000Z';
const base = { description: '', status: 'active' as const, usage: [], updated_at: at };
const usage = (entity: MasterRecord['usage'][number]['entity'], count: number) => [
	{ entity, count }
];

export const masterDataFixture: Record<MasterKind, MasterRecord[]> = {
	institution: [
		{
			...base,
			code: 'test_school_mat',
			name: 'Test',
			tenant_type_code: 'school',
			education_level_code: '',
			email: '',
			phone: '',
			data_region: 'jakarta',
			address: '',
			usage: [...usage('database', 1), ...usage('member', 5)]
		},
		{
			...base,
			code: 'test_personal_mat',
			name: 'Test',
			tenant_type_code: 'personal',
			education_level_code: '',
			email: '',
			phone: '',
			data_region: 'jakarta',
			address: '',
			usage: usage('database', 1)
		},
		{
			...base,
			code: 'test_event_mat',
			name: 'Test',
			tenant_type_code: 'event',
			education_level_code: '',
			email: '',
			phone: '',
			data_region: 'jakarta',
			address: '',
			usage: usage('database', 1)
		}
	],
	academic_year: [
		{
			...base,
			code: 'TA_2025',
			name: '2025/2026',
			start_date: '2025-07-14',
			end_date: '2026-06-26',
			is_current: false,
			status: 'archived'
		},
		{
			...base,
			code: 'TA_2026',
			name: '2026/2027',
			start_date: '2026-07-13',
			end_date: '2027-06-25',
			is_current: true
		},
		{
			...base,
			code: 'TA_2027',
			name: '2027/2028',
			start_date: '2027-07-12',
			end_date: '2028-06-23',
			is_current: false,
			status: 'inactive'
		}
	],
	grade_level: [
		{ ...base, code: 'VII', name: 'Kelas VII', education_level_code: 'SMP', sort_order: 7 },
		{ ...base, code: 'X', name: 'Kelas X', education_level_code: 'SMA', sort_order: 10 },
		{ ...base, code: 'XI', name: 'Kelas XI', education_level_code: 'SMA', sort_order: 11 },
		{ ...base, code: 'XII', name: 'Kelas XII', education_level_code: 'SMA', sort_order: 12 }
	],
	user: [
		{
			...base,
			code: 'admin@school.com',
			name: 'Ahmad Fauzi',
			email: 'admin@school.com',
			phone: '',
			account_kind: 'human',
			tenant_code: 'test_school_mat',
			role_code: 'SCHOOL_ADMIN',
			note: ''
		},
		{
			...base,
			code: 'platform@flixare.com',
			name: 'Efan Andrian',
			email: 'platform@flixare.com',
			phone: '',
			account_kind: 'human',
			tenant_code: 'lms_core',
			role_code: 'PLATFORM_OWNER',
			note: ''
		},
		{
			...base,
			code: 'teacher@school.com',
			name: 'Rina Pratiwi',
			email: 'teacher@school.com',
			phone: '',
			account_kind: 'human',
			tenant_code: 'test_school_mat',
			role_code: 'TEACHER',
			note: ''
		}
	],
	role: [
		{
			...base,
			code: 'PLATFORM_OWNER',
			name: 'Pemilik platform',
			scope: 'platform',
			description: 'Akses penuh konsol FLIXARE.',
			usage: usage('member', 1)
		},
		{
			...base,
			code: 'SCHOOL_ADMIN',
			name: 'Admin sekolah',
			scope: 'tenant',
			description: 'Administrasi data sekolah.',
			usage: usage('member', 2)
		},
		{
			...base,
			code: 'TEACHER',
			name: 'Guru',
			scope: 'tenant',
			description: 'Mengajar, menilai, presensi.',
			usage: usage('member', 1)
		},
		{
			...base,
			code: 'STUDENT',
			name: 'Siswa',
			scope: 'tenant',
			description: 'Mengikuti kelas, tugas, dan ujian.',
			usage: usage('member', 1)
		},
		{
			...base,
			code: 'PARENT',
			name: 'Orang tua',
			scope: 'user',
			description: 'Melihat data anak.',
			usage: usage('member', 1)
		}
	],
	permission: [
		{ ...base, code: 'nilai.read', name: 'Melihat nilai', module: 'nilai', action: 'read' },
		{
			...base,
			code: 'nilai.update',
			name: 'Mengubah nilai',
			module: 'nilai',
			action: 'update',
			description: 'Hanya sebelum rapor dikunci.'
		},
		{
			...base,
			code: 'pengguna.manage',
			name: 'Mengelola pengguna',
			module: 'pengguna',
			action: 'manage'
		},
		{
			...base,
			code: 'platform.master_data.manage',
			name: 'Kelola master data',
			module: 'platform',
			action: 'manage',
			description: 'Kelola master data platform (referensi general)',
			usage: usage('grant', 1)
		}
	],
	notification_template: [
		{
			...base,
			code: 'nilai.terbit',
			name: 'Nilai dipublikasikan',
			channels: ['in_app', 'email', 'whatsapp'],
			subject: 'Nilai {{nama_tugas}} sudah keluar',
			body: 'Nilai {{nama_siswa}} untuk {{nama_tugas}}: {{nilai}}. Lihat detail di FLIXARE.'
		},
		{
			...base,
			code: 'tugas.tenggat_dekat',
			name: 'Tugas mendekati tenggat',
			channels: ['in_app', 'push'],
			subject: '{{nama_tugas}} berakhir besok',
			body: 'Hai {{nama_siswa}}, tugas {{nama_tugas}} perlu dikumpulkan sebelum {{tenggat}}.'
		}
	],
	tenant_type: [
		{
			code: 'school',
			name: 'Sekolah',
			description: 'Institusi pendidikan formal dengan NPSN',
			status: 'active',
			usage: usage('plan', 4),
			updated_at: at
		},
		{
			code: 'personal',
			name: 'Guru pribadi',
			description: 'Pengajar independen atau bimbel kecil',
			status: 'active',
			usage: usage('plan', 3),
			updated_at: at
		},
		{
			code: 'event',
			name: 'Penyelenggara ujian',
			description: 'Lembaga try-out dan sertifikasi per sesi',
			status: 'active',
			usage: usage('plan', 3),
			updated_at: at
		}
	],
	education_level: [
		{
			code: 'SD',
			name: 'Sekolah Dasar',
			sort_order: 1,
			description: '',
			status: 'active',
			usage: usage('plan_price', 2),
			updated_at: at
		},
		{
			code: 'SMP',
			name: 'Sekolah Menengah Pertama',
			sort_order: 2,
			description: '',
			status: 'active',
			usage: [...usage('plan_price', 2), ...usage('subject', 1)],
			updated_at: at
		},
		{
			code: 'SMA',
			name: 'Sekolah Menengah Atas',
			sort_order: 3,
			description: '',
			status: 'active',
			usage: [...usage('plan_price', 2), ...usage('subject', 3)],
			updated_at: at
		},
		{
			code: 'SMK',
			name: 'Sekolah Menengah Kejuruan',
			sort_order: 4,
			description: '',
			status: 'active',
			usage: usage('plan_price', 2),
			updated_at: at
		}
	],
	curriculum: [
		{
			code: 'K13',
			name: 'Kurikulum 2013',
			version: '2013 revisi',
			description: 'Masih dipakai sebagian sekolah untuk kelas akhir.',
			status: 'inactive',
			usage: [],
			updated_at: at
		},
		{
			code: 'KM',
			name: 'Kurikulum Merdeka',
			version: '2025',
			description: 'Pembelajaran berbasis projek dan capaian fase.',
			status: 'active',
			usage: [],
			updated_at: at
		}
	],
	subject: [
		{
			code: 'BIN',
			name: 'Bahasa Indonesia',
			subject_group: 'wajib',
			education_level_code: 'SMA',
			curriculum_code: '',
			description: '',
			status: 'active',
			usage: [],
			updated_at: at
		},
		{
			code: 'BSU',
			name: 'Bahasa Sunda',
			subject_group: 'muatan_lokal',
			education_level_code: 'SMP',
			curriculum_code: '',
			description: 'Untuk sekolah di Jawa Barat',
			status: 'active',
			usage: [],
			updated_at: at
		},
		{
			code: 'BIO',
			name: 'Biologi',
			subject_group: 'peminatan',
			education_level_code: 'SMA',
			curriculum_code: '',
			description: '',
			status: 'active',
			usage: [],
			updated_at: at
		},
		{
			code: 'MTK',
			name: 'Matematika',
			subject_group: 'wajib',
			education_level_code: 'SMA',
			curriculum_code: '',
			description: '',
			status: 'active',
			usage: [],
			updated_at: at
		}
	]
};
