<script lang="ts">
	import WorkspaceShell from '$lib/components/layout/WorkspaceShell.svelte';
	import RoleSwitch, {
		type RoleSwitchItem
	} from '$lib/features/dashboards/components/RoleSwitch.svelte';
	import { toWorkspaceNav } from '$lib/features/navigation/navigation.model';
	import { workspaceIdentity } from '$lib/features/workspace/workspace.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const i18n = useI18n();

	const isPrincipalView = $derived(data.activeView === 'principal');
	const approvalsBadge = $derived(data.pendingApprovals ?? undefined);

	// Rute yang sudah dibangun; menu fase berikut tanpa halaman tampil nonaktif (FE-04 D6).
	const BUILT_PATHS: ReadonlySet<string> = new Set(Object.values(APP_PATHS));
	// Item menu -> bagian data sekolah (backend `setup.sections[].key`) untuk titik "perlu dilengkapi".
	const SCHOOL_DOT_SECTIONS: Readonly<Record<string, string>> = {
		'tahun-ajaran': 'year',
		kelas: 'classes',
		guru: 'teachers',
		murid: 'students',
		'orang-tua': 'students'
	};

	const dots = $derived.by(() => {
		if (isPrincipalView) return {};
		const sections = data.schoolProgress?.sections ?? [];
		const pendingKeys = new Set(sections.filter((s) => !s.done).map((s) => s.key));
		return Object.fromEntries(
			Object.entries(SCHOOL_DOT_SECTIONS).map(([code, key]) => [code, pendingKeys.has(key)])
		);
	});

	// Arsitektur informasi = susunan Menu & navigasi area aktif (backend; cadangan: bawaan FLIXARE).
	const navItems = $derived(
		toWorkspaceNav(data.navigation, {
			badges: { approvals: approvalsBadge },
			dots,
			builtPaths: BUILT_PATHS
		})
	);

	const roleLabel = $derived(
		isPrincipalView
			? i18n.t('dashboard.role_switch.principal')
			: i18n.t('dashboard.role_switch.school_admin')
	);
	// Kartu lembaga/user dari backend; detail user = tampilan aktif (toggle Kepala sekolah ↔ Admin sekolah).
	const identity = $derived(workspaceIdentity(data.workspace, i18n.t, { userDetail: roleLabel }));

	// Toggle Kepala sekolah ↔ Admin sekolah: hanya bila peran memiliki kedua tampilan (PRINCIPAL).
	const roleItems: RoleSwitchItem[] = $derived(
		data.views.includes('principal') && data.views.includes('school_admin')
			? [
					{
						key: 'principal',
						label: i18n.t('dashboard.role_switch.principal'),
						icon: ShieldCheck,
						href: APP_PATHS.PRINCIPAL_HOME,
						current: isPrincipalView
					},
					{
						key: 'school_admin',
						label: i18n.t('dashboard.role_switch.school_admin'),
						icon: Briefcase,
						href: APP_PATHS.SCHOOL_ADMIN_HOME,
						search: 'school_admin',
						current: !isPrincipalView
					}
				]
			: []
	);
</script>

<WorkspaceShell
	areaLabel={isPrincipalView ? i18n.t('nav.principal.area') : i18n.t('nav.school.area')}
	{navItems}
	tenant={identity?.tenant}
	user={identity?.user}
	searchPlaceholder={isPrincipalView ? i18n.t('nav.principal.search') : i18n.t('nav.school.search')}
>
	{#snippet headerActions()}
		{#if roleItems.length}<RoleSwitch items={roleItems} />{/if}
	{/snippet}
	{@render children()}
</WorkspaceShell>
