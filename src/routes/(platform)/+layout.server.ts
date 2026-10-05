import { dev } from '$app/environment';
import { enforceRouteAccess } from '$lib/auth/dashboard-routing';
import { loadNavigationSidebar } from '$lib/features/navigation/navigation.api';
import { defaultNavigationLayout } from '$lib/features/navigation/navigation.defaults';
import { visibleGroups } from '$lib/features/navigation/navigation.model';
import { assertHostKind } from '$lib/utils/host-context';
import type { LayoutServerLoad } from './$types';

const SIDEBAR_ROLE = 'platform';

export const load: LayoutServerLoad = async ({ locals, url, fetch, cookies, depends }) => {
	assertHostKind(locals.host, ['platform', 'unified']);
	// Seluruh `/console/*` terlindungi; keputusan akses berasal dari Dashboard Routing Policy (FE-05).
	enforceRouteAccess(locals.session, locals.host, url);
	// Sidebar disusun di halaman Menu & navigasi; disimpan ulang → `invalidate('app:navigation')`.
	depends('app:navigation');
	const sidebar = await loadNavigationSidebar({ fetch, cookies }, SIDEBAR_ROLE);
	return {
		// Backend tak terjangkau/belum masuk lewat backend → susunan bawaan FLIXARE agar sidebar tetap tampil.
		navigation: sidebar.ok
			? sidebar.layout.groups
			: visibleGroups(defaultNavigationLayout(SIDEBAR_ROLE).groups),
		// Identitas dari sesi menunggu kontrak auth (BLOCKED-02); data contoh hanya di dev (FE-04 D2).
		identity: dev ? (await import('./workspace.fixture')).platformIdentityFixture : null
	};
};
