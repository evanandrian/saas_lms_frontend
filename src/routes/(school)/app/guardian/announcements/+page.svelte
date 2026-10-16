<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import { PREFIX } from '$lib/features/announcements/announcements.model';
	import { createFeedPager } from '$lib/features/announcements/feed-pager.svelte';
	import AnnouncementFeedList from '$lib/features/announcements/components/AnnouncementFeedList.svelte';
	import { useI18n } from '$lib/i18n';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string) => i18n.t(`${PREFIX}.${key}`);

	const pager = createFeedPager(() => data.feed);
</script>

<svelte:head><title>{t('guardian.title')} · FLIXARE</title></svelte:head>

<div class="text-lms-foreground flex flex-col gap-4 pb-24">
	<HeroBanner
		eyebrow={t('guardian.eyebrow')}
		title={t('guardian.title')}
		description={t('guardian.desc')}
		help="help.guardian_announcements"
	/>
	{#if !data.feed}
		<StatePanel tone="error" title={t('load_failed')}>
			{#snippet actions()}
				<button
					type="button"
					class="lms-action-secondary lms-focus-ring h-9 rounded-lg px-3 text-xs font-semibold"
					onclick={() => invalidateAll()}>{t('retry')}</button
				>
			{/snippet}
		</StatePanel>
	{:else if pager.items.length === 0}
		<StatePanel title={t('empty')} />
	{:else}
		<section class="lms-card flex flex-col gap-3 rounded-xl! p-5 shadow-none!">
			<AnnouncementFeedList items={pager.items} full />
			{#if pager.failed}
				<p class="text-lms-danger-text text-xs" role="alert">{t('load_failed')}</p>
			{/if}
			{#if pager.cursor}
				<button
					type="button"
					disabled={pager.busy}
					class="lms-action-secondary lms-focus-ring h-10 self-center rounded-lg px-4 text-[13px] font-semibold disabled:opacity-60"
					onclick={pager.loadMore}>{pager.busy ? t('loading') : t('load_more')}</button
				>
			{/if}
		</section>
	{/if}
</div>
