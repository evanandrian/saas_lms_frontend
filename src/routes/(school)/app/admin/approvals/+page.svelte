<script lang="ts">
	import ApprovalInbox from '$lib/features/approvals/components/ApprovalInbox.svelte';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<ApprovalInbox {data} documentPath={APP_PATHS.APPROVAL_DOCUMENTS} />
