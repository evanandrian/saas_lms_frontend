<script lang="ts">
	import { page } from '$app/state';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import { useI18n } from '$lib/i18n';

	const i18n = useI18n();

	const HTTP_FORBIDDEN = 403;
	const HTTP_NOT_FOUND = 404;

	const errorKey = $derived(
		page.status === HTTP_NOT_FOUND
			? 'common.error.not_found'
			: page.status === HTTP_FORBIDDEN
				? 'common.error.forbidden'
				: 'common.error.unexpected'
	);
	const tone = $derived(
		page.status === HTTP_NOT_FOUND
			? 'neutral'
			: page.status === HTTP_FORBIDDEN
				? 'warning'
				: 'error'
	);
	const title = $derived(i18n.t(`${errorKey}_title`));
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<main id="main-content" class="lms-container py-10">
	<StatePanel {title} description={i18n.t(`${errorKey}_description`)} {tone} headingLevel={1} />
	<p class="lms-text-caption mt-3 text-center">
		{i18n.t('common.error.status', { status: page.status })}
	</p>
</main>
