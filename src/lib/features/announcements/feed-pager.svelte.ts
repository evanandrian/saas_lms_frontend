import { runPageAction, type PageActionOutcome } from '$lib/utils/page-action';
import { appendFeedPage, feedView } from './announcements.model';
import type { AnnouncementFeed } from './announcements.types';

type FetchPage = (cursor: string) => Promise<PageActionOutcome<AnnouncementFeed>>;

/** Default: aksi halaman `feedMore` (disediakan `announcementFeedActions`). */
const fetchFeedMore: FetchPage = (cursor) =>
	runPageAction<AnnouncementFeed>('feedMore', { cursor });

/**
 * Halaman feed tambahan yang dimuat klien, terikat ke halaman pertama (`getBase()`) asalnya.
 * Halaman tambahan milik feed lama (setelah muat ulang) tidak pernah digabung ke tampilan baru,
 * hasil basi dibuang, dan klik ganda saat memuat diabaikan.
 */
export function createFeedPager(getBase: () => AnnouncementFeed | null, fetchPage = fetchFeedMore) {
	// raw: identitas `base` dibandingkan dengan `getBase()`, tidak boleh dibungkus proxy.
	let extra = $state.raw<{ base: AnnouncementFeed | null; page: AnnouncementFeed } | null>(null);
	let busy = $state(false);
	let failed = $state(false);

	const view = $derived(feedView(getBase(), extra && extra.base === getBase() ? extra.page : null));

	/** `true` bila satu halaman baru berhasil digabung ke tampilan. */
	async function loadMore(): Promise<boolean> {
		if (!view.cursor || busy) return false;
		const base = getBase();
		busy = true;
		const out = await fetchPage(view.cursor);
		busy = false;
		// Hasil basi (feed sudah dimuat ulang selama menunggu) dibuang.
		if (base !== getBase()) return false;
		failed = !out.ok;
		if (!out.ok) return false;
		extra = { base, page: appendFeedPage(extra?.base === base ? extra.page : null, out.data) };
		return true;
	}

	return {
		get items() {
			return view.items;
		},
		get cursor() {
			return view.cursor;
		},
		get busy() {
			return busy;
		},
		get failed() {
			return failed;
		},
		loadMore
	};
}
