<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import PageContainer from '$lib/components/layout/PageContainer.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string>) =>
		i18n.t(`account.verify_email.${key}`, params);
	const failureKey = $derived(
		data.failure === 'taken' || data.failure === 'unavailable' ? data.failure : 'gone'
	);
</script>

<AppShell>
	<PageContainer heading={t('heading')}>
		{#if data.email}
			<StatePanel title={t('success_title')} description={t('success_text', { email: data.email })}>
				{#snippet actions()}
					<a class="btn lms-action-primary lms-focus-ring" href={resolve(APP_PATHS.LOGIN)}
						>{t('login')}</a
					>
				{/snippet}
			</StatePanel>
		{:else}
			<StatePanel
				tone="warning"
				title={t(`failure.${failureKey}.title`)}
				description={t(`failure.${failureKey}.text`)}
			/>
		{/if}
	</PageContainer>
</AppShell>
