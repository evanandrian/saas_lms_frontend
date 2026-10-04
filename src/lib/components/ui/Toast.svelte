<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Icon from './Icon.svelte';

	interface Props {
		/** Pesan aktif; `null` = tidak tampil. Region live tetap dirender agar pembaca layar mengumumkannya. */
		message: string | null;
		icon?: LucideIcon;
		/** Aksi opsional di ujung toast (mis. "Urungkan"). */
		action?: { readonly label: string; readonly onclick: () => void } | null;
	}

	let { message, icon = CircleCheck, action = null }: Props = $props();
</script>

<!-- Toast referensi v3: latar hero, ikon hijau, tengah bawah. -->
<div
	class="pointer-events-none fixed bottom-19 left-1/2 z-70 w-max max-w-[calc(100vw-1.5rem)] -translate-x-1/2"
	role="status"
	aria-live="polite"
>
	{#if message}
		<div
			class="bg-lms-hero text-lms-on-hero text-lms-body-sm flex items-center gap-3.5 rounded-xl py-2.5 ps-4 shadow-2xl {action
				? 'pe-2.5'
				: 'pe-4'}"
		>
			<span class="text-lms-on-hero-progress shrink-0"><Icon {icon} /></span>
			<span>{message}</span>
			{#if action}
				<button
					type="button"
					class="border-lms-on-hero/30 text-lms-on-hero hover:bg-lms-on-hero/10 lms-focus-ring pointer-events-auto h-8 flex-none rounded-lg border px-3 text-[0.8125rem] font-semibold"
					onclick={action.onclick}
				>
					{action.label}
				</button>
			{/if}
		</div>
	{/if}
</div>
