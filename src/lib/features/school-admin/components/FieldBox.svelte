<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		/** id kontrol agar label terhubung (tidak dipakai untuk segmented). */
		for?: string;
		required?: boolean;
		note?: string;
		error?: string;
		full?: boolean;
		children: Snippet;
	}

	let {
		label,
		for: htmlFor,
		required = false,
		note = '',
		error = '',
		full = false,
		children
	}: Props = $props();
</script>

<div class="flex min-w-0 flex-col gap-1.5 {full ? 'col-span-full' : ''}">
	{#if htmlFor}
		<label for={htmlFor} class="text-[13px] font-semibold"
			>{label}{#if required}<span class="text-lms-danger-text"> *</span>{/if}</label
		>
	{:else}
		<span class="text-[13px] font-semibold"
			>{label}{#if required}<span class="text-lms-danger-text"> *</span>{/if}</span
		>
	{/if}
	{@render children()}
	{#if error}
		<span class="text-lms-danger-text text-xs leading-[17px]" role="alert">{error}</span>
	{:else if note}
		<span class="text-lms-muted text-xs leading-[17px]">{note}</span>
	{/if}
</div>
