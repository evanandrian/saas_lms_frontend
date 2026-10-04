/**
 * Permission berformat `<module>.<action>` (SAD Bagian III §4), mis. `assessment.create`.
 * Katalog permission berasal dari backend (BLOCKED-04) — jangan menambah daftar permission di sini.
 */
export type PermissionKey = `${string}.${string}`;

/**
 * Pemeriksaan permission untuk UX (menampilkan/menyembunyikan aksi).
 * Bukan batas keamanan: backend tetap memvalidasi setiap request (SAD §9.2).
 */
export function can(grantedPermissions: ReadonlySet<string>, permission: PermissionKey): boolean {
	return grantedPermissions.has(permission);
}
