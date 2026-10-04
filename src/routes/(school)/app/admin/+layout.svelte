<script lang="ts">
	import WorkspaceShell, {
		type WorkspaceNavItem
	} from '$lib/components/layout/WorkspaceShell.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import FileText from '@lucide/svelte/icons/file-text';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
	import House from '@lucide/svelte/icons/house';
	import School from '@lucide/svelte/icons/school';
	import Settings from '@lucide/svelte/icons/settings';
	import Users from '@lucide/svelte/icons/users';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const i18n = useI18n();

	// Arsitektur informasi area (referensi FE-04). Item tanpa href = halaman belum dibangun.
	const navItems: WorkspaceNavItem[] = $derived([
		{ label: i18n.t('nav.school.home'), icon: House, href: APP_PATHS.SCHOOL_ADMIN_HOME },
		{ label: i18n.t('nav.school.academic_years'), icon: CalendarRange },
		{ label: i18n.t('nav.school.classes'), icon: School },
		{ label: i18n.t('nav.school.teachers'), icon: Users },
		{ label: i18n.t('nav.school.students'), icon: GraduationCap },
		{ label: i18n.t('nav.school.guardians'), icon: HeartHandshake },
		{ label: i18n.t('nav.school.attendance'), icon: CalendarCheck },
		{ label: i18n.t('nav.school.report_cards'), icon: FileText },
		{ label: i18n.t('nav.school.subscription'), icon: CreditCard },
		{ label: i18n.t('nav.school.settings'), icon: Settings }
	]);
</script>

<WorkspaceShell
	areaLabel={i18n.t('nav.school.area')}
	{navItems}
	tenant={data.identity?.tenant}
	user={data.identity?.user}
	searchPlaceholder={i18n.t('nav.school.search')}
>
	{@render children()}
</WorkspaceShell>
