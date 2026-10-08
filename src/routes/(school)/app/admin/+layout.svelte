<script lang="ts">
	import WorkspaceShell, {
		type WorkspaceNavItem
	} from '$lib/components/layout/WorkspaceShell.svelte';
	import RoleSwitch, {
		type RoleSwitchItem
	} from '$lib/features/dashboards/components/RoleSwitch.svelte';
	import { workspaceIdentity } from '$lib/features/workspace/workspace.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import FileText from '@lucide/svelte/icons/file-text';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
	import House from '@lucide/svelte/icons/house';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import School from '@lucide/svelte/icons/school';
	import Settings from '@lucide/svelte/icons/settings';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Users from '@lucide/svelte/icons/users';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const i18n = useI18n();

	const isPrincipalView = $derived(data.activeView === 'principal');
	const approvalsBadge = $derived(data.pendingApprovals ?? undefined);

	// Arsitektur informasi area (referensi FE-04). Item tanpa href = halaman belum dibangun.
	const schoolNav: WorkspaceNavItem[] = $derived([
		{ label: i18n.t('nav.school.home'), icon: House, href: APP_PATHS.SCHOOL_ADMIN_HOME },
		{
			label: i18n.t('nav.school.approvals'),
			icon: Inbox,
			href: APP_PATHS.SCHOOL_ADMIN_APPROVALS,
			badge: approvalsBadge
		},
		{ label: i18n.t('nav.school.academic_years'), icon: CalendarRange },
		{ label: i18n.t('nav.school.classes'), icon: School },
		{ label: i18n.t('nav.school.teachers'), icon: Users },
		{ label: i18n.t('nav.school.students'), icon: GraduationCap },
		{ label: i18n.t('nav.school.guardians'), icon: HeartHandshake },
		{ label: i18n.t('nav.school.attendance'), icon: CalendarCheck },
		{ label: i18n.t('nav.school.report_cards'), icon: FileText },
		{
			label: i18n.t('nav.school.subscription'),
			icon: CreditCard,
			href: APP_PATHS.SCHOOL_ADMIN_BILLING
		},
		{ label: i18n.t('nav.school.settings'), icon: Settings, href: APP_PATHS.SCHOOL_ADMIN_ACCOUNT }
	]);

	// Sidebar kepala sekolah (referensi shell NAV.principal): menu bagian menggulir ke seksi dashboard.
	const section = (hash: string) => ({ href: APP_PATHS.PRINCIPAL_HOME, hash });
	const principalNav: WorkspaceNavItem[] = $derived([
		{ label: i18n.t('nav.principal.home'), icon: House, href: APP_PATHS.PRINCIPAL_HOME },
		{
			label: i18n.t('nav.principal.approvals'),
			icon: Inbox,
			href: APP_PATHS.SCHOOL_ADMIN_APPROVALS,
			badge: approvalsBadge
		},
		{ label: i18n.t('nav.principal.attendance'), icon: CalendarCheck, ...section('presensi') },
		{ label: i18n.t('nav.principal.reports'), icon: ChartColumn, ...section('laporan') },
		{ label: i18n.t('nav.principal.classes'), icon: School, ...section('kelas') },
		{ label: i18n.t('nav.principal.report_cards'), icon: FileText, ...section('rapor') },
		{ label: i18n.t('nav.principal.teachers'), icon: Users, ...section('guru') },
		{ label: i18n.t('nav.principal.students'), icon: GraduationCap, ...section('murid') },
		{ label: i18n.t('nav.principal.announcements'), icon: Megaphone, ...section('pengumuman') },
		{
			label: i18n.t('nav.principal.settings'),
			icon: Settings,
			href: APP_PATHS.SCHOOL_ADMIN_ACCOUNT
		}
	]);

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
	navItems={isPrincipalView ? principalNav : schoolNav}
	tenant={identity?.tenant}
	user={identity?.user}
	searchPlaceholder={isPrincipalView ? i18n.t('nav.principal.search') : i18n.t('nav.school.search')}
>
	{#snippet headerActions()}
		{#if roleItems.length}<RoleSwitch items={roleItems} />{/if}
	{/snippet}
	{@render children()}
</WorkspaceShell>
