/**
 * Konteks akses pengguna terautentikasi (FE-05).
 *
 * Kunci frontend adalah *workspace area* — area kerja yang memang dimiliki frontend sebagai route —
 * bukan katalog role/permission backend (BLOCKED-04). Bentuk data identitas backend (`me`,
 * membership, role) belum ada di kontrak (BLOCKED-02); `toAccessContext()` adalah satu-satunya
 * adapter yang kelak menerjemahkan respons backend ke bentuk ini.
 *
 * Model mendukung banyak membership per pengguna (mis. guru di sekolah A dan admin di sekolah B);
 * tidak ada asumsi satu pengguna = satu peran = satu tenant.
 */
export const WORKSPACE_AREAS = [
	'platform',
	'school_admin',
	'teacher',
	'student',
	'guardian'
] as const;
export type WorkspaceArea = (typeof WORKSPACE_AREAS)[number];

export interface Membership {
	readonly id: string;
	readonly area: WorkspaceArea;
	/** Subdomain tenant tempat membership berlaku; `null` untuk area platform. */
	readonly tenant: string | null;
	/** Label tampilan (mis. nama lembaga + peran). */
	readonly label: string;
}

export interface AccessContext {
	readonly user: { readonly id: string; readonly displayName: string };
	readonly memberships: readonly Membership[];
	/** Konteks aktif yang dipilih pengguna; `null` bila belum dipilih. */
	readonly activeMembershipId: string | null;
}

/** Data identitas mentah sebelum divalidasi (kelak: respons auth backend). */
export interface RawAccessContext {
	readonly user: { readonly id: string; readonly displayName: string };
	readonly memberships: readonly {
		readonly id: string;
		readonly area: string;
		readonly tenant: string | null;
		readonly label: string;
	}[];
	readonly activeMembershipId: string | null;
}

export function isWorkspaceArea(value: unknown): value is WorkspaceArea {
	return typeof value === 'string' && (WORKSPACE_AREAS as readonly string[]).includes(value);
}

/**
 * Membership dengan area yang tidak dikenali **dibuang**, tidak pernah dipetakan ke area lain
 * (mis. role tak dikenal ≠ murid). Pengguna tanpa membership tersisa berakhir di akses ditolak.
 */
export function toAccessContext(raw: RawAccessContext): AccessContext {
	const memberships = raw.memberships.flatMap((membership) =>
		isWorkspaceArea(membership.area) ? [{ ...membership, area: membership.area }] : []
	);
	const hasActive = memberships.some((membership) => membership.id === raw.activeMembershipId);
	return {
		user: raw.user,
		memberships,
		activeMembershipId: hasActive ? raw.activeMembershipId : null
	};
}
