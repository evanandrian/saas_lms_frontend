<script lang="ts">
	import type { Snippet } from 'svelte';
	import Spinner from './Spinner.svelte';

	type StateTone = 'neutral' | 'warning' | 'error';
	type HeadingLevel = 1 | 2 | 3;

	interface Props {
		title: string;
		description?: string;
		tone?: StateTone;
		/** Tingkat heading menyesuaikan hierarki halaman pemakai. */
		headingLevel?: HeadingLevel;
		/** Menampilkan state memuat; region ditandai `aria-busy`. */
		loading?: boolean;
		actions?: Snippet;
	}

	let {
		title,
		description,
		tone = 'neutral',
		headingLevel = 2,
		loading = false,
		actions
	}: Props = $props();

	const TONE_CLASSES: Record<StateTone, string> = {
		neutral: 'border-lms-border',
		warning: 'border-warning-600-400',
		error: 'border-error-700-300'
	};
</script>

<section
	class={[
		'rounded-container bg-lms-surface flex flex-col items-center gap-3 border-2 border-dashed px-6 py-10 text-center',
		TONE_CLASSES[tone]
	]}
	aria-busy={loading ? 'true' : undefined}
>
	{#if loading}
		<Spinner size="md" />
	{/if}
	<svelte:element this={`h${headingLevel}`} class="text-lms-h4">{title}</svelte:element>
	{#if description}
		<p class="lms-text-helper max-w-prose">{description}</p>
	{/if}
	{#if actions}
		<div class="flex flex-wrap justify-center gap-2">{@render actions()}</div>
	{/if}
</section>
