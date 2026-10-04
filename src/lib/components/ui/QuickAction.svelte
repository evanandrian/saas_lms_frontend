<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import Icon from './Icon.svelte';

	interface Props {
		label: string;
		icon: LucideIcon;
		/** Aksi belum tersedia: dirender nonaktif dengan keterangan (keputusan FE-04 D6). */
		disabledReason: string;
	}

	let { label, icon, disabledReason }: Props = $props();

	const reasonId = $props.id();
</script>

<!-- Saat fitur tersedia, komponen ini menerima `href`/`onclick`; kini selalu nonaktif. -->
<button
	type="button"
	class="border-lms-border bg-lms-background text-lms-foreground flex h-full w-full flex-col items-start gap-2.5 rounded-[14px] border p-3.5 text-start"
	disabled
	aria-describedby={reasonId}
>
	<span class="lms-tone-info inline-flex size-8.5 items-center justify-center rounded-[10px]">
		<Icon {icon} size="sm" />
	</span>
	<span class="text-lms-body-sm font-semibold">{label}</span>
	<span id={reasonId} class="sr-only">{disabledReason}</span>
</button>
