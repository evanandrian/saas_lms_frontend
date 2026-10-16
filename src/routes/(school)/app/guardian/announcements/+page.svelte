<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import {
		PREFIX,
		appendFeedPage,
		feedView
	} from '$lib/features/announcements/announcements.model';
	import AnnouncementFeedList from '$lib/features/announcements/components/AnnouncementFeedList.svelte';
	import type { AnnouncementFeed } from '$lib/features/announcements/announcements.types';
	import { useI18n } from '$lib/i18n';
	import { runPageAction } from '$lib/utils/page-action';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string) => i18n.t(`${PREFIX}.${key}`);

	/** Halaman tambahan yang dimuat klien, terikat ke halaman pertama (`base`) yang aktif saat dimuat. */
	let extra = $state<{ base: AnnouncementFeed | null; page: AnnouncementFeed } | null>(null);
	let busy = $state(false);
	let failed = $state(false);

	// Halaman tambahan milik data lama (setelah muat ulang) tidak pernah digabung ke tampilan baru.
	const view = $derived(feedView(data.feed, extra?.base === data.feed ? extra.page : null));

	async function loadMore() {
		if (!view.cursor || busy) return;
		const base = data.feed;
		busy = true;
		const out = await runPageAction<AnnouncementFeed>('feedMore', { cursor: view.cursor });
		busy = false;
		// Hasil basi (feed sudah dimuat ulang selama menunggu) dibuang.
		if (base !== data.feed) return;
		failed = !out.ok;
		if (out.ok)
			extra = { base, page: appendFeedPage(extra?.base === base ? extra.page : null, out.data) };
	}
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
	{:else if view.items.length === 0}
		<StatePanel title={t('empty')} />
	{:else}
		<section class="lms-card flex flex-col gap-3 rounded-xl! p-5 shadow-none!">
			<AnnouncementFeedList items={view.items} full />
			{#if failed}
				<p class="text-lms-danger-text text-xs" role="alert">{t('load_failed')}</p>
			{/if}
			{#if view.cursor}
				<button
					type="button"
					disabled={busy}
					class="lms-action-secondary lms-focus-ring h-10 self-center rounded-lg px-4 text-[13px] font-semibold disabled:opacity-60"
					onclick={loadMore}>{busy ? t('loading') : t('load_more')}</button
				>
			{/if}
		</section>
	{/if}
</div>
