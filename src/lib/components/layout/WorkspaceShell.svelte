<script lang="ts" module>
	import type { Pathname } from '$app/types';
	import type { LucideIcon } from '@lucide/svelte';

	export interface WorkspaceNavItem {
		label: string;
		icon: LucideIcon;
		/** Tanpa `href`/`externalHref`: halaman belum tersedia → item dirender nonaktif (FE-04 D6). */
		href?: Pathname;
		/** Tautan luar (https://…) dari Menu & navigasi. */
		externalHref?: string;
		newTab?: boolean;
		badge?: number;
	}

	/** Grup sidebar dari Menu & navigasi (referensi MenuMaster): judul kecil opsional, bisa tertutup. */
	export interface WorkspaceNavGroup {
		label: string;
		showLabel: boolean;
		defaultOpen: boolean;
		items: WorkspaceNavItem[];
	}

	export type WorkspaceNavEntry = WorkspaceNavItem | WorkspaceNavGroup;

	function isNavGroup(entry: WorkspaceNavEntry): entry is WorkspaceNavGroup {
		return 'items' in entry;
	}

	export interface WorkspaceIdentity {
		name: string;
		detail: string;
		initials: string;
	}
</script>

<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import ConfirmDialog, { type ConfirmDialogDetail } from '$lib/components/ui/ConfirmDialog.svelte';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { describeDevice } from '$lib/utils/user-agent';
	import Bell from '@lucide/svelte/icons/bell';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Clock from '@lucide/svelte/icons/clock';
	import Monitor from '@lucide/svelte/icons/monitor';
	import LogOut from '@lucide/svelte/icons/log-out';
	import ColorModeToggle from './ColorModeToggle.svelte';
	import Menu from '@lucide/svelte/icons/menu';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import Search from '@lucide/svelte/icons/search';
	import type { Snippet } from 'svelte';
	import NavigationLink from './NavigationLink.svelte';

	interface Props {
		/** Nama area (mis. "Konsol Platform") — label navigasi dan fallback identitas. */
		areaLabel: string;
		navItems: readonly WorkspaceNavEntry[];
		/** Identitas tenant/lembaga; dari sesi kelak (BLOCKED-02). Kosong = tidak ditampilkan. */
		tenant?: WorkspaceIdentity;
		/** Identitas pengguna; dari sesi kelak (BLOCKED-02). Kosong = tidak ditampilkan. */
		user?: WorkspaceIdentity;
		searchPlaceholder: string;
		children: Snippet;
	}

	let { areaLabel, navItems, tenant, user, searchPlaceholder, children }: Props = $props();

	const i18n = useI18n();
	const MAIN_CONTENT_ID = 'main-content';
	const SEARCH_ID = 'lms-workspace-search';

	// State UI lokal (tanpa storage, ADR-019): rail manual di ≥ lg, drawer di < md.
	let isSidebarCollapsed = $state(false);
	let isDrawerOpen = $state(false);
	let isLogoutOpen = $state(false);
	/** Buka/tutup grup oleh pengguna (per indeks); default dari konfigurasi `defaultOpen`. */
	let groupOpenOverrides = $state<Record<number, boolean>>({});
	let logoutDetails = $state<ConfirmDialogDetail[]>([]);

	// Rincian dialog keluar (referensi v3): perangkat dari User-Agent, waktu masuk dari metadata sesi.
	function handleOpenLogout() {
		isDrawerOpen = false;
		const device = describeDevice(navigator.userAgent);
		const startedAt = page.data.sessionStartedAt;
		logoutDetails = [
			...(device ? [{ icon: Monitor, label: i18n.t('common.logout.device'), value: device }] : []),
			...(typeof startedAt === 'number'
				? [
						{
							icon: Clock,
							label: i18n.t('common.logout.since'),
							value: new Date(startedAt).toLocaleTimeString('id-ID', {
								hour: '2-digit',
								minute: '2-digit',
								timeZoneName: 'short'
							})
						}
					]
				: [])
		];
		isLogoutOpen = true;
	}

	function handleToggleSidebar() {
		isSidebarCollapsed = !isSidebarCollapsed;
	}

	function handleOpenDrawer() {
		isDrawerOpen = true;
	}

	afterNavigate(() => {
		isDrawerOpen = false;
	});
</script>

{#snippet identityCard(
	identity: WorkspaceIdentity,
	labelVisibility: 'always' | 'from-lg' | 'hidden'
)}
	<div
		class={[
			'lms-card flex items-center gap-3 p-2.5',
			labelVisibility === 'hidden' && 'justify-center',
			labelVisibility === 'from-lg' && 'max-lg:justify-center'
		]}
	>
		<Avatar initials={identity.initials} tone="subtle" size="sm" />
		<div
			class={[
				'min-w-0',
				labelVisibility === 'hidden' && 'sr-only',
				labelVisibility === 'from-lg' && 'sr-only lg:not-sr-only'
			]}
		>
			<p class="text-lms-body-sm truncate font-semibold">{identity.name}</p>
			<p class="lms-text-caption truncate">{identity.detail}</p>
		</div>
	</div>
{/snippet}

{#snippet navItem(item: WorkspaceNavItem, labelVisibility: 'always' | 'from-lg' | 'hidden')}
	{#if item.href || item.externalHref}
		<NavigationLink
			href={item.href}
			externalHref={item.externalHref}
			newTab={item.newTab}
			icon={item.icon}
			badge={item.badge}
			badgeLabel={item.badge
				? i18n.t('common.workspace.badge_pending', { count: item.badge })
				: undefined}
			{labelVisibility}
			tooltip={item.label}
		>
			{item.label}
		</NavigationLink>
	{:else}
		<!-- Halaman belum dibangun: bukan tautan (tidak menuju 404), tetap terlihat sebagai struktur IA. -->
		<span
			class={[
				'btn text-lms-muted relative w-full cursor-not-allowed justify-start',
				labelVisibility === 'hidden' && 'justify-center',
				labelVisibility === 'from-lg' && 'max-lg:justify-center'
			]}
			aria-disabled="true"
			title={i18n.t('common.workspace.unavailable', { item: item.label })}
		>
			<Icon icon={item.icon} />
			<span
				class={[
					'min-w-0 flex-1 truncate text-start',
					labelVisibility === 'hidden' && 'sr-only',
					labelVisibility === 'from-lg' && 'sr-only lg:not-sr-only'
				]}
			>
				{item.label}
				<span class="sr-only">({i18n.t('common.workspace.not_available_yet')})</span>
			</span>
			{#if item.badge}
				<span
					class={[
						'lms-action-primary text-lms-caption rounded-full px-2 font-semibold',
						labelVisibility === 'from-lg' && 'max-lg:absolute max-lg:top-0 max-lg:right-0',
						labelVisibility === 'hidden' && 'absolute top-0 right-0'
					]}
				>
					<span aria-hidden="true">{item.badge}</span>
					<span class="sr-only">
						{i18n.t('common.workspace.badge_pending', { count: item.badge })}
					</span>
				</span>
			{/if}
		</span>
	{/if}
{/snippet}

{#snippet navList(labelVisibility: 'always' | 'from-lg' | 'hidden')}
	<ul class="space-y-1">
		{#each navItems as entry, index (index)}
			{#if isNavGroup(entry)}
				{@const isOpen =
					groupOpenOverrides[index] ??
					(entry.defaultOpen || entry.items.some((item) => item.href === page.url.pathname))}
				<!-- Judul tampil bila diaktifkan atau grup tertutup; grup tanpa judul selalu terbuka (referensi). -->
				{@const hasLabel = entry.showLabel || !entry.defaultOpen}
				{@const itemsVisible = isOpen || !hasLabel}
				<li
					class={[
						'pt-1.5',
						index > 0 && labelVisibility !== 'always' && 'max-lg:border-lms-border max-lg:border-t'
					]}
				>
					{#if hasLabel && labelVisibility !== 'hidden'}
						<button
							type="button"
							class={[
								'text-lms-muted lms-focus-ring hover:text-lms-foreground flex w-full items-center justify-between rounded-md px-3 py-1 text-start text-[10px] font-bold tracking-[0.1em] uppercase',
								labelVisibility === 'from-lg' && 'max-lg:hidden'
							]}
							aria-expanded={isOpen}
							onclick={() => (groupOpenOverrides[index] = !isOpen)}
						>
							{entry.label}
							{#if !isOpen}<Icon icon={ChevronRight} size="sm" />{/if}
						</button>
					{/if}
					<ul
						class={[
							'space-y-1',
							!itemsVisible && labelVisibility === 'from-lg' && 'lg:hidden',
							!itemsVisible && labelVisibility === 'always' && 'hidden'
						]}
					>
						{#each entry.items as item, itemIndex (itemIndex)}
							<li>{@render navItem(item, labelVisibility)}</li>
						{/each}
					</ul>
				</li>
			{:else}
				<li>{@render navItem(entry, labelVisibility)}</li>
			{/if}
		{/each}
	</ul>
{/snippet}

{#snippet logoutButton(labelVisibility: 'always' | 'from-lg' | 'hidden')}
	<button
		type="button"
		class={[
			'btn text-lms-muted w-full justify-start hover:text-lms-foreground',
			labelVisibility === 'hidden' && 'justify-center',
			labelVisibility === 'from-lg' && 'max-lg:justify-center'
		]}
		title={i18n.t('common.workspace.logout')}
		aria-haspopup="dialog"
		onclick={handleOpenLogout}
	>
		<Icon icon={LogOut} />
		<span
			class={[
				labelVisibility === 'hidden' && 'sr-only',
				labelVisibility === 'from-lg' && 'sr-only lg:not-sr-only'
			]}>{i18n.t('common.workspace.logout')}</span
		>
	</button>
{/snippet}

<a
	href={`#${MAIN_CONTENT_ID}`}
	class="btn lms-action-primary lms-focus-ring sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2"
>
	{i18n.t('common.shell.skip_to_content')}
</a>

{#if navigating.to}
	<div
		class="bg-lms-interactive fixed inset-x-0 top-0 z-50 h-1 motion-safe:animate-pulse"
		role="progressbar"
		aria-label={i18n.t('common.shell.loading')}
	></div>
{/if}

<div class="bg-lms-background text-lms-foreground flex min-h-dvh">
	<!-- Sidebar: rail (ikon) di md–lg, penuh di ≥ lg kecuali diciutkan; tersembunyi < md (drawer). -->
	<aside
		class={[
			'border-lms-border bg-lms-surface sticky top-0 hidden h-dvh shrink-0 flex-col border-e md:flex',
			isSidebarCollapsed ? 'w-20' : 'w-20 lg:w-64'
		]}
	>
		<!-- Area logo 68px sejajar header (referensi): rata kiri saat expanded, tengah saat rail. -->
		<div
			class={[
				'border-lms-border flex h-17 shrink-0 items-center border-b px-5',
				isSidebarCollapsed ? 'justify-center' : 'max-lg:justify-center'
			]}
		>
			<BrandLogo expression={isSidebarCollapsed ? 'compact' : 'responsive'} wideFrom="lg" />
		</div>
		{#if tenant}
			<div class="px-3 pt-4 pb-1 lg:px-4">
				{@render identityCard(tenant, isSidebarCollapsed ? 'hidden' : 'from-lg')}
			</div>
		{/if}
		<nav aria-label={areaLabel} class="min-h-0 flex-1 overflow-y-auto p-3">
			{@render navList(isSidebarCollapsed ? 'hidden' : 'from-lg')}
		</nav>
		<div class="border-lms-border border-t p-3">
			{@render logoutButton(isSidebarCollapsed ? 'hidden' : 'from-lg')}
		</div>
	</aside>

	<div class="flex min-w-0 flex-1 flex-col">
		<header
			class="border-lms-border bg-lms-surface sticky top-0 z-40 flex h-17 items-center gap-3.5 border-b px-4 md:px-6"
		>
			<div class="md:hidden">
				<button
					type="button"
					class="btn-icon lms-action-ghost lms-focus-ring"
					aria-label={i18n.t('common.workspace.open_navigation')}
					aria-expanded={isDrawerOpen}
					onclick={handleOpenDrawer}
				>
					<Icon icon={Menu} />
				</button>
			</div>
			<div class="md:hidden">
				<BrandLogo expression="compact" />
			</div>
			<div class="hidden lg:block">
				<button
					type="button"
					class="lms-focus-ring border-lms-border bg-lms-surface text-lms-muted hover:text-lms-foreground rounded-base inline-flex size-9 items-center justify-center border"
					aria-label={isSidebarCollapsed
						? i18n.t('common.workspace.expand_sidebar')
						: i18n.t('common.workspace.collapse_sidebar')}
					aria-pressed={isSidebarCollapsed}
					onclick={handleToggleSidebar}
				>
					<Icon icon={PanelLeft} />
				</button>
			</div>
			<div class="relative hidden max-w-110 min-w-0 flex-1 sm:block">
				<label for={SEARCH_ID} class="sr-only">{i18n.t('common.workspace.search_label')}</label>
				<span
					class="text-lms-muted pointer-events-none absolute inset-y-0 left-3 flex items-center"
				>
					<Icon icon={Search} size="sm" />
				</span>
				<input
					id={SEARCH_ID}
					type="search"
					class="input lms-input lms-focus-ring bg-lms-background h-10 ps-9"
					placeholder={searchPlaceholder}
					disabled
					title={i18n.t('common.workspace.search_unavailable')}
				/>
			</div>
			<div class="ms-auto flex shrink-0 items-center gap-3.5">
				<ColorModeToggle />
				<button
					type="button"
					class="btn-icon lms-action-ghost"
					disabled
					aria-label={i18n.t('common.workspace.notifications_unavailable')}
				>
					<Icon icon={Bell} />
				</button>
				{#if user}
					<div class="flex items-center gap-2">
						<Avatar initials={user.initials} tone="deep" shape="circle" />
						<div class="hidden min-w-0 xl:block">
							<p class="text-lms-body-sm truncate font-semibold">{user.name}</p>
							<p class="lms-text-caption truncate">{user.detail}</p>
						</div>
					</div>
				{/if}
			</div>
		</header>

		<!--
			Target skip link (tabindex -1, bukan elemen interaktif); outline landmark tidak ditampilkan.
			Konten memenuhi sisa viewport setelah sidebar (FE-04R): tanpa max-width global; gutter sama dengan header.
		-->
		<main
			id={MAIN_CONTENT_ID}
			tabindex="-1"
			class="w-full min-w-0 flex-1 px-4 py-6 focus:outline-none md:px-6"
		>
			{@render children()}
		</main>
	</div>
</div>

<Drawer
	bind:open={isDrawerOpen}
	label={areaLabel}
	closeLabel={i18n.t('common.workspace.close_navigation')}
>
	<div class="space-y-4">
		<div class="px-2"><BrandLogo expression="core" /></div>
		{#if tenant}
			{@render identityCard(tenant, 'always')}
		{/if}
		<nav aria-label={areaLabel}>
			{@render navList('always')}
		</nav>
		<div class="border-lms-border border-t pt-3">
			{@render logoutButton('always')}
		</div>
	</div>
</Drawer>

<!-- Konfirmasi keluar (referensi v3): POST /logout mengakhiri sesi di semua perangkat, lalu halaman "Anda telah keluar". -->
<ConfirmDialog
	bind:open={isLogoutOpen}
	icon={LogOut}
	title={i18n.t('common.logout.title')}
	message={i18n.t('common.logout.message', { tenant: tenant?.name ?? 'FLIXARE' })}
	person={user ? { initials: user.initials, name: user.name, detail: user.detail } : undefined}
	details={logoutDetails}
	confirmLabel={i18n.t('common.logout.confirm')}
	confirmIcon={LogOut}
	busyLabel={i18n.t('common.logout.busy')}
	cancelLabel={i18n.t('common.logout.cancel')}
	keyHint={i18n.t('common.logout.key_hint')}
	action={APP_PATHS.LOGOUT}
/>
