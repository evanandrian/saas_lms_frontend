import type { RequestEvent } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Aksi Pengumuman: id/enum/kursor divalidasi sebelum diteruskan ke backend. */
vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('$env/dynamic/private', () => ({ env: { LMS_API_INTERNAL_URL: 'http://backend.test' } }));
type ApiCall = (...args: unknown[]) => Promise<typeof ok>;
const ok = { ok: true, data: { items: [], next_cursor: '' } };
const api = {
	fetchAnnouncements: vi.fn<ApiCall>(async () => ok),
	createAnnouncement: vi.fn<ApiCall>(async () => ok),
	updateAnnouncement: vi.fn<ApiCall>(async () => ok),
	deleteAnnouncement: vi.fn<ApiCall>(async () => ok),
	submitAnnouncement: vi.fn<ApiCall>(async () => ok),
	withdrawAnnouncement: vi.fn<ApiCall>(async () => ok),
	archiveAnnouncement: vi.fn<ApiCall>(async () => ok),
	fetchPendingAnnouncements: vi.fn<ApiCall>(async () => ok),
	approveAnnouncement: vi.fn<ApiCall>(async () => ok),
	rejectAnnouncement: vi.fn<ApiCall>(async () => ok),
	fetchFeed: vi.fn<ApiCall>(async () => ok)
};
vi.mock('$lib/features/announcements/announcements.api', () => api);

const { announcementAdminActions, announcementReviewActions, announcementFeedActions } =
	await import('$lib/features/announcements/announcements.server');

const ID = '11111111-1111-1111-1111-111111111111';
const DATA = {
	title: 'Libur semester',
	body: 'Sekolah libur mulai 20 Desember 2026.',
	audience: 'all'
};

function event(body: unknown): RequestEvent {
	const form = new FormData();
	form.set('body', JSON.stringify(body));
	return {
		fetch,
		cookies: { get: () => undefined },
		request: new Request('http://app.test/app/admin/announcements', { method: 'POST', body: form }),
		getClientAddress: () => '127.0.0.1'
	} as unknown as RequestEvent;
}

type Run = (e: RequestEvent) => Promise<unknown>;
const run = (actions: Record<string, unknown>, name: string, body: unknown) =>
	(actions[name] as Run)(event(body));
const status = (out: unknown) => (out as { status?: number }).status;

describe('announcementAdminActions', () => {
	beforeEach(() => Object.values(api).forEach((fn) => fn.mockClear()));

	it('list: status dikenal diteruskan, status asing diabaikan, kursor kosong bila bukan string', async () => {
		await run(announcementAdminActions, 'list', { status: 'pending', cursor: 'abc' });
		expect(api.fetchAnnouncements.mock.calls[0]?.slice(1)).toEqual(['pending', 'abc']);
		await run(announcementAdminActions, 'list', { status: 'deleted', cursor: 5 });
		expect(api.fetchAnnouncements.mock.calls[1]?.slice(1)).toEqual([undefined, '']);
	});

	it('save: tanpa id → buat; id valid → ubah; id rusak → 400 tanpa panggilan', async () => {
		await run(announcementAdminActions, 'save', { id: '', data: DATA });
		expect(api.createAnnouncement).toHaveBeenCalledTimes(1);
		await run(announcementAdminActions, 'save', { id: ID, data: DATA });
		expect(api.updateAnnouncement.mock.calls[0]?.slice(1)).toEqual([ID, DATA]);
		expect(status(await run(announcementAdminActions, 'save', { id: 'x', data: DATA }))).toBe(400);
		expect(status(await run(announcementAdminActions, 'save', { id: '' }))).toBe(400);
	});

	it('transisi & arsip butuh id valid; arsip butuh alasan string', async () => {
		for (const name of ['remove', 'submit', 'withdraw'])
			expect(status(await run(announcementAdminActions, name, { id: 'bukan-uuid' }))).toBe(400);
		expect(status(await run(announcementAdminActions, 'archive', { id: ID }))).toBe(400);
		await run(announcementAdminActions, 'archive', { id: ID, reason: 'Sudah kedaluwarsa' });
		expect(api.archiveAnnouncement.mock.calls[0]?.slice(1)).toEqual([ID, 'Sudah kedaluwarsa']);
	});
});

describe('announcementReviewActions & feed', () => {
	beforeEach(() => Object.values(api).forEach((fn) => fn.mockClear()));

	it('setujui: catatan opsional; tolak: alasan harus enum', async () => {
		await run(announcementReviewActions, 'announcementApprove', { id: ID });
		expect(api.approveAnnouncement.mock.calls[0]?.slice(1)).toEqual([ID, '']);
		expect(
			status(await run(announcementReviewActions, 'announcementApprove', { id: ID, note: 5 }))
		).toBe(400);
		expect(
			status(
				await run(announcementReviewActions, 'announcementReject', { id: ID, reasonCode: 'spam' })
			)
		).toBe(400);
		await run(announcementReviewActions, 'announcementReject', {
			id: ID,
			reasonCode: 'other',
			note: 'Tanggal salah'
		});
		expect(api.rejectAnnouncement.mock.calls[0]?.slice(1)).toEqual([ID, 'other', 'Tanggal salah']);
	});

	it('feedMore: kursor terlalu panjang dibuang', async () => {
		await run(announcementFeedActions, 'feedMore', { cursor: 'x'.repeat(500) });
		expect(api.fetchFeed.mock.calls[0]?.slice(1)).toEqual(['']);
	});
});
