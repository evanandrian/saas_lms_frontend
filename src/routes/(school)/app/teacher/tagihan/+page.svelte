<script lang="ts">
	import { resolve } from '$app/paths';
	import TenantBilling from '$lib/features/invoices/components/TenantBilling.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<TenantBilling
	list={data.list}
	selected={data.selected}
	failure={data.failure}
	proofHref={resolve('/app/teacher/tagihan/proof')}
/>
