<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Info from '@lucide/svelte/icons/info';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		eyebrow: string;
		title: string;
		subtitle?: string;
		hint: string;
		hasErrors?: boolean;
		busy?: boolean;
		saveLabel: string;
		cancelLabel: string;
		closeLabel: string;
		deleteLabel?: string;
		children: Snippet;
		onclose: () => void;
		onsave: () => void;
		ondelete?: () => void;
	}

	let {
		open,
		eyebrow,
		title,
		subtitle = '',
		hint,
		hasErrors = false,
		busy = false,
		saveLabel,
		cancelLabel,
		closeLabel,
		deleteLabel,
		children,
		onclose,
		onsave,
		ondelete
	}: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	// <dialog> native: focus trap, Escape, latar inert ditangani browser.
	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});
</script>

<!-- Drawer form kanan (referensi v4: lebar 560px, header eyebrow/judul, footer petunjuk + Batal/Simpan). -->
<dialog
	bind:this={dialog}
	aria-label={title}
	class="bg-lms-surface text-lms-foreground border-lms-border m-0 ml-auto h-dvh max-h-dvh w-[min(560px,100vw)] max-w-none border-l p-0 shadow-2xl backdrop:bg-(--color-lms-hero)/45"
	{onclose}
	onclick={(e) => e.target === dialog && onclose()}
>
	<div class="flex h-full flex-col">
		<div class="border-lms-border flex items-start gap-3 border-b px-5 py-[18px]">
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<span class="text-lms-muted font-mono text-[11px] tracking-[0.1em]">{eyebrow}</span>
				<span class="text-lg font-bold">{title}</span>
				{#if subtitle}<span class="text-lms-muted text-xs">{subtitle}</span>{/if}
			</div>
			<button
				type="button"
				aria-label={closeLabel}
				class="bg-lms-surface-muted text-lms-muted lms-focus-ring flex size-9 items-center justify-center rounded-lg"
				onclick={onclose}><Icon icon={X} size="sm" /></button
			>
		</div>
		<div class="flex min-h-0 flex-1 flex-col gap-[18px] overflow-auto p-5">
			{#if open}{@render children()}{/if}
		</div>
		<div class="border-lms-border flex flex-wrap items-center gap-2 border-t px-5 py-3">
			<span
				class="flex flex-[1_1_160px] items-center gap-1.5 text-xs {hasErrors
					? 'text-lms-danger-text'
					: 'text-lms-muted'}"><Icon icon={hasErrors ? CircleAlert : Info} size="sm" />{hint}</span
			>
			{#if ondelete && deleteLabel}
				<button
					type="button"
					class="lms-action-ghost text-lms-danger-text lms-focus-ring inline-flex h-[42px] items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold"
					disabled={busy}
					onclick={ondelete}><Icon icon={Trash2} size="sm" />{deleteLabel}</button
				>
			{/if}
			<button
				type="button"
				class="lms-action-secondary lms-focus-ring h-[42px] rounded-[10px] px-4 text-sm font-semibold"
				onclick={onclose}>{cancelLabel}</button
			>
			<button
				type="button"
				class="lms-action-primary lms-focus-ring inline-flex h-[42px] items-center gap-1.5 rounded-[10px] px-[18px] text-sm font-bold disabled:opacity-60"
				disabled={busy}
				onclick={onsave}><Icon icon={Check} size="sm" />{saveLabel}</button
			>
		</div>
	</div>
</dialog>
