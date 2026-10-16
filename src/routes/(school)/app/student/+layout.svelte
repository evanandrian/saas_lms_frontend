<script lang="ts">
	import WorkspaceShell from '$lib/components/layout/WorkspaceShell.svelte';
	import { toWorkspaceNav } from '$lib/features/navigation/navigation.model';
	import { workspaceIdentity } from '$lib/features/workspace/workspace.model';
	import { useI18n } from '$lib/i18n';
	import { BUILT_APP_PATHS } from '$lib/utils/app-paths';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const i18n = useI18n();
	const identity = $derived(workspaceIdentity(data.workspace, i18n.t));

	// Arsitektur informasi = susunan Menu & navigasi peran student (backend; cadangan: bawaan FLIXARE).
	// Badge hanya bila backend mengirim angkanya.
	const navItems = $derived(
		toWorkspaceNav(data.navigation, {
			badges: data.workspace?.badges ?? {},
			builtPaths: BUILT_APP_PATHS
		})
	);
</script>

<WorkspaceShell
	areaLabel={i18n.t('nav.student.area')}
	{navItems}
	tenant={identity?.tenant}
	user={identity?.user}
	searchPlaceholder={i18n.t('nav.student.search')}
>
	{@render children()}
</WorkspaceShell>
