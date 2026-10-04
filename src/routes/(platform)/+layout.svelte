<script lang="ts">
	import WorkspaceShell, {
		type WorkspaceNavItem
	} from '$lib/components/layout/WorkspaceShell.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Inbox from '@lucide/svelte/icons/inbox';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Package from '@lucide/svelte/icons/package';
	import Receipt from '@lucide/svelte/icons/receipt';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import Server from '@lucide/svelte/icons/server';
	import Settings from '@lucide/svelte/icons/settings';
	import Wallet from '@lucide/svelte/icons/wallet';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const i18n = useI18n();

	// Arsitektur informasi platform (referensi FE-04). Item tanpa href = halaman belum dibangun.
	const navItems: WorkspaceNavItem[] = $derived([
		{
			label: 'Beranda',
			icon: LayoutDashboard,
			children: [
				{ label: 'Dashboard', icon: LayoutDashboard, href: APP_PATHS.PLATFORM_HOME },
				{ label: i18n.t('nav.platform.applications'), icon: Inbox, badge: data.identity?.navBadges.applications },
				{ label: i18n.t('nav.platform.tenants'), icon: Building2 },
				{ label: i18n.t('nav.platform.plans'), icon: Package },
				{ label: i18n.t('nav.platform.invoices'), icon: Receipt },
				{ label: i18n.t('nav.platform.payments'), icon: Wallet },
				{ label: i18n.t('nav.platform.clusters'), icon: Server },
				{ label: i18n.t('nav.platform.audit'), icon: ScrollText }
			]
		},
		{
			label: 'Pengaturan',
			icon: Settings,
			children: [
				{ label: 'Menu & Navigasi', icon: LayoutDashboard, href: '/settings/navigation' as any },
				{ label: 'Peran & Akses', icon: Settings, href: '/settings/roles' as any },
				{ label: 'Konfigurasi', icon: Settings, href: '/settings/configuration' as any }
			]
		}
	]);
</script>

<WorkspaceShell
	areaLabel={i18n.t('nav.platform.area')}
	{navItems}
	tenant={data.identity?.tenant}
	user={data.identity?.user}
	searchPlaceholder={i18n.t('nav.platform.search')}
>
	{@render children()}
</WorkspaceShell>
