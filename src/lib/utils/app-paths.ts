/** Path dasar per area (README §6, ADR-019). Path bisnis ditambahkan oleh fase fitur masing-masing. */
export const APP_PATHS = {
	LOGIN: '/login',
	SELECT_CONTEXT: '/select-context',
	ACCESS_DENIED: '/access-denied',
	JOIN: '/join',
	LOGOUT: '/logout',
	LOGGED_OUT: '/logged-out',
	REGISTER: '/register',
	REGISTER_PLAN: '/register/plan',
	PLATFORM_HOME: '/console',
	PLATFORM_NAVIGATION: '/settings/navigation',
	PLATFORM_MASTER_DATA: '/settings/master-data',
	PLATFORM_PLANS: '/settings/plans',
	SCHOOL_HOME: '/app',
	SCHOOL_ADMIN_HOME: '/app/admin',
	TEACHER_HOME: '/app/teacher',
	STUDENT_HOME: '/app/student',
	GUARDIAN_HOME: '/app/guardian'
} as const;

/**
 * Parameter `mode` halaman masuk (FE-06), dipakai halaman "Anda telah keluar":
 * `reauth` mengisi email terakhir dari cookie HttpOnly, `other` mengosongkannya. Email tidak pernah di URL.
 */
export const LOGIN_MODE_PARAM = 'mode';
export const LOGIN_MODES = { REAUTH: 'reauth', OTHER: 'other' } as const;
