<script lang="ts">
	import TenantConsole from '$lib/features/tenant-management/TenantConsole.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Tenant - FLIXARE</title>
</svelte:head>

<TenantConsole list={data.tenants} failure={data.failure} />
