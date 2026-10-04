import { enforceRouteAccess } from '$lib/auth/dashboard-routing';
import { assertHostKind } from '$lib/utils/host-context';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	assertHostKind(locals.host, ['tenant', 'unified']);
	// Seluruh `/app/*` terlindungi; keputusan akses berasal dari Dashboard Routing Policy (FE-05).
	enforceRouteAccess(locals.session, locals.host, url);
};
