import { enforceRouteAccess } from '$lib/auth/dashboard-routing';
import { loadNavigationSidebar } from '$lib/features/navigation/navigation.api';
import { defaultNavigationLayout } from '$lib/features/navigation/navigation.defaults';
import { visibleGroups } from '$lib/features/navigation/navigation.model';
import { loadWorkspace } from '$lib/features/workspace/workspace.server';
import { assertHostKind } from '$lib/utils/host-context';
import type { LayoutServerLoad } from './$types';

const SIDEBAR_ROLE = 'platform';

export const load: LayoutServerLoad = async (event) => {
	const { locals, url, fetch, cookies, depends } = event;
	assertHostKind(locals.host, ['platform', 'unified']);
	// Seluruh `/console/*` terlindungi; keputusan akses berasal dari Dashboard Routing Policy (FE-05).
	enforceRouteAccess(locals.session, locals.host, url);
	// Sidebar disusun di halaman Menu & navigasi; disimpan ulang → `invalidate('app:navigation')`.
	depends('app:navigation');
	// Badge menu (Pengajuan) diperbarui setelah keputusan peninjau → `invalidate('app:workspace')`.
	depends('app:workspace');
	const [sidebar, workspace] = await Promise.all([
		loadNavigationSidebar({ fetch, cookies }, SIDEBAR_ROLE),
		// Kartu lembaga/user, sapaan, dan badge menu (mis. Pengajuan) dari backend.
		loadWorkspace(event, 'platform')
	]);
	return {
		// Backend tak terjangkau/belum masuk lewat backend → susunan bawaan FLIXARE agar sidebar tetap tampil.
		navigation: sidebar.ok
			? sidebar.layout.groups
			: visibleGroups(defaultNavigationLayout(SIDEBAR_ROLE).groups),
		workspace
	};
};
