<script lang="ts">
	import type { Snippet } from 'svelte';

	type AlertTone = 'info' | 'success' | 'warning' | 'error';

	interface Props {
		tone?: AlertTone;
		title?: string;
		children: Snippet;
	}

	let { tone = 'info', title, children }: Props = $props();

	const TONE_CLASSES: Record<AlertTone, string> = {
		info: 'lms-tone-info',
		success: 'lms-tone-success',
		warning: 'lms-tone-warning',
		error: 'lms-tone-danger'
	};

	// Error diumumkan segera; tone lain sopan (tidak memotong pembaca layar).
	const role = $derived(tone === 'error' ? 'alert' : 'status');
</script>

<div class={['card space-y-1 p-4', TONE_CLASSES[tone]]} {role}>
	{#if title}
		<p class="font-semibold">{title}</p>
	{/if}
	<div>{@render children()}</div>
</div>
