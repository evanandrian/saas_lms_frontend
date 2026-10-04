<script lang="ts">
	/** `progress` hanya untuk makna progres/penyelesaian; kategori memakai interactive/neutral/subtle. */
	export type SegmentTone = 'interactive' | 'neutral' | 'progress' | 'subtle' | 'muted' | 'warning';

	export interface Segment {
		label: string;
		value: number;
		/** Teks nilai (sudah diformat pemakai), mis. "74" atau "Rp318,2 jt". */
		display: string;
		/** Teks tambahan, mis. "58%" atau "96 invoice". */
		detail?: string;
		tone: SegmentTone;
	}

	interface Props {
		/** Nama aksesibel komposisi. */
		label: string;
		segments: readonly Segment[];
	}

	let { label, segments }: Props = $props();

	const TONE_CLASSES: Record<SegmentTone, string> = {
		interactive: 'bg-lms-interactive',
		neutral: 'bg-lms-foreground',
		progress: 'bg-lms-brand-growth-green',
		subtle: 'bg-lms-interactive-subtle ring-1 ring-inset ring-(--color-lms-border)',
		muted: 'bg-lms-interactive-muted',
		warning: 'bg-warning-500'
	};
	const total = $derived(segments.reduce((sum, s) => sum + s.value, 0));
</script>

<div class="space-y-4">
	<!-- Bar komposisi dekoratif; nilai lengkap tersedia dalam daftar di bawahnya. -->
	<div class="flex h-3 w-full gap-0.75 overflow-hidden rounded-full" aria-hidden="true">
		{#each segments as segment (segment.label)}
			<span
				class={['h-full', TONE_CLASSES[segment.tone]]}
				style:width="{total > 0 ? (segment.value / total) * 100 : 0}%"
			></span>
		{/each}
	</div>
	<ul class="space-y-3" aria-label={label}>
		{#each segments as segment (segment.label)}
			<li class="flex items-center justify-between gap-3">
				<span class="flex items-center gap-2">
					<span
						class={['size-2.5 shrink-0 rounded-[3px]', TONE_CLASSES[segment.tone]]}
						aria-hidden="true"
					></span>
					{segment.label}
				</span>
				<span class="text-end">
					<span class="block font-semibold tabular-nums">{segment.display}</span>
					{#if segment.detail}
						<span class="lms-text-caption block">{segment.detail}</span>
					{/if}
				</span>
			</li>
		{/each}
	</ul>
</div>
