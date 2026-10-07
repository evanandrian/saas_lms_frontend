<script lang="ts">
	import type { Pathname } from '$app/types';
	import WorkspaceShell, {
		type WorkspaceNavEntry
	} from '$lib/components/layout/WorkspaceShell.svelte';
	import {
		isExternalRoute,
		navigationIcon,
		type NavigationBadge
	} from '$lib/features/navigation/navigation.model';
	import { workspaceBadge, workspaceIdentity } from '$lib/features/workspace/workspace.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const i18n = useI18n();

	// Rute yang sudah dibangun; rute lain dari Menu & navigasi tampil nonaktif (FE-04 D6), bukan menuju 404.
	const BUILT_PATHS: ReadonlySet<string> = new Set(Object.values(APP_PATHS));

	// Angka badge dari backend; kode tanpa sumber data tidak dikirim → tanpa badge.
	const badgeCount = (badge: NavigationBadge): number | undefined =>
		workspaceBadge(data.workspace, badge);
	const identity = $derived(workspaceIdentity(data.workspace, i18n.t));

	// Arsitektur informasi platform = susunan Menu & navigasi peran platform (backend; cadangan: bawaan FLIXARE).
	const navItems: WorkspaceNavEntry[] = $derived(
		data.navigation.map((group) => ({
			label: group.name,
			showLabel: group.show_label,
			defaultOpen: group.default_open,
			items: group.items.map((item) => ({
				label: item.name,
				icon: navigationIcon(item.icon),
				href: BUILT_PATHS.has(item.route) ? (item.route as Pathname) : undefined,
				externalHref: isExternalRoute(item.route) ? item.route : undefined,
				newTab: item.target === 'new',
				badge: badgeCount(item.badge)
			}))
		}))
	);
</script>

<WorkspaceShell
	areaLabel={i18n.t('nav.platform.area')}
	{navItems}
	tenant={identity?.tenant}
	user={identity?.user}
	searchPlaceholder={i18n.t('nav.platform.search')}
>
	{@render children()}
</WorkspaceShell>
