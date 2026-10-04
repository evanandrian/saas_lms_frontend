<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	interface Props {
		/** Kendali buka/tutup (bind). */
		open?: boolean;
		/** Nama aksesibel dialog. */
		label: string;
		/** Label tombol tutup. */
		closeLabel: string;
		children: Snippet;
	}

	let { open = $bindable(false), label, closeLabel, children }: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	// <dialog> native + showModal(): focus trap, Escape, top layer, dan latar inert ditangani browser.
	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});

	function handleClose() {
		open = false;
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === dialog) open = false;
	}
</script>

<dialog
	bind:this={dialog}
	aria-label={label}
	class="bg-lms-surface text-lms-foreground m-0 h-dvh max-h-dvh w-80 max-w-[85vw] p-0 shadow-xl backdrop:bg-black/50"
	onclose={handleClose}
	onclick={handleBackdropClick}
>
	<div class="flex h-full flex-col">
		<div class="flex justify-end p-3">
			<button
				type="button"
				class="btn-icon lms-action-ghost lms-focus-ring"
				aria-label={closeLabel}
				onclick={handleClose}
			>
				<Icon icon={X} />
			</button>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
			{@render children()}
		</div>
	</div>
</dialog>
