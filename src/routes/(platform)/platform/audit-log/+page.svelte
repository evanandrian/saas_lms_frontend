<script lang="ts">
	import AuditLogConsole from '$lib/features/platform-audit/components/AuditLogConsole.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<AuditLogConsole
	filters={data.filters}
	list={data.list}
	failure={data.failure}
	issues={data.issues}
/>
