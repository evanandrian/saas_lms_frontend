<script lang="ts">
	type RingSize = 'sm' | 'lg';
	type RingTone = 'progress' | 'interactive';

	interface Props {
		/** 0–100. */
		value: number;
		/** Nama aksesibel, mis. "Matematika XI-A, 82%". */
		label: string;
		/** Teks di tengah (default: persentase). */
		center?: string;
		/** Teks kecil di bawah teks tengah (hanya ukuran `lg`). */
		caption?: string;
		size?: RingSize;
		tone?: RingTone;
	}

	let { value, label, center, caption, size = 'sm', tone = 'progress' }: Props = $props();

	const VIEWBOX = 100;
	const STROKE = { sm: 10, lg: 8 } as const;
	const PIXELS = { sm: 'size-12', lg: 'size-40' } as const;
	const TONE_CLASSES: Record<RingTone, string> = {
		progress: 'stroke-lms-brand-growth-green',
		interactive: 'stroke-lms-interactive'
	};

	const radius = $derived((VIEWBOX - STROKE[size]) / 2);
	const circumference = $derived(2 * Math.PI * radius);
	const percent = $derived(Math.min(100, Math.max(0, value)));
	const dashOffset = $derived(circumference * (1 - percent / 100));
</script>

<div class={['relative shrink-0', PIXELS[size]]} role="img" aria-label={label}>
	<svg viewBox="0 0 {VIEWBOX} {VIEWBOX}" class="size-full -rotate-90" aria-hidden="true">
		<circle
			cx={VIEWBOX / 2}
			cy={VIEWBOX / 2}
			r={radius}
			fill="none"
			class="stroke-lms-progress-track"
			stroke-width={STROKE[size]}
		/>
		<circle
			cx={VIEWBOX / 2}
			cy={VIEWBOX / 2}
			r={radius}
			fill="none"
			class={TONE_CLASSES[tone]}
			stroke-width={STROKE[size]}
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={dashOffset}
		/>
	</svg>
	<div class="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
		<span class={size === 'lg' ? 'text-lms-h2' : 'text-lms-caption font-semibold'}>
			{center ?? `${percent}%`}
		</span>
		{#if caption && size === 'lg'}
			<span class="lms-text-caption">{caption}</span>
		{/if}
	</div>
</div>
