<script lang="ts">
	import WorkspaceShell from '$lib/components/layout/WorkspaceShell.svelte';
	import { workspaceNav } from '$lib/features/navigation/navigation.model';
	import { workspaceIdentity } from '$lib/features/workspace/workspace.model';
	import { useI18n } from '$lib/i18n';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const i18n = useI18n();

	const identity = $derived(workspaceIdentity(data.workspace, i18n.t));

	// Arsitektur informasi platform = susunan Menu & navigasi peran platform (backend; cadangan: bawaan FLIXARE).
	const navItems = $derived(workspaceNav(data.navigation, data.workspace));
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
