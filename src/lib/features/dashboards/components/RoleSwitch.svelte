<script lang="ts" module>
	import type { Pathname } from '$app/types';
	import type { LucideIcon } from '@lucide/svelte';

	export interface RoleSwitchItem {
		readonly key: string;
		readonly label: string;
		readonly icon: LucideIcon;
		readonly href: Pathname;
		/** Nilai `?view=` saat beranda tampilan ini juga menjadi tujuan pengalihan otomatis. */
		readonly search?: string;
		readonly current: boolean;
	}
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { useI18n } from '$lib/i18n';
	import { DASHBOARD_VIEW_PARAM } from '$lib/utils/app-paths';

	interface Props {
		items: readonly RoleSwitchItem[];
	}

	let { items }: Props = $props();

	const i18n = useI18n();
	const TOAST_MS = 5000;

	let toast = $state<{ message: string; icon: LucideIcon } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	// Semua tujuan adalah rute statis area (beranda tampilan), aman dipersempit untuk `resolve()`.
	const resolveStatic = (path: Pathname) => resolve(path as '/');
	const target = (item: RoleSwitchItem) =>
		`${resolveStatic(item.href)}${item.search ? `?${DASHBOARD_VIEW_PARAM}=${item.search}` : ''}`;

	async function pick(item: RoleSwitchItem, event: MouseEvent) {
		event.preventDefault();
		if (item.current) return;
		// Tujuan sudah lewat resolve() (lihat `target`); hanya ditambah `?view=`.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		await goto(target(item));
		clearTimeout(toastTimer);
		toast = {
			message: i18n.t('dashboard.role_switch.switched', { role: item.label }),
			icon: item.icon
		};
		toastTimer = setTimeout(() => (toast = null), TOAST_MS);
	}
</script>

<!-- Toggle peran topbar (referensi shell `roleSw`): label tampil mulai 1180px, ikon saja di bawahnya. -->
<!-- Tujuan tautan sudah lewat resolve() di `target()`; hanya ditambah query `?view=`. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<nav
	class="bg-lms-background border-lms-border flex flex-none gap-0.5 rounded-[10px] border p-0.75"
	aria-label={i18n.t('dashboard.role_switch.label')}
	title={i18n.t('dashboard.role_switch.label')}
>
	{#each items as item (item.key)}
		<a
			href={target(item)}
			aria-current={item.current ? 'page' : undefined}
			title={item.label}
			class={[
				'lms-focus-ring flex h-7.5 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap',
				item.current
					? 'bg-lms-surface text-lms-foreground shadow-[0_1px_3px_rgba(15,24,56,.16)]'
					: 'text-lms-muted hover:text-lms-foreground'
			]}
			onclick={(event) => pick(item, event)}
		>
			<Icon icon={item.icon} size="sm" />
			<span class="sr-only min-[1180px]:not-sr-only">{item.label}</span>
		</a>
	{/each}
</nav>

<Toast message={toast?.message ?? null} icon={toast?.icon} />
