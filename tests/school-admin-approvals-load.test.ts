import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	loadApprovalsPage: vi.fn(),
	loadPendingAnnouncements: vi.fn()
}));

vi.mock('$lib/features/approvals/approvals.server', () => ({
	approvalsActions: () => ({}),
	loadApprovalsPage: mocks.loadApprovalsPage
}));
vi.mock('$lib/features/announcements/announcements.server', () => ({
	announcementReviewActions: {},
	loadPendingAnnouncements: mocks.loadPendingAnnouncements
}));

import { load } from '../src/routes/(school)/app/admin/approvals/+page.server';

/** Kotak Persetujuan: data halaman dimuat paralel dengan layout; pengumuman menunggu dari layout. */
describe('load Kotak Persetujuan admin sekolah', () => {
	it('memuat halaman tanpa menunggu layout dan memakai ulang pengumuman menunggu dari layout', async () => {
		let resolveParent!: (v: unknown) => void;
		const parent = new Promise((r) => (resolveParent = r));
		mocks.loadApprovalsPage.mockResolvedValue({ view: { items: [] }, failure: null });
		const event = { parent: () => parent };

		const result = load(event as never);
		await Promise.resolve();
		// Paralel: halaman sudah dimuat sebelum data layout tersedia.
		expect(mocks.loadApprovalsPage).toHaveBeenCalledWith(event, 'school_admin');

		resolveParent({ pendingAnnouncements: [{ id: 'a' }] });
		const data = (await result) as unknown as { announcements: unknown; view: unknown };
		expect(data.announcements).toEqual([{ id: 'a' }]);
		expect(data.view).toEqual({ items: [] });
		expect(mocks.loadPendingAnnouncements).not.toHaveBeenCalled();
	});
});
