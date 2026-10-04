<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		meta?: string;
		/** Elemen di kiri (avatar, ikon, tanggal). */
		leading?: Snippet;
		/** Elemen di kanan (badge, nilai, aksi). */
		trailing?: Snippet;
	}

	let { title, meta, leading, trailing }: Props = $props();
</script>

<li class="border-lms-border flex items-center gap-3.5 border-t px-5.5 py-3.5">
	{#if leading}<div class="shrink-0">{@render leading()}</div>{/if}
	<div class="min-w-0 flex-1">
		<p class="text-lms-body-sm font-semibold break-words">{title}</p>
		{#if meta}<p class="lms-text-caption break-words">{meta}</p>{/if}
	</div>
	{#if trailing}<div class="flex shrink-0 items-center gap-2">{@render trailing()}</div>{/if}
</li>
