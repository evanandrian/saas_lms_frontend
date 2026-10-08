/** Path dasar per area (README §6, ADR-019). Path bisnis ditambahkan oleh fase fitur masing-masing. */
export const APP_PATHS = {
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
	/** Tagihan lembaga untuk admin sekolah/penyelenggara dan pemilik guru pribadi. */
	SCHOOL_ADMIN_BILLING: '/app/admin/tagihan',
	TEACHER_BILLING: '/app/teacher/tagihan',
	/** Pengajuan lembaga (referensi "04c Pengajuan Tenant"). */
	PLATFORM_APPLICATIONS: '/platform/pengajuan',
	PLATFORM_APPLICATION_FILES: '/platform/pengajuan/file',
	SCHOOL_HOME: '/app',
	SCHOOL_ADMIN_HOME: '/app/admin',
	/** Dashboard kepala sekolah (peran PRINCIPAL, toggle Kepala sekolah ↔ Admin sekolah). */
	PRINCIPAL_HOME: '/app/admin/principal',
	TEACHER_HOME: '/app/teacher',
	/** Dashboard wali kelas (peran HOMEROOM_TEACHER, toggle Guru mapel ↔ Wali kelas). */
	HOMEROOM_HOME: '/app/teacher/homeroom',
	STUDENT_HOME: '/app/student',
	STUDENT_MATERIALS: '/app/student/materials',
	STUDENT_TASKS: '/app/student/tasks',
	STUDENT_ASSESSMENTS: '/app/student/assessments',
	STUDENT_GRADES: '/app/student/grades',
	STUDENT_ATTENDANCE: '/app/student/attendance',
	STUDENT_MESSAGES: '/app/student/messages',
	GUARDIAN_HOME: '/app/guardian',
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
