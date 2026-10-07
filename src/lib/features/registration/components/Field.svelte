<script lang="ts">
	import type { Snippet } from 'svelte';

	/** Label + isian + pesan (referensi: label 13px semibold, pesan 12px). */
	interface Props {
		label: string;
		optional?: string;
		error?: string;
		hint?: string;
		hintTone?: 'muted' | 'success' | 'warning';
		wide?: boolean;
		for?: string;
		children: Snippet;
	}

	let {
		label,
		optional,
		error,
		hint,
		hintTone = 'muted',
		wide = false,
		for: htmlFor,
		children
	}: Props = $props();
</script>

<div class={['flex flex-col gap-1.5', wide && 'col-span-full']}>
	<label for={htmlFor} class="text-[0.8125rem] font-semibold">
		{label}
		{#if optional}<span class="text-lms-muted font-normal">({optional})</span>{/if}
	</label>
	{@render children()}
	{#if error}
		<span class="text-lms-danger-text text-xs" role="alert">{error}</span>
	{:else if hint}
		<span
			class={[
				'text-xs leading-4.25',
				hintTone === 'success'
					? 'text-lms-success-text'
					: hintTone === 'warning'
						? 'text-lms-warning-text'
						: 'text-lms-muted'
			]}>{hint}</span
		>
	{/if}
</div>
