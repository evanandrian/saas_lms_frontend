<script lang="ts">
	import WorkspaceShell, {
		type WorkspaceNavItem
	} from '$lib/components/layout/WorkspaceShell.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import Award from '@lucide/svelte/icons/award';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import House from '@lucide/svelte/icons/house';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const i18n = useI18n();

	// Arsitektur informasi area (referensi FE-04). Item tanpa href = halaman belum dibangun.
	const navItems: WorkspaceNavItem[] = $derived([
		{ label: i18n.t('nav.student.home'), icon: House, href: APP_PATHS.STUDENT_HOME },
		{ label: i18n.t('nav.student.materials'), icon: BookOpen },
		{
			label: i18n.t('nav.student.assignments'),
			icon: ClipboardList,
			badge: data.identity?.navBadges.assignments
		},
		{ label: i18n.t('nav.student.assessments'), icon: ClipboardCheck },
		{ label: i18n.t('nav.student.grades'), icon: Award },
		{ label: i18n.t('nav.student.attendance'), icon: CalendarCheck },
		{ label: i18n.t('nav.student.messages'), icon: MessageSquare }
	]);
</script>

<WorkspaceShell
	areaLabel={i18n.t('nav.student.area')}
	{navItems}
	tenant={data.identity?.tenant}
	user={data.identity?.user}
	searchPlaceholder={i18n.t('nav.student.search')}
>
	{@render children()}
</WorkspaceShell>
