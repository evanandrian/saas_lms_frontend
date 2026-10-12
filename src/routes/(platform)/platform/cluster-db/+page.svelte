<script lang="ts">
	import ClusterConsole from '$lib/features/clusters/components/ClusterConsole.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<ClusterConsole list={data.list} failure={data.failure} />
