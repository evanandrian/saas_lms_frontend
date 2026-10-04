<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import PageContainer from '$lib/components/layout/PageContainer.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';

	const i18n = useI18n();
</script>

<!-- Tujuan eksplisit "akses ditolak" (FE-05): tidak pernah dialihkan ke dashboard peran lain. -->
<PageContainer heading={i18n.t('auth.access_denied.title')}>
	<StatePanel
		title={i18n.t('auth.access_denied.panel_title')}
		description={i18n.t('auth.access_denied.description')}
		tone="warning"
		headingLevel={2}
	>
		{#snippet actions()}
			<a href={resolve(APP_PATHS.LOGIN)} class="btn lms-action-secondary lms-focus-ring">
				{i18n.t('auth.access_denied.switch_account')}
			</a>
		{/snippet}
	</StatePanel>
	<p class="lms-text-caption text-center">
		{i18n.t('common.error.status', { status: page.status })}
	</p>
</PageContainer>
