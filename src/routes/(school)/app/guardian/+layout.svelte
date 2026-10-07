<script lang="ts">
	import WorkspaceShell, {
		type WorkspaceNavItem
	} from '$lib/components/layout/WorkspaceShell.svelte';
	import { workspaceBadge, workspaceIdentity } from '$lib/features/workspace/workspace.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import Award from '@lucide/svelte/icons/award';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import FileText from '@lucide/svelte/icons/file-text';
	import House from '@lucide/svelte/icons/house';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Settings from '@lucide/svelte/icons/settings';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const i18n = useI18n();
	const identity = $derived(workspaceIdentity(data.workspace, i18n.t));

	// Arsitektur informasi area (referensi FE-04). Item tanpa href = halaman belum dibangun.
	const navItems: WorkspaceNavItem[] = $derived([
		{ label: i18n.t('nav.guardian.home'), icon: House, href: APP_PATHS.GUARDIAN_HOME },
		{ label: i18n.t('nav.guardian.grades'), icon: Award },
		{ label: i18n.t('nav.guardian.attendance'), icon: CalendarCheck },
		{ label: i18n.t('nav.guardian.assignments'), icon: ClipboardList },
		{ label: i18n.t('nav.guardian.report_cards'), icon: FileText },
		{ label: i18n.t('nav.guardian.announcements'), icon: Megaphone },
		{
			label: i18n.t('nav.guardian.messages'),
			icon: MessageSquare,
			badge: workspaceBadge(data.workspace, 'msgs')
		},
		{ label: i18n.t('nav.guardian.settings'), icon: Settings, href: APP_PATHS.GUARDIAN_ACCOUNT }
	]);
</script>

<WorkspaceShell
	areaLabel={i18n.t('nav.guardian.area')}
	{navItems}
	tenant={identity?.tenant}
	user={identity?.user}
	searchPlaceholder={i18n.t('nav.guardian.search')}
>
	{@render children()}
</WorkspaceShell>
