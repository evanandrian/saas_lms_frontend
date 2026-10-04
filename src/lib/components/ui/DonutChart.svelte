<script lang="ts">
	import type { SegmentTone } from './SegmentedBar.svelte';

	export interface DonutSegment {
		label: string;
		value: number;
		/** Teks nilai (sudah diformat pemakai), mis. "74". */
		display: string;
		/** Teks tambahan, mis. "58%". */
		detail?: string;
		tone: Exclude<SegmentTone, 'neutral' | 'subtle'>;
	}

	interface Props {
		/** Nama aksesibel komposisi. */
		label: string;
		segments: readonly DonutSegment[];
		/** Teks besar di tengah (mis. total). */
		center: string;
		/** Teks kecil di bawah teks tengah. */
		centerCaption?: string;
	}

	let { label, segments, center, centerCaption }: Props = $props();

	/** Warna conic memakai token yang sama dengan `SegmentedBar` (non-teks; nilai selalu di legenda). */
	const TONE_COLORS: Record<DonutSegment['tone'], string> = {
		interactive: 'var(--color-lms-interactive)',
		progress: 'var(--color-lms-brand-growth-green)',
		muted: 'var(--color-lms-interactive-muted)',
		warning: 'var(--color-warning-500)'
	};
	const SWATCH_CLASSES: Record<DonutSegment['tone'], string> = {
		interactive: 'bg-lms-interactive',
		progress: 'bg-lms-brand-growth-green',
		muted: 'bg-lms-interactive-muted',
		warning: 'bg-warning-500'
	};

	const total = $derived(segments.reduce((sum, s) => sum + s.value, 0));
	const gradient = $derived.by(() => {
		let start = 0;
		const stops = segments.map((segment) => {
			const end = total > 0 ? start + (segment.value / total) * 100 : start;
			const stop = `${TONE_COLORS[segment.tone]} ${start}% ${end}%`;
			start = end;
			return stop;
		});
		return `conic-gradient(${stops.join(', ')})`;
	});
</script>

<div class="space-y-4.5">
	<div class="flex justify-center">
		<div
			class="flex size-37.5 items-center justify-center rounded-full"
			style:background-image={gradient}
			role="img"
			aria-label={label}
		>
			<div
				class="bg-lms-surface flex size-27.5 flex-col items-center justify-center rounded-full"
				aria-hidden="true"
			>
				<span class="text-lms-h3 font-bold tabular-nums">{center}</span>
				{#if centerCaption}
					<span class="lms-text-caption">{centerCaption}</span>
				{/if}
			</div>
		</div>
	</div>
	<ul class="space-y-3">
		{#each segments as segment (segment.label)}
			<li class="flex items-center gap-2.5">
				<span
					class={['size-2.5 shrink-0 rounded-[3px]', SWATCH_CLASSES[segment.tone]]}
					aria-hidden="true"
				></span>
				<span class="flex-1">{segment.label}</span>
				<span class="font-semibold tabular-nums">{segment.display}</span>
				{#if segment.detail}
					<span class="lms-text-caption w-11 text-end">{segment.detail}</span>
				{/if}
			</li>
		{/each}
	</ul>
</div>
