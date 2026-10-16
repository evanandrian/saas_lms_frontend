import type { BackendFailure } from '$lib/api/backend-call';
import type {
	AnnouncementFeed,
	SchoolAnnouncement,
	SchoolAnnouncementInput
} from '$lib/api/generated/lms';
import { action, context, validId } from '$lib/features/school-admin/school-admin.server';
import type { Actions, RequestEvent } from '@sveltejs/kit';
import * as api from './announcements.api';
import {
	ANNOUNCEMENT_STATUSES,
	CURSOR_MAX,
	REJECT_REASONS,
	type AnnouncementStatus,
	type RejectReason
} from './announcements.model';

/**
 * Load & form action Pengumuman. Aksi dipanggil lewat `runPageAction` (`?/<nama>`, body JSON); bentuk body
 * divalidasi minimal di sini (id UUID, enum, string), aturan bisnis & peran di backend.
 */

type Body = {
	id?: unknown;
	status?: unknown;
	cursor?: unknown;
	data?: SchoolAnnouncementInput;
	reason?: unknown;
	note?: unknown;
	reasonCode?: unknown;
};

const isStatus = (v: unknown): v is AnnouncementStatus =>
	ANNOUNCEMENT_STATUSES.includes(v as AnnouncementStatus);
const isReason = (v: unknown): v is RejectReason => REJECT_REASONS.includes(v as RejectReason);
const cursorOf = (v: unknown) => (typeof v === 'string' && v.length <= CURSOR_MAX ? v : '');
const optionalText = (v: unknown) => (v === undefined ? '' : typeof v === 'string' ? v : null);

/** Halaman admin `/app/admin/announcements`. */
export const announcementAdminActions: Actions = {
	list: action<Body>((ctx, b) =>
		api.fetchAnnouncements(ctx, isStatus(b.status) ? b.status : undefined, cursorOf(b.cursor))
	),
	save: action<Body>((ctx, b) => {
		if (!b.data || typeof b.data !== 'object') return null;
		if (b.id === undefined || b.id === '') return api.createAnnouncement(ctx, b.data);
		return validId(b.id) ? api.updateAnnouncement(ctx, b.id, b.data) : null;
	}),
	remove: action<Body>((ctx, b) => (validId(b.id) ? api.deleteAnnouncement(ctx, b.id) : null)),
	submit: action<Body>((ctx, b) => (validId(b.id) ? api.submitAnnouncement(ctx, b.id) : null)),
	withdraw: action<Body>((ctx, b) => (validId(b.id) ? api.withdrawAnnouncement(ctx, b.id) : null)),
	archive: action<Body>((ctx, b) =>
		validId(b.id) && typeof b.reason === 'string'
			? api.archiveAnnouncement(ctx, b.id, b.reason)
			: null
	)
};

/** Kotak Persetujuan kepala sekolah (digabung dengan aksi pengajuan akun). */
export const announcementReviewActions: Actions = {
	announcementsPending: action((ctx) => api.fetchPendingAnnouncements(ctx)),
	announcementApprove: action<Body>((ctx, b) => {
		const note = optionalText(b.note);
		return validId(b.id) && note !== null ? api.approveAnnouncement(ctx, b.id, note) : null;
	}),
	announcementReject: action<Body>((ctx, b) => {
		const note = optionalText(b.note);
		return validId(b.id) && isReason(b.reasonCode) && note !== null
			? api.rejectAnnouncement(ctx, b.id, b.reasonCode, note)
			: null;
	})
};

/** Halaman penerima (orang tua, murid, guru): halaman feed berikutnya. */
export const announcementFeedActions: Actions = {
	feedMore: action<Body>((ctx, b) => api.fetchFeed(ctx, cursorOf(b.cursor)))
};

/** Feed halaman pertama; gagal → `feed: null` + alasan (kartu menampilkan galat, bukan data contoh). */
export async function loadFeed(
	event: RequestEvent
): Promise<{ feed: AnnouncementFeed | null; feedFailure: BackendFailure | null }> {
	const result = await api.fetchFeed(context(event), '');
	return result.ok
		? { feed: result.data, feedFailure: null }
		: { feed: null, feedFailure: result.reason };
}

/** Pengumuman menunggu untuk kepala sekolah; selain kepala sekolah / gagal → null. */
export async function loadPendingAnnouncements(
	event: RequestEvent,
	isPrincipal: boolean
): Promise<SchoolAnnouncement[] | null> {
	if (!isPrincipal) return null;
	const result = await api.fetchPendingAnnouncements(context(event));
	return result.ok ? result.data.items : null;
}
