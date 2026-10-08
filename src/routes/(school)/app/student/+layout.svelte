<script lang="ts">
	import WorkspaceShell, {
		type WorkspaceNavItem
	} from '$lib/components/layout/WorkspaceShell.svelte';
	import { workspaceBadge, workspaceIdentity } from '$lib/features/workspace/workspace.model';
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
	const identity = $derived(workspaceIdentity(data.workspace, i18n.t));

	const section = (hash: string) => ({ href: APP_PATHS.STUDENT_HOME, hash });

	// Arsitektur informasi area murid (beranda, materi mandiri, dan seksi fitur).
	const navItems: WorkspaceNavItem[] = $derived([
		{ label: i18n.t('nav.student.home'), icon: House, href: APP_PATHS.STUDENT_HOME },
		{ label: i18n.t('nav.student.materials'), icon: BookOpen, href: APP_PATHS.STUDENT_MATERIALS },
		{
			label: i18n.t('nav.student.assignments'),
			icon: ClipboardList,
			href: APP_PATHS.STUDENT_TASKS,
			badge: workspaceBadge(data.workspace, 'tasks')
		},
		{ label: i18n.t('nav.student.assessments'), icon: ClipboardCheck, href: APP_PATHS.STUDENT_ASSESSMENTS },
		{ label: i18n.t('nav.student.grades'), icon: Award, href: APP_PATHS.STUDENT_GRADES },
		{ label: i18n.t('nav.student.attendance'), icon: CalendarCheck, href: APP_PATHS.STUDENT_ATTENDANCE },
		{ label: i18n.t('nav.student.messages'), icon: MessageSquare, href: APP_PATHS.STUDENT_MESSAGES }
	]);
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
