import { loadSidebarGroups } from '$lib/features/navigation/navigation.sidebar';
import { loadWorkspace } from '$lib/features/workspace/workspace.server';
import type { LayoutServerLoad } from './$types';

const SIDEBAR_ROLE = 'guardian';

export const load: LayoutServerLoad = async (event) => {
	// Sidebar disusun di halaman Menu & navigasi platform; disimpan ulang -> `invalidate('app:navigation')`.
	event.depends('app:navigation');
	const [navigation, workspace] = await Promise.all([
		// Backend tak terjangkau -> susunan bawaan FLIXARE agar sidebar tetap tampil.
		loadSidebarGroups({ fetch: event.fetch, cookies: event.cookies }, SIDEBAR_ROLE),
		// Kartu lembaga/user, sapaan dashboard, dan badge menu dari backend.
		loadWorkspace(event, 'guardian')
	]);
	return { navigation, workspace };
};
