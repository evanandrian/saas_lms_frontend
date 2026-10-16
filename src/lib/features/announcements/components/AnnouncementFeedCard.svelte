<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { useI18n } from '$lib/i18n';
	import type { Snippet } from 'svelte';
	import { FEED_PAGE, FEED_PREVIEW, PREFIX } from '../announcements.model';
	import type { AnnouncementFeed } from '../announcements.types';
	import { createFeedPager } from '../feed-pager.svelte';
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

	/** Halaman feed berikutnya dimuat lewat pager (terikat ke `feed` asalnya, halaman basi dibuang). */
	const pager = createFeedPager(() => feed);
	let visible = $state(FEED_PREVIEW);

	const hasMore = $derived(visible < pager.items.length || pager.cursor !== '');

	/** Kartu: 3 terbaru dulu; berikutnya per halaman feed (keyset backend lewat aksi `feedMore`). */
	async function loadMore() {
		if (visible < pager.items.length) {
			visible += FEED_PAGE;
			return;
		}
		if (await pager.loadMore()) visible += FEED_PAGE;
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
		{@render footer?.()}
	{:else if pager.items.length === 0}
		<p class="text-lms-muted text-[13px]">{t('empty')}</p>
		{@render footer?.()}
	{:else}
		<AnnouncementFeedList items={pager.items.slice(0, visible)} />
		{#if pager.failed}
			<p class="text-lms-danger-text text-xs" role="alert">{t('load_failed')}</p>
		{/if}
		{#if footer}
			{@render footer()}
		{:else if hasMore}
			<button
				type="button"
				disabled={pager.busy}
				class="lms-action-secondary lms-focus-ring h-9 self-start rounded-lg px-3 text-xs font-semibold disabled:opacity-60"
				onclick={loadMore}>{pager.busy ? t('loading') : t('load_more')}</button
			>
		{/if}
	{/if}
</section>
