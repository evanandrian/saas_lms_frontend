<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import Icon from './Icon.svelte';

	type NoteTone = 'muted' | 'progress' | 'warning';
	type TrendTone = 'interactive' | 'progress';

	interface Props {
		label: string;
		/** Nilai sudah diformat oleh pemakai (komponen tidak menghitung). */
		value: string;
		note?: string;
		noteTone?: NoteTone;
		icon?: LucideIcon;
		/** Deret nilai untuk sparkline dekoratif; informasi utama tetap pada `value` dan `note`. */
		trend?: readonly number[];
		trendTone?: TrendTone;
	}

	let {
		label,
		value,
		note,
		noteTone = 'muted',
		icon,
		trend,
		trendTone = 'interactive'
	}: Props = $props();

	const NOTE_CLASSES: Record<NoteTone, string> = {
		muted: 'text-lms-muted',
		progress: 'text-lms-progress-text',
		warning: 'text-lms-warning-text'
	};
	const TREND_CLASSES: Record<TrendTone, string> = {
		interactive: 'bg-lms-interactive',
		progress: 'bg-lms-brand-growth-green'
	};
	const SPARK_MIN_PERCENT = 12;

	const sparkHeights = $derived.by(() => {
		if (!trend?.length) return [];
		const max = Math.max(...trend);
		return trend.map((n) => (max > 0 ? Math.max(SPARK_MIN_PERCENT, (n / max) * 100) : 0));
	});
</script>

<article class="lms-card flex min-w-0 flex-col gap-3 p-4.5">
	<p class="text-lms-body-sm text-lms-muted flex items-center gap-2">
		{#if icon}
			<span class="lms-tone-info inline-flex size-7.5 items-center justify-center rounded-[9px]">
				<Icon {icon} size="sm" />
			</span>
		{/if}
		{label}
	</p>
	<div class="flex items-end justify-between gap-3">
		<div class="min-w-0">
			<p class="text-lms-h2 tracking-tight tabular-nums">{value}</p>
			{#if note}
				<p class={['text-lms-caption', NOTE_CLASSES[noteTone]]}>{note}</p>
			{/if}
		</div>
		{#if sparkHeights.length}
			<div class="flex h-9 shrink-0 items-end gap-1" aria-hidden="true">
				{#each sparkHeights as height, index (index)}
					<span
						class={[
							'w-1.5 rounded-[3px]',
							index === sparkHeights.length - 1
								? TREND_CLASSES[trendTone]
								: 'bg-lms-interactive-muted'
						]}
						style:height="{height}%"
					></span>
				{/each}
			</div>
		{/if}
	</div>
</article>
