<script lang="ts" module>
	export interface ModuleStat {
		label: string;
		value: string | number;
		sub?: string;
		/** Persentase isi bar 0–100 (tanpa bar bila undefined). */
		bar?: number;
		tone?: 'default' | 'warning' | 'danger' | 'success';
	}
	export interface ModuleGap {
		title: string;
		text: string;
		action: string;
		href: string;
	}
</script>

<script lang="ts">
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import type { Snippet } from 'svelte';

	interface Props {
		eyebrow: string;
		title: string;
		description: string;
		gap?: ModuleGap | null;
		stats?: readonly ModuleStat[];
		actions?: Snippet;
		/** Prefiks kunci i18n panduan halaman, diteruskan ke HeroBanner. */
		help?: string;
		children: Snippet;
	}

	let {
		eyebrow,
		title,
		description,
		gap = null,
		stats = [],
		actions,
		help,
		children
	}: Props = $props();

	const VALUE_TONE = {
		default: 'text-lms-foreground',
		warning: 'text-lms-warning-text',
		danger: 'text-lms-danger-text',
		success: 'text-lms-success-text'
	} as const;
	const BAR_TONE = {
		default: 'bg-lms-interactive',
		warning: 'bg-lms-warning-text',
		danger: 'bg-lms-danger-text',
		success: 'bg-lms-success-text'
	} as const;
</script>

<!-- Kerangka halaman modul sekolah (referensi v4 05a–05h): HeroBanner, celah data, statistik, isi. -->
<div class="text-lms-foreground flex min-w-0 flex-col gap-4 pb-24">
	<HeroBanner {eyebrow} {title} {description} actionsPlacement="end" {actions} {help} />

	{#if gap}
		<div
			role="status"
			class="lms-tone-warning flex flex-wrap items-center gap-3 rounded-xl px-4 py-3"
		>
			<Icon icon={CircleAlert} />
			<span class="flex-[1_1_300px] text-[13px] leading-[19px]"
				><strong>{gap.title}</strong> {gap.text}</span
			>
			<!-- eslint-disable svelte/no-navigation-without-resolve -- gap.href dibentuk dari path yang sudah lewat resolve() -->
			<a
				href={gap.href}
				class="lms-focus-ring bg-lms-warning-text text-lms-surface inline-flex h-[34px] items-center rounded-lg px-3.5 text-[13px] font-bold whitespace-nowrap"
				>{gap.action}</a
			>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</div>
	{/if}

	{#if stats.length}
		<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-3">
			{#each stats as stat (stat.label)}
				<div class="lms-card flex flex-col gap-1.5 rounded-xl px-4 py-3.5">
					<span class="text-lms-muted text-xs">{stat.label}</span>
					<span class="text-2xl font-bold tabular-nums {VALUE_TONE[stat.tone ?? 'default']}"
						>{stat.value}</span
					>
					{#if stat.bar !== undefined}
						<div class="bg-lms-surface-muted h-1.5 overflow-hidden rounded-full">
							<div
								class="h-full rounded-full {BAR_TONE[stat.tone ?? 'default']}"
								style:width="{Math.min(100, Math.max(0, stat.bar))}%"
							></div>
						</div>
					{/if}
					{#if stat.sub}<span class="text-lms-muted text-xs">{stat.sub}</span>{/if}
				</div>
			{/each}
		</div>
	{/if}

	{@render children()}
</div>
