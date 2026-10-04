<script lang="ts">
	import WorkspaceShell, {
		type WorkspaceNavItem
	} from '$lib/components/layout/WorkspaceShell.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import ChartLine from '@lucide/svelte/icons/chart-line';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import FileQuestion from '@lucide/svelte/icons/file-question';
	import House from '@lucide/svelte/icons/house';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import School from '@lucide/svelte/icons/school';
	import Settings from '@lucide/svelte/icons/settings';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const i18n = useI18n();

	// Arsitektur informasi area (referensi FE-04). Item tanpa href = halaman belum dibangun.
	const navItems: WorkspaceNavItem[] = $derived([
		{ label: i18n.t('nav.teacher.home'), icon: House, href: APP_PATHS.TEACHER_HOME },
		{ label: i18n.t('nav.teacher.classes'), icon: School },
		{ label: i18n.t('nav.teacher.materials'), icon: BookOpen },
		{
			label: i18n.t('nav.teacher.assignments'),
			icon: ClipboardList,
			badge: data.identity?.navBadges.assignments
		},
		{ label: i18n.t('nav.teacher.assessments'), icon: FileQuestion },
		{ label: i18n.t('nav.teacher.exam_schedule'), icon: CalendarClock },
		{ label: i18n.t('nav.teacher.progress'), icon: ChartLine },
		{ label: i18n.t('nav.teacher.messages'), icon: MessageSquare },
		{ label: i18n.t('nav.teacher.settings'), icon: Settings }
	]);
</script>

<WorkspaceShell
	areaLabel={i18n.t('nav.teacher.area')}
	{navItems}
	tenant={data.identity?.tenant}
	user={data.identity?.user}
	searchPlaceholder={i18n.t('nav.teacher.search')}
>
	{@render children()}
</WorkspaceShell>
