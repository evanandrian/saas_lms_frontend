/** Path dasar per area (README §6, ADR-019). Path bisnis ditambahkan oleh fase fitur masing-masing. */
export const APP_PATHS = {
	/** Entry aplikasi: login atau landing sesuai peran (Dashboard Routing Policy). */
	ENTRY: '/',
	LOGIN: '/login',
	SELECT_CONTEXT: '/select-context',
	ACCESS_DENIED: '/access-denied',
	JOIN: '/join',
	LOGOUT: '/logout',
	LOGGED_OUT: '/logged-out',
	REGISTER: '/register',
	PLATFORM_HOME: '/console',
	PLATFORM_NAVIGATION: '/settings/navigation',
	PLATFORM_MASTER_DATA: '/settings/master-data',
	PLATFORM_PLANS: '/settings/plans',
	PLATFORM_ACCOUNT: '/settings/account',
	PLATFORM_APPROVALS: '/settings/approvals',
	/** Invoice konsol platform (referensi "04e Invoice"). */
	PLATFORM_INVOICE: '/platform/invoice',
	PLATFORM_PAYMENTS: '/platform/pembayaran',
	/** Proxy bukti transfer pembayaran invoice konsol (`?id=<paymentId>`). */
	PLATFORM_INVOICE_PROOF: '/platform/invoice/proof',
	PLATFORM_TENANT: '/platform/tenant',
	/** Cluster database tenant (referensi "04g Cluster DB"). */
	PLATFORM_CLUSTERS: '/platform/cluster-db',
	/** Audit log platform (referensi "04h Audit Log") & proxy unduh CSV sesuai filter. */
	PLATFORM_AUDIT: '/platform/audit-log',
	PLATFORM_AUDIT_EXPORT: '/platform/audit-log/export',
	/** Tagihan lembaga untuk admin sekolah/penyelenggara dan pemilik guru pribadi. */
	SCHOOL_ADMIN_BILLING: '/app/admin/tagihan',
	TEACHER_BILLING: '/app/teacher/tagihan',
	/** Pengajuan lembaga (referensi "04c Pengajuan Tenant"). */
	PLATFORM_APPLICATIONS: '/platform/pengajuan',
	PLATFORM_APPLICATION_FILES: '/platform/pengajuan/file',
	SCHOOL_HOME: '/app',
	SCHOOL_ADMIN_HOME: '/app/admin',
	/** Admin sekolah (referensi v4): lengkapi data 03b dan modul 05a–05h. */
	SCHOOL_ADMIN_SETUP: '/app/admin/setup',
	SCHOOL_ADMIN_YEARS: '/app/admin/years',
	SCHOOL_ADMIN_CLASSES: '/app/admin/classes',
	SCHOOL_ADMIN_SUBJECTS: '/app/admin/subjects',
	SCHOOL_ADMIN_ASSIGNMENTS: '/app/admin/assignments',
	SCHOOL_ADMIN_TEACHERS: '/app/admin/teachers',
	SCHOOL_ADMIN_STUDENTS: '/app/admin/students',
	SCHOOL_ADMIN_GUARDIANS: '/app/admin/guardians',
	SCHOOL_ADMIN_ATTENDANCE: '/app/admin/attendance',
	SCHOOL_ADMIN_REPORTS: '/app/admin/reports',
	SCHOOL_ADMIN_SUBSCRIPTION: '/app/admin/subscription',
	/** Aktivasi trial → berbayar (referensi "03 Onboarding Berlangganan"). */
	SCHOOL_ADMIN_ACTIVATE: '/app/admin/subscription/activate',
	SCHOOL_ADMIN_IMPORT_TEMPLATE: '/app/admin/import-template',
	SCHOOL_ADMIN_LOGO: '/app/admin/logo',
	/** Unduh PDF rapor terkunci (`?class=…&student=…`; tanpa student = seluruh kelas). */
	SCHOOL_ADMIN_REPORT_PDF: '/app/admin/reports/pdf',
	/** Riwayat perubahan data orang, undangan, dan rapor (audit tenant). */
	SCHOOL_ADMIN_AUDIT: '/app/admin/audit',
	/** Unduh CSV riwayat perubahan (proxy server; tidak muncul di sidebar). */
	SCHOOL_ADMIN_AUDIT_EXPORT: '/app/admin/audit/export',
	/** Dashboard kepala sekolah (peran PRINCIPAL, toggle Kepala sekolah ↔ Admin sekolah). */
	PRINCIPAL_HOME: '/app/admin/principal',
	TEACHER_HOME: '/app/teacher',
	/** Dashboard wali kelas (peran HOMEROOM_TEACHER, toggle Guru mapel ↔ Wali kelas). */
	HOMEROOM_HOME: '/app/teacher/homeroom',
	/** Input presensi harian wali kelas (SAD: satu catatan per murid/kelas/tanggal). */
	HOMEROOM_ATTENDANCE: '/app/teacher/homeroom/attendance',
	/** Rapor kelas perwalian: catatan wali kelas & pengajuan ke kepala sekolah. */
	HOMEROOM_REPORT: '/app/teacher/homeroom/report',
	/** Nilai akhir guru mapel (isi & kunci per kelas-mapel). */
	TEACHER_GRADES: '/app/teacher/grades',
	STUDENT_HOME: '/app/student',
	STUDENT_MATERIALS: '/app/student/materials',
	STUDENT_TASKS: '/app/student/tasks',
	STUDENT_ASSESSMENTS: '/app/student/assessments',
	STUDENT_GRADES: '/app/student/grades',
	/** Unduh PDF rapor terbit milik murid (`?id=<reportId>`). */
	STUDENT_REPORT_PDF: '/app/student/grades/pdf',
	STUDENT_ATTENDANCE: '/app/student/attendance',
	STUDENT_MESSAGES: '/app/student/messages',
	GUARDIAN_HOME: '/app/guardian',
	/** Rapor terbit anak-anak yang tertaut ke orang tua. */
	GUARDIAN_REPORTS: '/app/guardian/report',
	/** Unduh PDF rapor terbit anak (`?id=<reportId>`). */
	GUARDIAN_REPORT_PDF: '/app/guardian/report/pdf',
	SCHOOL_ADMIN_ACCOUNT: '/app/admin/settings',
	SCHOOL_ADMIN_APPROVALS: '/app/admin/approvals',
	TEACHER_ACCOUNT: '/app/teacher/settings',
	STUDENT_ACCOUNT: '/app/student/settings',
	GUARDIAN_ACCOUNT: '/app/guardian/settings',
	/** Proxy berkas Pengaturan Akun (foto profil, unduh data) dan tautan dari email/OAuth. */
	ACCOUNT_PHOTO: '/account/photo',
	ACCOUNT_EXPORTS: '/account/exports',
	/** Proxy lampiran pengajuan untuk peninjau Kotak Persetujuan. */
	APPROVAL_DOCUMENTS: '/approvals/documents',
	VERIFY_EMAIL: '/verify-email',
	/** Aktivasi akun buatan admin sekolah: tautan undangan email & kode aktivasi murid. */
	INVITE: '/invite',
	ACTIVATE: '/activate',
	OAUTH_CALLBACK: '/oauth/callback'
} as const;

/**
 * Parameter `mode` halaman masuk (FE-06), dipakai halaman "Anda telah keluar":
 * `reauth` mengisi email terakhir dari cookie HttpOnly, `other` mengosongkannya. Email tidak pernah di URL.
 */
/** Parameter pilihan tampilan dari toggle peran (`?view=`) di beranda area. */
export const DASHBOARD_VIEW_PARAM = 'view';

export const LOGIN_MODE_PARAM = 'mode';
export const LOGIN_MODES = { REAUTH: 'reauth', OTHER: 'other' } as const;
