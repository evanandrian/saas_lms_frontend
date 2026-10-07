<script lang="ts">
	import AccountSettings from '$lib/features/account/components/AccountSettings.svelte';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<AccountSettings
	{data}
	photoPath={APP_PATHS.ACCOUNT_PHOTO}
	exportPath={APP_PATHS.ACCOUNT_EXPORTS}
/>
