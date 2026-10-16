import { loadNavigationSidebar, type NavigationApiContext } from './navigation.api';
import { defaultNavigationLayout } from './navigation.defaults';
import { visibleGroups, type NavigationGroup, type NavigationRole } from './navigation.model';

/**
 * Grup sidebar peran dari halaman Menu & navigasi (backend). Backend tak terjangkau/gagal →
 * susunan bawaan FLIXARE (tanpa item tersembunyi) agar sidebar tetap tampil.
 */
export async function loadSidebarGroups(
	ctx: NavigationApiContext,
	role: NavigationRole
): Promise<NavigationGroup[]> {
	const sidebar = await loadNavigationSidebar(ctx, role);
	return sidebar.ok ? sidebar.layout.groups : visibleGroups(defaultNavigationLayout(role).groups);
}
