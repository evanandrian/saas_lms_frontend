import type { ServerLoadEvent } from '@sveltejs/kit';
import { loadSidebarGroups } from '$lib/features/navigation/navigation.sidebar';
import { loadWorkspace } from '$lib/features/workspace/workspace.server';

/** Peran area murid/orang tua: peran sidebar, area akun, dan prefiks kunci i18n identik. */
export type RoleShellArea = 'student' | 'guardian';

/** Data shell layout satu peran: sidebar dinamis + identitas workspace. */
export async function loadRoleShell(event: ServerLoadEvent, role: RoleShellArea) {
	// Sidebar disusun di halaman Menu & navigasi platform; disimpan ulang -> `invalidate('app:navigation')`.
	event.depends('app:navigation');
	const [navigation, workspace] = await Promise.all([
		// Backend tak terjangkau -> susunan bawaan FLIXARE agar sidebar tetap tampil.
		loadSidebarGroups({ fetch: event.fetch, cookies: event.cookies }, role),
		// Kartu lembaga/user, sapaan dashboard, dan badge menu dari backend.
		loadWorkspace(event, role)
	]);
	return { navigation, workspace };
}
