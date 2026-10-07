<script lang="ts">
	import WorkspaceShell, {
		type WorkspaceNavItem
	} from '$lib/components/layout/WorkspaceShell.svelte';
	import RoleSwitch, {
		type RoleSwitchItem
	} from '$lib/features/dashboards/components/RoleSwitch.svelte';
	import { workspaceBadge, workspaceIdentity } from '$lib/features/workspace/workspace.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import ChartLine from '@lucide/svelte/icons/chart-line';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import FileQuestion from '@lucide/svelte/icons/file-question';
	import FileText from '@lucide/svelte/icons/file-text';
	import House from '@lucide/svelte/icons/house';
	import Inbox from '@lucide/svelte/icons/inbox';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import School from '@lucide/svelte/icons/school';
	import Settings from '@lucide/svelte/icons/settings';
	import Table from '@lucide/svelte/icons/table';
	import Users from '@lucide/svelte/icons/users';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const i18n = useI18n();

	const isHomeroomView = $derived(data.activeView === 'homeroom');

	// Arsitektur informasi area (referensi FE-04). Item tanpa href = halaman belum dibangun.
	const teacherNav: WorkspaceNavItem[] = $derived([
		{ label: i18n.t('nav.teacher.home'), icon: House, href: APP_PATHS.TEACHER_HOME },
		{ label: i18n.t('nav.teacher.classes'), icon: School },
		{ label: i18n.t('nav.teacher.materials'), icon: BookOpen },
		{
			label: i18n.t('nav.teacher.assignments'),
			icon: ClipboardList,
			badge: workspaceBadge(data.workspace, 'tasks')
		},
		{ label: i18n.t('nav.teacher.assessments'), icon: FileQuestion },
		{ label: i18n.t('nav.teacher.exam_schedule'), icon: CalendarClock },
		{ label: i18n.t('nav.teacher.progress'), icon: ChartLine },
		{ label: i18n.t('nav.teacher.messages'), icon: MessageSquare },
		{ label: i18n.t('nav.teacher.settings'), icon: Settings, href: APP_PATHS.TEACHER_ACCOUNT }
	]);

	// Sidebar wali kelas (referensi shell NAV.homeroom): menu bagian menggulir ke seksi dashboard.
	const section = (hash: string) => ({ href: APP_PATHS.HOMEROOM_HOME, hash });
	const homeroomNav: WorkspaceNavItem[] = $derived([
		{ label: i18n.t('nav.homeroom.home'), icon: House, href: APP_PATHS.HOMEROOM_HOME },
		{ label: i18n.t('nav.homeroom.attendance'), icon: CalendarCheck, ...section('presensi') },
		{ label: i18n.t('nav.homeroom.approvals'), icon: Inbox, ...section('persetujuan') },
		{ label: i18n.t('nav.homeroom.liaison'), icon: MessageCircle, ...section('buku-penghubung') },
		{ label: i18n.t('nav.homeroom.grades'), icon: Table, ...section('rekap-nilai') },
		{ label: i18n.t('nav.homeroom.students'), icon: Users, ...section('murid') },
		{ label: i18n.t('nav.homeroom.report_cards'), icon: FileText, ...section('rapor') },
		{ label: i18n.t('nav.homeroom.schedule'), icon: CalendarDays, ...section('jadwal') },
		{ label: i18n.t('nav.homeroom.behavior'), icon: NotebookPen, ...section('catatan') },
		{ label: i18n.t('nav.homeroom.settings'), icon: Settings, href: APP_PATHS.TEACHER_ACCOUNT }
	]);

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
	navItems={isHomeroomView ? homeroomNav : teacherNav}
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
