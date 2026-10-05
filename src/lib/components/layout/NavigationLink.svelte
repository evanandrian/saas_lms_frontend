<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Pathname } from '$app/types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { LucideIcon } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	/** `always` = label selalu tampil; `from-lg` = rail di bawah lg; `hidden` = rail (label sr-only). */
	type LabelVisibility = 'always' | 'from-lg' | 'hidden';

	interface Props {
		/** Rute internal aplikasi. Abaikan bila `externalHref` diisi. */
		href?: Pathname;
		/** Tautan luar (https://…) dari konfigurasi Menu & navigasi. */
		externalHref?: string;
		/** Buka di tab baru (Menu & navigasi: "Buka di → Tab baru"). */
		newTab?: boolean;
		children: Snippet;
		/** Opsional (FE-04): ikon navigasi sidebar. Tanpa ikon = perilaku FE-01. */
		icon?: LucideIcon;
		/** Opsional (FE-04): jumlah item yang menunggu. */
		badge?: number;
		/** Teks badge untuk pembaca layar, mis. "9 menunggu". */
		badgeLabel?: string;
		labelVisibility?: LabelVisibility;
		/** Tooltip native saat label tersembunyi (rail). Nama aksesibel tetap dari label sr-only. */
		tooltip?: string;
	}

	let {
		href,
		externalHref,
		newTab = false,
		children,
		icon,
		badge,
		badgeLabel,
		labelVisibility = 'always',
		tooltip
	}: Props = $props();

	const LABEL_CLASSES: Record<LabelVisibility, string> = {
		always: '',
		'from-lg': 'sr-only lg:not-sr-only',
		hidden: 'sr-only'
	};

	const resolvedHref = $derived(externalHref ?? (href ? resolve(href) : '#'));
	// Saat SSR `resolve()` dapat menghasilkan path relatif (mis. `./app`), jadi bandingkan URL absolutnya.
	const isCurrent = $derived(
		!externalHref && page.url.pathname === new URL(resolvedHref, page.url).pathname
	);
	const isRail = $derived(labelVisibility !== 'always');
</script>

<!-- Rute internal sudah lewat resolve(); tautan luar dari Menu & navigasi memang tidak di-resolve. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	href={resolvedHref}
	class={[
		'btn lms-focus-ring relative',
		icon ? 'w-full justify-start' : 'justify-start md:justify-center',
		isRail && 'max-lg:justify-center',
		labelVisibility === 'hidden' && 'justify-center',
		isCurrent ? 'lms-nav-active font-semibold' : 'lms-action-ghost'
	]}
	aria-current={isCurrent ? 'page' : undefined}
	target={newTab ? '_blank' : undefined}
	rel={newTab || externalHref ? 'noopener noreferrer' : undefined}
	title={isRail ? tooltip : undefined}
>
	{#if icon}<Icon {icon} />{/if}
	<span class={['min-w-0 flex-1 truncate text-start', LABEL_CLASSES[labelVisibility]]}>
		{@render children()}
	</span>
	{#if badge}
		<span
			class={[
				'lms-action-primary text-lms-caption rounded-full px-2 font-semibold',
				labelVisibility === 'from-lg' && 'max-lg:absolute max-lg:top-0 max-lg:right-0',
				labelVisibility === 'hidden' && 'absolute top-0 right-0'
			]}
		>
			<span aria-hidden="true">{badge}</span>
			{#if badgeLabel}<span class="sr-only">{badgeLabel}</span>{/if}
		</span>
	{/if}
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
