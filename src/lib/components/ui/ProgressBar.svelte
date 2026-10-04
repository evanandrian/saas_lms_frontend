<script lang="ts">
	type ProgressTone = 'progress' | 'interactive' | 'warning';
	type ProgressSize = 'sm' | 'md';

	interface Props {
		/** Nilai 0–100. */
		value: number;
		/** Nama aksesibel (mis. "Matematika"). */
		label: string;
		tone?: ProgressTone;
		size?: ProgressSize;
		/** Penanda ambang (0–100), mis. kriteria ketercapaian; ditampilkan sebagai garis. */
		marker?: number;
		/** Teks yang mendeskripsikan penanda untuk pembaca layar. */
		markerLabel?: string;
	}

	let { value, label, tone = 'progress', size = 'sm', marker, markerLabel }: Props = $props();

	const MIN = 0;
	const MAX = 100;
	const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

	// Growth Green = progres (bukan success). Warna hanya penguat; angka tampil di pemakai.
	const TONE_CLASSES: Record<ProgressTone, string> = {
		progress: 'bg-lms-brand-growth-green',
		interactive: 'bg-lms-interactive',
		warning: 'bg-warning-500'
	};
	const SIZE_CLASSES: Record<ProgressSize, string> = { sm: 'h-1.5', md: 'h-2.5' };

	const percent = $derived(clamp(value));
	const valueText = $derived(
		marker === undefined ? `${percent}%` : `${percent}%${markerLabel ? `, ${markerLabel}` : ''}`
	);
</script>

<div
	class={['bg-lms-progress-track relative w-full rounded-full', SIZE_CLASSES[size]]}
	role="progressbar"
	aria-label={label}
	aria-valuemin={MIN}
	aria-valuemax={MAX}
	aria-valuenow={percent}
	aria-valuetext={valueText}
>
	<div class={['h-full rounded-full', TONE_CLASSES[tone]]} style:width="{percent}%"></div>
	{#if marker !== undefined}
		<span
			class="bg-lms-foreground absolute -top-1 -bottom-1 w-0.5"
			style:left="{clamp(marker)}%"
			aria-hidden="true"
		></span>
	{/if}
</div>
