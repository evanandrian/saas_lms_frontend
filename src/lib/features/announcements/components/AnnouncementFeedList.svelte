<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import { PREFIX, audienceText, formatAnnouncementTime } from '../announcements.model';
	import type { AnnouncementFeedItem } from '../announcements.types';

	interface Props {
		items: readonly AnnouncementFeedItem[];
		/** `true`: isi lengkap (halaman pengumuman); `false`: isi dipotong 3 baris (kartu beranda/widget). */
		full?: boolean;
	}

	let { items, full = false }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);
</script>

<!-- Isi pengumuman teks biasa: dirender sebagai teks (tanpa HTML), baris baru dipertahankan. -->
<ul class="flex flex-col">
	{#each items as item (item.id)}
		<li class="border-lms-border flex flex-col gap-1 border-t py-3 first:border-t-0 first:pt-0">
			<span class="text-sm font-semibold [overflow-wrap:anywhere]">{item.title}</span>
			<p
				class={[
					'text-[13px] leading-5 whitespace-pre-line [overflow-wrap:anywhere]',
					!full && 'line-clamp-3'
				]}
			>
				{item.body}
			</p>
			<span class="text-lms-muted text-xs"
				>{t('item_meta', {
					audience: audienceText(i18n.t, item),
					time: formatAnnouncementTime(item.published_at, i18n.locale),
					author: item.author_name || '—'
				})}</span
			>
		</li>
	{/each}
</ul>
