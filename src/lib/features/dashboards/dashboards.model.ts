import type { DashboardContext, DashboardView, DashboardViewer } from '$lib/api/generated/lms';

/**
 * Model dashboard per peran (client-safe). Tampilan (`DashboardView`) dipilih lewat toggle peran di
 * topbar: kepala sekolah ↔ admin sekolah (peran PRINCIPAL) dan guru mapel ↔ wali kelas (peran
 * HOMEROOM_TEACHER). Daftar tampilan selalu dari backend (`/dashboards/context`).
 */
export type { DashboardContext, DashboardView };

export type DashboardArea = 'school_admin' | 'teacher';

/** Tampilan per area yang dibangun frontend; tampilan pertama = beranda area. */
export const AREA_VIEWS: Readonly<Record<DashboardArea, readonly DashboardView[]>> = {
	school_admin: ['school_admin', 'principal'],
	teacher: ['teacher', 'homeroom']
};

export const isDashboardView = (value: unknown): value is DashboardView =>
	value === 'principal' || value === 'school_admin' || value === 'teacher' || value === 'homeroom';

/** Bagian yang modulnya belum ada dikirim `null` oleh backend → UI memakai data contoh berlabel. */
export const isSample = (section: readonly unknown[] | null | undefined) => section == null;

/** Kode jenis kelamin backend (users.gender). */
const GENDER_FEMALE = 'P';
const GENDER_MALE = 'L';

/**
 * Nama sapaan dari profil: nama panggilan bila ada, selain itu kata pertama nama lengkap (tanpa
 * gelar). Kunci honorifik dipilih dari jenis kelamin; tanpa data jenis kelamin → nama saja.
 */
export function greetingParts(viewer: DashboardViewer): {
	readonly name: string;
	readonly honorific: 'female' | 'male' | null;
} {
	const base =
		viewer.nickname.trim() || (viewer.full_name.split(',')[0] ?? '').trim().split(/\s+/)[0] || '';
	const honorific =
		viewer.gender === GENDER_FEMALE ? 'female' : viewer.gender === GENDER_MALE ? 'male' : null;
	return { name: base, honorific };
}

/** Semester aktif tenant (1 = ganjil, 2 = genap); `null` bila belum diatur. */
export const semesterKey = (semester: number | null | undefined) =>
	semester === 1 ? 'odd' : semester === 2 ? 'even' : null;
