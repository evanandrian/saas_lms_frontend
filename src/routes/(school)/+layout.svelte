<script lang="ts">
	import type { LayoutProps } from './$types';

	// Shell ditentukan per area role (`app/<role>/+layout.svelte`); grup ini hanya menegakkan host tenant.
	let { children }: LayoutProps = $props();
</script>

{@render children()}
