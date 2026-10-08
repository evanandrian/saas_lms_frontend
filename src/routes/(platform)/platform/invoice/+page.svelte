<script lang="ts">
	import InvoiceConsole from '$lib/features/invoices/components/InvoiceConsole.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<InvoiceConsole
	list={data.list}
	options={data.options}
	selected={data.selected}
	failure={data.failure}
/>
