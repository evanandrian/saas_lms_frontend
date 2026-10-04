<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import Avatar from './Avatar.svelte';
	import Icon from './Icon.svelte';

	export interface ConfirmDialogDetail {
		icon: LucideIcon;
		label: string;
		value: string;
	}

	export interface ConfirmDialogPerson {
		initials: string;
		name: string;
		detail: string;
	}

	interface Props {
		open: boolean;
		icon: LucideIcon;
		title: string;
		message: string;
		person?: ConfirmDialogPerson;
		details?: readonly ConfirmDialogDetail[];
		/** Konten tambahan di atas tombol (mis. opsi). */
		options?: Snippet;
		confirmLabel: string;
		confirmIcon?: LucideIcon;
		busyLabel: string;
		cancelLabel: string;
		/** Petunjuk keyboard, mis. "ESC untuk batal · ENTER untuk keluar". */
		keyHint?: string;
		/** Konfirmasi mengirim form POST ke URL ini (navigasi dokumen penuh). */
		action: string;
	}

	let {
		open = $bindable(false),
		icon,
		title,
		message,
		person,
		details = [],
		options,
		confirmLabel,
		confirmIcon,
		busyLabel,
		cancelLabel,
		keyHint,
		action
	}: Props = $props();

	const titleId = $props.id();
	let dialog = $state<HTMLDialogElement | null>(null);
	let isBusy = $state(false);

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});

	function handleClose() {
		open = false;
		isBusy = false;
	}

	function handleBackdrop(event: MouseEvent) {
		if (event.target === dialog && !isBusy) dialog?.close();
	}
</script>

<!-- Dialog native: fokus terkurung, Esc membatalkan, fokus kembali ke pemicu (referensi v3 ConfirmDialog). -->
<dialog
	bind:this={dialog}
	class="bg-lms-surface text-lms-foreground m-auto w-[calc(100%-2rem)] max-w-110 rounded-3xl p-7 shadow-2xl backdrop:bg-(--color-lms-hero)/55 backdrop:backdrop-blur-sm"
	aria-labelledby={titleId}
	onclose={handleClose}
	onclick={handleBackdrop}
>
	<form method="POST" {action} class="flex flex-col gap-5" onsubmit={() => (isBusy = true)}>
		<span
			class="preset-tonal-error ring-error-500/20 inline-flex size-15 items-center justify-center rounded-2xl ring-4"
			aria-hidden="true"
		>
			<Icon {icon} />
		</span>
		<div class="flex flex-col gap-2">
			<h2 id={titleId} class="text-lms-h4 font-bold">{title}</h2>
			<p class="text-lms-body-sm text-lms-muted">{message}</p>
		</div>
		{#if person}
			<div
				class="border-lms-border bg-lms-background flex items-center gap-3 rounded-2xl border px-4 py-3"
			>
				<Avatar initials={person.initials} />
				<span class="flex min-w-0 flex-col">
					<span class="text-lms-body-sm font-bold">{person.name}</span>
					<span class="text-lms-caption text-lms-muted truncate">{person.detail}</span>
				</span>
			</div>
		{/if}
		{#if details.length}
			<dl>
				{#each details as detail (detail.label)}
					<div
						class="border-lms-border text-lms-body-sm flex items-center gap-2.5 border-t border-dashed py-2.5"
					>
						<dt class="text-lms-muted flex flex-1 items-center gap-2.5">
							<Icon icon={detail.icon} size="sm" />{detail.label}
						</dt>
						<dd class="font-semibold">{detail.value}</dd>
					</div>
				{/each}
			</dl>
		{/if}
		{#if options}{@render options()}{/if}
		<div class="grid grid-cols-2 gap-2.5">
			<button
				type="button"
				class="border-lms-input-border bg-lms-surface lms-focus-ring hover:border-lms-interactive h-12 rounded-xl border font-semibold"
				disabled={isBusy}
				onclick={() => dialog?.close()}
			>
				{cancelLabel}
			</button>
			<!-- svelte-ignore a11y_autofocus -->
			<button
				type="submit"
				class="lms-action-destructive lms-focus-ring flex h-12 items-center justify-center gap-2 rounded-xl font-semibold"
				aria-busy={isBusy}
				autofocus
			>
				{#if confirmIcon}<Icon icon={confirmIcon} size="sm" />{/if}
				{isBusy ? busyLabel : confirmLabel}
			</button>
		</div>
		{#if keyHint}
			<p class="text-lms-muted text-center font-mono text-[11px] tracking-wider">{keyHint}</p>
		{/if}
	</form>
</dialog>
