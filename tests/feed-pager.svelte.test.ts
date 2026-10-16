import { describe, expect, it } from 'vitest';
import { createFeedPager } from '$lib/features/announcements/feed-pager.svelte';
import type {
	AnnouncementFeed,
	AnnouncementFeedItem
} from '$lib/features/announcements/announcements.types';
import type { PageActionOutcome } from '$lib/utils/page-action';

const item = (id: string) => ({ id, title: id }) as unknown as AnnouncementFeedItem;
const feed = (ids: string[], next = ''): AnnouncementFeed => ({
	items: ids.map(item),
	next_cursor: next
});
const ok = (data: AnnouncementFeed): PageActionOutcome<AnnouncementFeed> => ({ ok: true, data });
const fail: PageActionOutcome<AnnouncementFeed> = {
	ok: false,
	reason: 'unavailable',
	code: '',
	issues: [],
	remaining: null,
	retryAt: null
};

describe('createFeedPager', () => {
	it('menggabungkan halaman berikutnya dengan dedupe dan kursor terbaru', async () => {
		const base = feed(['a', 'b'], 'c1');
		const pager = createFeedPager(
			() => base,
			async () => ok(feed(['b', 'c'], ''))
		);
		expect(await pager.loadMore()).toBe(true);
		expect(pager.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
		expect(pager.cursor).toBe('');
		expect(await pager.loadMore()).toBe(false);
	});

	it('mengabaikan klik ganda saat memuat', async () => {
		let calls = 0;
		let release: (o: PageActionOutcome<AnnouncementFeed>) => void = () => {};
		const base = feed(['a'], 'c1');
		const pager = createFeedPager(
			() => base,
			() => {
				calls++;
				return new Promise((r) => (release = r));
			}
		);
		const first = pager.loadMore();
		expect(pager.busy).toBe(true);
		expect(await pager.loadMore()).toBe(false);
		release(ok(feed(['b'])));
		expect(await first).toBe(true);
		expect(calls).toBe(1);
		expect(pager.busy).toBe(false);
	});

	it('menandai gagal tanpa mengubah tampilan, lalu pulih saat berhasil', async () => {
		let next: PageActionOutcome<AnnouncementFeed> = fail;
		const base = feed(['a'], 'c1');
		const pager = createFeedPager(
			() => base,
			async () => next
		);
		expect(await pager.loadMore()).toBe(false);
		expect(pager.failed).toBe(true);
		expect(pager.items).toHaveLength(1);
		next = ok(feed(['b']));
		expect(await pager.loadMore()).toBe(true);
		expect(pager.failed).toBe(false);
	});

	it('status gagal di-reset saat halaman pertama berganti (mis. setelah Retry/invalidateAll)', async () => {
		let base = $state.raw(feed(['a'], 'c1'));
		const pager = createFeedPager(
			() => base,
			async () => fail
		);
		expect(await pager.loadMore()).toBe(false);
		expect(pager.failed).toBe(true);
		base = feed(['a', 'b'], 'c2');
		expect(pager.failed).toBe(false);
	});

	it('membuang hasil basi dan tidak menggabung halaman feed lama ke feed baru', async () => {
		let base = $state.raw(feed(['a'], 'c1'));
		let release: (o: PageActionOutcome<AnnouncementFeed>) => void = () => {};
		const pager = createFeedPager(
			() => base,
			() => new Promise((r) => (release = r))
		);
		const pending = pager.loadMore();
		base = feed(['x'], 'c9'); // feed dimuat ulang selama menunggu
		release(ok(feed(['b'])));
		expect(await pending).toBe(false);
		expect(pager.items.map((i) => i.id)).toEqual(['x']);
		expect(pager.cursor).toBe('c9');
	});

	it('halaman tambahan lama tidak ikut setelah feed dimuat ulang', async () => {
		let base = $state(feed(['a'], 'c1'));
		const pager = createFeedPager(
			() => base,
			async () => ok(feed(['b']))
		);
		await pager.loadMore();
		expect(pager.items.map((i) => i.id)).toEqual(['a', 'b']);
		base = feed(['a', 'z'], 'c2');
		expect(pager.items.map((i) => i.id)).toEqual(['a', 'z']);
		expect(pager.cursor).toBe('c2');
	});
});
