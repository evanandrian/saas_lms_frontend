<script lang="ts">
	import WorkspaceShell from '$lib/components/layout/WorkspaceShell.svelte';
	import { NAVIGATION_BADGES, toWorkspaceNav } from '$lib/features/navigation/navigation.model';
	import { workspaceBadge, workspaceIdentity } from '$lib/features/workspace/workspace.model';
	import { useI18n } from '$lib/i18n';
	import { BUILT_APP_PATHS } from '$lib/utils/app-paths';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const i18n = useI18n();

	const identity = $derived(workspaceIdentity(data.workspace, i18n.t));

	// Angka badge dari backend; kode tanpa sumber data tidak dikirim → tanpa badge.
	const badges = $derived(
		Object.fromEntries(NAVIGATION_BADGES.map((b) => [b, workspaceBadge(data.workspace, b)]))
	);

	// Arsitektur informasi platform = susunan Menu & navigasi peran platform (backend; cadangan: bawaan FLIXARE).
	const navItems = $derived(
		toWorkspaceNav(data.navigation, { badges, builtPaths: BUILT_APP_PATHS })
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
