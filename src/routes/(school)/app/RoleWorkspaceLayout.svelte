<script lang="ts">
	import type { Snippet } from 'svelte';
	import WorkspaceShell from '$lib/components/layout/WorkspaceShell.svelte';
	import type { RoleShellArea } from '$lib/features/navigation/role-shell';
	import { toWorkspaceNav, type NavigationGroup } from '$lib/features/navigation/navigation.model';
	import { workspaceIdentity } from '$lib/features/workspace/workspace.model';
	import { useI18n } from '$lib/i18n';
	import { BUILT_APP_PATHS } from '$lib/utils/app-paths';

	type Props = {
		/** Hasil `loadRoleShell` dari `+layout.server.ts` area. */
		data: {
			navigation: NavigationGroup[];
			workspace: Parameters<typeof workspaceIdentity>[0];
		};
		area: RoleShellArea;
		children: Snippet;
	};

	let { data, area, children }: Props = $props();

	// Kunci i18n per area ditulis eksplisit agar tetap dapat dicari (grep).
	const AREA_KEYS = {
		student: { area: 'nav.student.area', search: 'nav.student.search' },
		guardian: { area: 'nav.guardian.area', search: 'nav.guardian.search' }
	} as const satisfies Record<RoleShellArea, { area: string; search: string }>;

	const i18n = useI18n();
	const identity = $derived(workspaceIdentity(data.workspace, i18n.t));

	// Arsitektur informasi = susunan Menu & navigasi peran area (backend; cadangan: bawaan FLIXARE).
	// Badge hanya bila backend mengirim angkanya.
	const navItems = $derived(
		toWorkspaceNav(data.navigation, {
			badges: data.workspace?.badges ?? {},
			builtPaths: BUILT_APP_PATHS
		})
	);
</script>

<WorkspaceShell
	areaLabel={i18n.t(AREA_KEYS[area].area)}
	{navItems}
	tenant={identity?.tenant}
	user={identity?.user}
	searchPlaceholder={i18n.t(AREA_KEYS[area].search)}
>
	{@render children()}
</WorkspaceShell>
