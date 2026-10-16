import type { ServerLoadEvent } from '@sveltejs/kit';
import type { AccountArea } from '$lib/api/generated/lms';
import type { NavigationRole } from '$lib/features/navigation/navigation.model';
import { loadSidebarGroups } from '$lib/features/navigation/navigation.sidebar';
import { loadWorkspace } from '$lib/features/workspace/workspace.server';

/** Peran sidebar dan area akun; sama untuk murid/orang tua, berbeda untuk guru (wali kelas). */
export interface RoleShellOptions {
	sidebarRole: NavigationRole;
	area: AccountArea;
}

/** Data shell layout satu area: sidebar dinamis + identitas workspace. */
export async function loadRoleShell(
	event: ServerLoadEvent,
	{ sidebarRole, area }: RoleShellOptions
) {
	// Sidebar disusun di halaman Menu & navigasi platform; disimpan ulang -> `invalidate('app:navigation')`.
	event.depends('app:navigation');
	const [navigation, workspace] = await Promise.all([
		// Backend tak terjangkau -> susunan bawaan FLIXARE agar sidebar tetap tampil.
		loadSidebarGroups({ fetch: event.fetch, cookies: event.cookies }, sidebarRole),
		// Kartu lembaga/user, sapaan dashboard, dan badge menu dari backend.
		loadWorkspace(event, area)
	]);
	return { navigation, workspace };
}
