import type { Cookies } from '@sveltejs/kit';
import { toAccessContext, type RawAccessContext } from './access-context';
import {
	clearBackendTokens,
	fetchBackendRoles,
	verifyBackendSession,
	type BackendSessionStatus
} from './backend-auth';
import { clearSessionMeta, writeSessionEnded } from './session-meta';
import { UNRESOLVED_SESSION, type SessionState } from './session';

/**
 * Resolusi sesi produksi (penyelesaian BLOCKED-02, ADR-019): verifikasi token cookie HttpOnly ke
 * `GET /api/v1/auth/me` lalu memetakan roles ke WorkspaceArea. Pengganti shortcut anonim
 * (`UNRESOLVED_SESSION` permanen) di `hooks.server.ts`; backend tetap otoritas keamanan.
 *
 * Fail-closed: token tidak ada, backend tak terjangkau, atau respons tidak sah → anonim tanpa
 * menghapus cookie (kecuali sesi sudah pasti berakhir: `revoked`/`expired`).
 */

/**
 * Tenant konsol platform (kontrak backend: `authorization.PlatformTenantCode`); membership di
 * tenant ini selalu `tenant: null` karena berlaku di host platform, bukan subdomain tenant.
 */
const PLATFORM_TENANT_CODE = 'lms_core';

/**
 * Peta `role_code` (keanggotaan aktif dari `/auth/me`) → *workspace area* frontend.
 *
 * Sumber keputusan: `contextRules` di backend
 * (`saas_lms_backend/internal/platform/account/model.go`); daftar role = katalog `role_g`
 * (seed `001_core_seed.sql`). Area adalah konsep frontend (FE-05 D2) — peta ini **menerjemahkan**
 * kontrak backend, bukan mengarang katalog role/permission (BLOCKED-04). Role tak dikenal tidak
 * menghasilkan membership (lihat `toAccessContext`: area tak dikenal dibuang, akses ditolak).
 */
const ROLE_AREA: Readonly<Record<string, string>> = {
	PLATFORM_OWNER: 'platform',
	SCHOOL_ADMIN: 'school_admin',
	PRINCIPAL: 'school_admin',
	TEACHER: 'teacher',
	HOMEROOM_TEACHER: 'teacher',
	PERSONAL_OWNER: 'teacher',
	STUDENT: 'student',
	PARENT: 'guardian',
	EVENT_ORGANIZER: 'school_admin'
};

/** Sesi berakhir pasti (bukan masalah jaringan) → hapus token + metadata, beri tahu halaman masuk. */
function resolveEndedSession(cookies: Cookies, status: 'revoked' | 'expired'): SessionState {
	clearBackendTokens(cookies);
	clearSessionMeta(cookies);
	writeSessionEnded(cookies, status);
	return UNRESOLVED_SESSION;
}

/**
 * Membangun `SessionState` produksi dari `/auth/me`:
 * - `revoked`/`expired` → cookie token & metadata dihapus + `lms_session_ended` → anonim;
 * - `unavailable` → anonim **tanpa** menghapus cookie (backend pulih → sesi dipakai lagi);
 * - `active` → roles dipetakan ke memberships; id membership = `tenant_code` (PK
 *   `(user_id, tenant_code)` unik per pengguna), `activeMembershipId: null` karena konteks produksi
 *   ditentukan host (host-only cookie ADR-019 §3; per host maksimal satu membership).
 */
export async function resolveProductionSession(
	fetcher: typeof fetch,
	cookies: Cookies
): Promise<SessionState> {
	const status: BackendSessionStatus = await verifyBackendSession(fetcher, cookies);
	if (status === 'revoked' || status === 'expired') return resolveEndedSession(cookies, status);
	if (status !== 'active') return UNRESOLVED_SESSION;

	const identity = await fetchBackendRoles(fetcher, cookies);
	if (!identity) return UNRESOLVED_SESSION;

	const raw: RawAccessContext = {
		user: { id: identity.id, displayName: identity.fullName },
		memberships: identity.roles.flatMap(({ tenantCode, roleCode }) => {
			const area = ROLE_AREA[roleCode];
			if (!area) return [];
			const isPlatformTenant = tenantCode === PLATFORM_TENANT_CODE;
			return [
				{
					id: tenantCode,
					area,
					tenant: isPlatformTenant ? null : tenantCode,
					// Nama lembaga tidak ada di kontrak `/auth/me`; kode tenant = label stabil.
					label: tenantCode
				}
			];
		}),
		activeMembershipId: null
	};
	return { status: 'authenticated', context: toAccessContext(raw) };
}
