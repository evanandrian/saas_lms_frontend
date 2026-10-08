<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import X from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';

	/** Dialog form (native <dialog>: fokus terkurung, Esc menutup). */
	interface Props {
		open: boolean;
		title: string;
		closeLabel: string;
		wide?: boolean;
		children: Snippet;
		footer?: Snippet;
		onclose: () => void;
	}

	let { open, title, closeLabel, wide = false, children, footer, onclose }: Props = $props();
	let dialog = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	aria-label={title}
	class={[
		'bg-lms-surface text-lms-foreground m-auto max-h-[90dvh] w-[calc(100vw-2rem)] rounded-2xl p-0 shadow-xl backdrop:bg-black/50',
		wide ? 'max-w-2xl' : 'max-w-lg'
	]}
	{onclose}
>
	<div class="flex max-h-[90dvh] flex-col">
		<div class="border-lms-border flex items-center gap-3 border-b px-5 py-4">
			<h2 class="flex-1 text-base font-bold">{title}</h2>
			<button
				type="button"
				class="lms-focus-ring text-lms-muted flex size-8 items-center justify-center rounded-lg"
				aria-label={closeLabel}
				onclick={onclose}
			>
				<Icon icon={X} size="sm" />
			</button>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">{@render children()}</div>
		{#if footer}<div class="border-lms-border flex flex-wrap justify-end gap-2 border-t px-5 py-3">
				{@render footer()}
			</div>{/if}
	</div>
</dialog>
