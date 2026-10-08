<script lang="ts">
	import PaymentConsole from '$lib/features/payments/PaymentConsole.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PaymentConsole
	list={data.list}
	unpaid={data.unpaid}
	failure={data.failure}
/>
