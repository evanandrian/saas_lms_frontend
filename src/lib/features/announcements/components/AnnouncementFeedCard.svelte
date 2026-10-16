<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { useI18n } from '$lib/i18n';
	import { runPageAction } from '$lib/utils/page-action';
	import type { Snippet } from 'svelte';
	import {
		FEED_PAGE,
		FEED_PREVIEW,
		PREFIX,
		appendFeedPage,
		feedView
	} from '../announcements.model';
	import type { AnnouncementFeed } from '../announcements.types';
	import AnnouncementFeedList from './AnnouncementFeedList.svelte';

	interface Props {
		/** Halaman pertama feed dari load server; `null` = gagal dimuat. */
		feed: AnnouncementFeed | null;
		/** Pengganti tombol "Muat lebih banyak" (mis. tautan ke halaman semua pengumuman). */
		footer?: Snippet;
	}

	let { feed, footer }: Props = $props();

	const i18n = useI18n();
	const t = (key: string) => i18n.t(`${PREFIX}.${key}`);
	const headingId = $props.id();

	/** Halaman feed berikutnya yang dimuat di kartu (halaman pertama selalu dari `feed`). */
	let more = $state<AnnouncementFeed | null>(null);
	let visible = $state(FEED_PREVIEW);
	let busy = $state(false);
	let failed = $state(false);

	const view = $derived(feedView(feed, more));
	const hasMore = $derived(visible < view.items.length || view.cursor !== '');

	/** Kartu: 3 terbaru dulu; berikutnya per halaman feed (keyset backend lewat aksi `feedMore`). */
	async function loadMore() {
		if (visible < view.items.length) {
			visible += FEED_PAGE;
			return;
		}
		busy = true;
		const out = await runPageAction<AnnouncementFeed>('feedMore', { cursor: view.cursor });
		busy = false;
		failed = !out.ok;
		if (!out.ok) return;
		more = appendFeedPage(more, out.data);
		visible += FEED_PAGE;
	}
</script>

<section
	class="lms-card flex min-w-0 flex-col gap-3 rounded-xl! p-5 shadow-none!"
	aria-labelledby={headingId}
>
	<h2 id={headingId} class="text-base font-bold">{t('feed.title')}</h2>
	{#if !feed}
		<p class="text-lms-danger-text text-[13px]" role="alert">{t('load_failed')}</p>
		<button
			type="button"
			class="lms-action-secondary lms-focus-ring h-9 self-start rounded-lg px-3 text-xs font-semibold"
			onclick={() => invalidateAll()}>{t('retry')}</button
		>
	{:else if view.items.length === 0}
		<p class="text-lms-muted text-[13px]">{t('empty')}</p>
	{:else}
		<AnnouncementFeedList items={view.items.slice(0, visible)} />
		{#if failed}
			<p class="text-lms-danger-text text-xs" role="alert">{t('load_failed')}</p>
		{/if}
		{#if footer}
			{@render footer()}
		{:else if hasMore}
			<button
				type="button"
				disabled={busy}
				class="lms-action-secondary lms-focus-ring h-9 self-start rounded-lg px-3 text-xs font-semibold disabled:opacity-60"
				onclick={loadMore}>{busy ? t('loading') : t('load_more')}</button
			>
		{/if}
	{/if}
</section>
