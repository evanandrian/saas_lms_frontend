<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { TENANT_MAINTENANCE_CODE } from '$lib/api/tenant-maintenance';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import { useI18n } from '$lib/i18n';

	const i18n = useI18n();

	const HTTP_FORBIDDEN = 403;
	const HTTP_NOT_FOUND = 404;

	// Cluster database tenant sedang pemeliharaan (503 `tenant_maintenance` dari load area sekolah).
	const maintenance = $derived(page.error?.code === TENANT_MAINTENANCE_CODE);
	let retrying = $state(false);

	const errorKey = $derived(
		maintenance
			? 'common.error.maintenance'
			: page.status === HTTP_NOT_FOUND
				? 'common.error.not_found'
				: page.status === HTTP_FORBIDDEN
					? 'common.error.forbidden'
					: 'common.error.unexpected'
	);
	const tone = $derived(
		maintenance || page.status === HTTP_FORBIDDEN
			? 'warning'
			: page.status === HTTP_NOT_FOUND
				? 'neutral'
				: 'error'
	);
	const title = $derived(i18n.t(`${errorKey}_title`));

	async function retry() {
		retrying = true;
		try {
			await invalidateAll();
		} finally {
			retrying = false;
		}
	}
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<main id="main-content" class="lms-container py-10">
	{#if maintenance}
		<StatePanel {title} description={i18n.t(`${errorKey}_description`)} {tone} headingLevel={1}>
			{#snippet actions()}
				<button
					type="button"
					class="btn lms-action-primary lms-focus-ring h-10 rounded-[10px] px-4 text-sm font-semibold"
					disabled={retrying}
					aria-busy={retrying}
					onclick={retry}
				>
					{i18n.t('common.error.maintenance_retry')}
				</button>
			{/snippet}
		</StatePanel>
	{:else}
		<StatePanel {title} description={i18n.t(`${errorKey}_description`)} {tone} headingLevel={1} />
	{/if}
	<p class="lms-text-caption mt-3 text-center">
		{i18n.t('common.error.status', { status: page.status })}
	</p>
</main>
