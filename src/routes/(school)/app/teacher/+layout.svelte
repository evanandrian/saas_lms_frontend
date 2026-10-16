<script lang="ts">
	import WorkspaceShell from '$lib/components/layout/WorkspaceShell.svelte';
	import RoleSwitch, {
		type RoleSwitchItem
	} from '$lib/features/dashboards/components/RoleSwitch.svelte';
	import { toWorkspaceNav } from '$lib/features/navigation/navigation.model';
	import { workspaceIdentity } from '$lib/features/workspace/workspace.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Users from '@lucide/svelte/icons/users';
	import type { LayoutProps } from './$types';
	import { teacherSidebarGroups } from './teacher-nav';

	let { data, children }: LayoutProps = $props();

	const i18n = useI18n();

	const isHomeroomView = $derived(data.activeView === 'homeroom');

	// Rute yang sudah dibangun; menu tanpa halaman (mis. ditampilkan owner) tampil nonaktif, bukan menuju 404.
	const BUILT_PATHS: ReadonlySet<string> = new Set(Object.values(APP_PATHS));

	// Arsitektur informasi = susunan Menu & navigasi tampilan aktif (backend; cadangan: bawaan FLIXARE)
	// + "Tagihan" bersyarat untuk pemilik tenant guru pribadi. Badge hanya bila backend mengirim angkanya.
	const navItems = $derived(
		toWorkspaceNav(
			teacherSidebarGroups(data.navigation, {
				homeroomView: isHomeroomView,
				roleCode: data.workspace?.user.role_code,
				billingLabel: i18n.t('nav.teacher.billing')
			}),
			{ badges: data.workspace?.badges ?? {}, builtPaths: BUILT_PATHS }
		)
	);

	const homeroomClass = $derived(data.dashboardContext?.homeroom_class?.name ?? null);
	const homeroomLabel = $derived(
		homeroomClass
			? i18n.t('dashboard.role_switch.homeroom_class', { class: homeroomClass })
			: i18n.t('dashboard.role_switch.homeroom')
	);
	const roleLabel = $derived(
		isHomeroomView ? homeroomLabel : i18n.t('dashboard.role_switch.teacher')
	);
	// Kartu lembaga/user dari backend; detail user = tampilan aktif (toggle Guru mapel ↔ Wali kelas).
	const identity = $derived(workspaceIdentity(data.workspace, i18n.t, { userDetail: roleLabel }));

	// Toggle Guru mapel ↔ Wali kelas: hanya bila peran memiliki kedua tampilan (HOMEROOM_TEACHER).
	const roleItems: RoleSwitchItem[] = $derived(
		data.views.includes('teacher') && data.views.includes('homeroom')
			? [
					{
						key: 'teacher',
						label: i18n.t('dashboard.role_switch.teacher'),
						icon: BookOpen,
						href: APP_PATHS.TEACHER_HOME,
						search: 'teacher',
						current: !isHomeroomView
					},
					{
						key: 'homeroom',
						label: homeroomLabel,
						icon: Users,
						href: APP_PATHS.HOMEROOM_HOME,
						current: isHomeroomView
					}
				]
			: []
	);
</script>

<WorkspaceShell
	areaLabel={isHomeroomView ? i18n.t('nav.homeroom.area') : i18n.t('nav.teacher.area')}
	{navItems}
	tenant={identity?.tenant}
	user={identity?.user}
	searchPlaceholder={isHomeroomView
		? homeroomClass
			? i18n.t('nav.homeroom.search', { class: homeroomClass })
			: i18n.t('nav.homeroom.search_any')
		: i18n.t('nav.teacher.search')}
>
	{#snippet headerActions()}
		{#if roleItems.length}<RoleSwitch items={roleItems} />{/if}
	{/snippet}
	{@render children()}
</WorkspaceShell>
