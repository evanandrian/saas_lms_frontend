<script lang="ts">
	import ApplicationReview from '$lib/features/tenant-applications/components/ApplicationReview.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<ApplicationReview queue={data.queue} failure={data.failure} />
