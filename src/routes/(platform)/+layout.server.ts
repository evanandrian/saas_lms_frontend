import { dev } from '$app/environment';
import { enforceRouteAccess } from '$lib/auth/dashboard-routing';
import { assertHostKind } from '$lib/utils/host-context';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	assertHostKind(locals.host, ['platform', 'unified']);
	// Seluruh `/console/*` terlindungi; keputusan akses berasal dari Dashboard Routing Policy (FE-05).
	enforceRouteAccess(locals.session, locals.host, url);
	// Identitas dari sesi menunggu kontrak auth (BLOCKED-02); data contoh hanya di dev (FE-04 D2).
	return {
		identity: dev ? (await import('./workspace.fixture')).platformIdentityFixture : null
	};
};
