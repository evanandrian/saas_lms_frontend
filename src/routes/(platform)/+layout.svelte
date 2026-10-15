<script lang="ts">
	import WorkspaceShell from '$lib/components/layout/WorkspaceShell.svelte';
	import { NAVIGATION_BADGES, toWorkspaceNav } from '$lib/features/navigation/navigation.model';
	import { workspaceBadge, workspaceIdentity } from '$lib/features/workspace/workspace.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const i18n = useI18n();

	// Rute yang sudah dibangun; rute lain dari Menu & navigasi tampil nonaktif (FE-04 D6), bukan menuju 404.
	const BUILT_PATHS: ReadonlySet<string> = new Set(Object.values(APP_PATHS));

	const identity = $derived(workspaceIdentity(data.workspace, i18n.t));

	// Angka badge dari backend; kode tanpa sumber data tidak dikirim → tanpa badge.
	const badges = $derived(
		Object.fromEntries(NAVIGATION_BADGES.map((b) => [b, workspaceBadge(data.workspace, b)]))
	);

	// Arsitektur informasi platform = susunan Menu & navigasi peran platform (backend; cadangan: bawaan FLIXARE).
	const navItems = $derived(toWorkspaceNav(data.navigation, { badges, builtPaths: BUILT_PATHS }));
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
