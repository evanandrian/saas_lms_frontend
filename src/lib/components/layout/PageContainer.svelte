<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		heading: string;
		/**
		 * `contained` (default): lebar baca terbatas, untuk halaman publik/formulir.
		 * `full`: mengikuti gutter shell aplikasi tanpa max-width global (FE-04R).
		 */
		width?: 'contained' | 'full';
		children?: Snippet;
	}

	let { heading, width = 'contained', children }: Props = $props();
</script>

<svelte:head>
	<title>{heading}</title>
</svelte:head>

<div class={['space-y-6 py-6 md:py-8', width === 'full' ? 'px-4 md:px-6' : 'lms-container']}>
	<h1 class="text-lms-h2 md:text-lms-h1">{heading}</h1>
	{@render children?.()}
</div>
