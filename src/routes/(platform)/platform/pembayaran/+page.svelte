<script lang="ts">
	import PaymentConsole from '$lib/features/payments/components/PaymentConsole.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PaymentConsole list={data.list} unpaid={data.unpaid} banks={data.banks} failure={data.failure} />
