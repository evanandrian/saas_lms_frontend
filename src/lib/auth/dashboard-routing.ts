import { APP_PATHS } from '$lib/utils/app-paths';
import type { HostContext } from '$lib/utils/host-context';
import { redirect } from '@sveltejs/kit';
import type { AccessContext, Membership, WorkspaceArea } from './access-context';
import type { SessionState } from './session';

/**
 * Dashboard Routing Policy (FE-05) — SATU-SATUNYA sumber pemetaan area kerja → landing.
 *
 * Login, layout, halaman, dan sidebar tidak pernah memuat percabangan peran; mereka hanya
 * meminta keputusan ke modul ini. Policy dapat diganti konfigurasi remote (backend) dengan
 * meneruskan argumen `policy` tanpa mengubah alur login.
 *
 * PENTING: routing ≠ otorisasi. Policy hanya menentukan tujuan awal; setiap route terlindungi
 * tetap diperiksa `authorizeRoute()`, dan backend tetap otoritas akses data (ADR-019, SAD §9.2).
 */
export interface DashboardRoute {
	/** Landing area; juga awalan path seluruh route area tersebut. */
	readonly landingPath: string;
	/** Host tempat area dilayani (ADR-019). */
	readonly hostKind: 'platform' | 'tenant';
	/** Area nonaktif diperlakukan seperti tidak didukung (akses ditolak), bukan dialihkan. */
	readonly enabled: boolean;
}

export type DashboardRoutingPolicy = Readonly<Record<WorkspaceArea, DashboardRoute>>;

export const DASHBOARD_ROUTING_POLICY: DashboardRoutingPolicy = {
	platform: { landingPath: APP_PATHS.PLATFORM_HOME, hostKind: 'platform', enabled: true },
	school_admin: { landingPath: APP_PATHS.SCHOOL_ADMIN_HOME, hostKind: 'tenant', enabled: true },
	teacher: { landingPath: APP_PATHS.TEACHER_HOME, hostKind: 'tenant', enabled: true },
	student: { landingPath: APP_PATHS.STUDENT_HOME, hostKind: 'tenant', enabled: true },
	guardian: { landingPath: APP_PATHS.GUARDIAN_HOME, hostKind: 'tenant', enabled: true }
};

/** Route yang mewajibkan sesi terautentikasi (ADR-019 §4: `/app/*`, `/console/*`). */
/** Halaman pengaturan platform di luar `/console` (Menu & navigasi, Master data): wajib area platform. */
const PLATFORM_SETTINGS_PREFIX = '/settings';
/** Halaman operasional platform (Pengajuan lembaga, Tenant, dst.): wajib area platform. */
const PLATFORM_OPERATIONS_PREFIX = '/platform';

const PROTECTED_PATH_PREFIXES = [
	APP_PATHS.PLATFORM_HOME,
	APP_PATHS.SCHOOL_HOME,
	APP_PATHS.SELECT_CONTEXT,
	PLATFORM_SETTINGS_PREFIX,
	PLATFORM_OPERATIONS_PREFIX
] as const;

const SEE_OTHER_STATUS = 303;

export type LandingResolution =
	| { readonly kind: 'login' }
	| { readonly kind: 'dashboard'; readonly path: string }
	| { readonly kind: 'select-context' }
	| { readonly kind: 'access-denied' };

export type RouteDecision =
	{ readonly kind: 'allow' } | { readonly kind: 'redirect'; readonly location: string };

function isWithin(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function authenticatedContext(session: SessionState): AccessContext | null {
	return session.status === 'authenticated' ? session.context : null;
}

/** Membership yang berlaku di host saat ini dan areanya aktif di policy. */
export function eligibleMemberships(
	session: SessionState,
	host: HostContext,
	policy: DashboardRoutingPolicy = DASHBOARD_ROUTING_POLICY
): readonly Membership[] {
	const context = authenticatedContext(session);
	if (!context) return [];
	return context.memberships.filter((membership) => {
		const route = policy[membership.area];
		if (!route?.enabled) return false;
		// Host gabungan dev: semua membership berlaku; area & tenant ditentukan sesi (konteks aktif).
		if (host.kind === 'unified') return true;
		if (route.hostKind !== host.kind) return false;
		return host.kind === 'tenant'
			? membership.tenant === host.subdomain
			: membership.tenant === null;
	});
}

/** Tujuan awal untuk pengguna di host ini: login, dashboard, pemilihan konteks, atau akses ditolak. */
export function resolveLanding(
	session: SessionState,
	host: HostContext,
	policy: DashboardRoutingPolicy = DASHBOARD_ROUTING_POLICY
): LandingResolution {
	const context = authenticatedContext(session);
	if (!context) return { kind: 'login' };

	const memberships = eligibleMemberships(session, host, policy);
	const active = memberships.find((membership) => membership.id === context.activeMembershipId);
	const target = active ?? (memberships.length === 1 ? memberships[0] : undefined);

	if (target) return { kind: 'dashboard', path: policy[target.area].landingPath };
	// Tidak ada fallback diam-diam ke area lain: tanpa konteks valid = akses ditolak.
	return memberships.length > 1 ? { kind: 'select-context' } : { kind: 'access-denied' };
}

export function landingLocation(resolution: LandingResolution): string {
	switch (resolution.kind) {
		case 'dashboard':
			return resolution.path;
		case 'select-context':
			return APP_PATHS.SELECT_CONTEXT;
		case 'access-denied':
			return APP_PATHS.ACCESS_DENIED;
		case 'login':
			return APP_PATHS.LOGIN;
	}
}

/**
 * Pemeriksaan akses route (UX + pencegahan salah arah; bukan pengganti otorisasi backend).
 * Anonim → login; terautentikasi tanpa hak atas area → akses ditolak (tidak pernah ke area lain).
 */
export function authorizeRoute(
	session: SessionState,
	host: HostContext,
	url: Pick<URL, 'pathname' | 'search'>,
	policy: DashboardRoutingPolicy = DASHBOARD_ROUTING_POLICY
): RouteDecision {
	const { pathname } = url;
	if (!PROTECTED_PATH_PREFIXES.some((prefix) => isWithin(pathname, prefix))) {
		return { kind: 'allow' };
	}
	if (!authenticatedContext(session)) {
		return { kind: 'redirect', location: APP_PATHS.LOGIN };
	}

	const memberships = eligibleMemberships(session, host, policy);
	if (memberships.length === 0) return { kind: 'redirect', location: APP_PATHS.ACCESS_DENIED };

	// Path di luar area tertentu (`/app` pemilih area, `/select-context`) cukup butuh satu konteks sah.
	const requiredArea: WorkspaceArea | undefined =
		isWithin(pathname, PLATFORM_SETTINGS_PREFIX) || isWithin(pathname, PLATFORM_OPERATIONS_PREFIX)
			? 'platform'
			: (Object.keys(policy) as WorkspaceArea[]).find((area) =>
					isWithin(pathname, policy[area].landingPath)
				);
	if (requiredArea && !memberships.some((membership) => membership.area === requiredArea)) {
		return { kind: 'redirect', location: APP_PATHS.ACCESS_DENIED };
	}
	return { kind: 'allow' };
}

/** Dipanggil load server route terlindungi; melempar redirect SvelteKit bila akses tidak sah. */
export function enforceRouteAccess(
	session: SessionState,
	host: HostContext,
	url: Pick<URL, 'pathname' | 'search'>
): void {
	const decision = authorizeRoute(session, host, url);
	if (decision.kind === 'redirect') redirect(SEE_OTHER_STATUS, decision.location);
}

/**
 * Tujuan setelah autentikasi berhasil: selalu dashboard sesuai peran (atau pemilihan konteks bila
 * pengguna punya lebih dari satu konteks). Keputusan pemilik 5 Okt 2026: halaman yang dibuka sebelum
 * login (`redirectTo`, ADR-019 §4) tidak lagi dipakai.
 */
export function resolvePostAuthDestination(session: SessionState, host: HostContext): string {
	return landingLocation(resolveLanding(session, host));
}
