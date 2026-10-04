<script lang="ts">
	import type { Snippet } from 'svelte';

	type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

	interface Props {
		tone?: BadgeTone;
		children: Snippet;
	}

	let { tone = 'neutral', children }: Props = $props();

	// Teks badge selalu bermakna sendiri; warna hanya penguat (makna tidak bergantung warna).
	const TONE_CLASSES: Record<BadgeTone, string> = {
		neutral: 'lms-action-secondary',
		info: 'lms-tone-info',
		success: 'preset-tonal-success',
		warning: 'preset-tonal-warning',
		error: 'preset-tonal-error'
	};
</script>

<span
	class={[
		'badge text-lms-caption rounded-full font-semibold whitespace-nowrap',
		TONE_CLASSES[tone]
	]}
>
	{@render children()}
</span>
