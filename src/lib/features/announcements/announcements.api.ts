import {
	approveSchoolAnnouncement,
	archiveSchoolAnnouncement,
	createSchoolAnnouncement,
	deleteSchoolAnnouncement,
	getAnnouncementFeed,
	getSchoolAnnouncementAudienceOptions,
	listPendingSchoolAnnouncements,
	listSchoolAnnouncements,
	rejectSchoolAnnouncement,
	submitSchoolAnnouncement,
	updateSchoolAnnouncement,
	withdrawSchoolAnnouncement,
	type AnnouncementFeed,
	type SchoolAnnouncement,
	type SchoolAnnouncementAudienceOptions,
	type SchoolAnnouncementInput,
	type SchoolAnnouncementPendingView,
	type SchoolAnnouncementRejectReason,
	type SchoolAnnouncementStatus,
	type SchoolAnnouncementsView
} from '$lib/api/generated/lms';
import { callBackend, type BackendContext } from '$lib/api/backend-call';

/**
 * Feature API Pengumuman (Admin Sekolah Fase 3) — server-only. Peran diverifikasi backend: admin sekolah
 * menulis & mengelola, kepala sekolah meninjau, semua anggota tenant membaca feed.
 */
type Ctx = BackendContext;

export const fetchAnnouncements = (
	ctx: Ctx,
	status: SchoolAnnouncementStatus | undefined,
	cursor: string
) =>
	callBackend<SchoolAnnouncementsView>(ctx, (init) =>
		listSchoolAnnouncements({ status, cursor: cursor || undefined }, init)
	);
export const fetchAudienceOptions = (ctx: Ctx) =>
	callBackend<SchoolAnnouncementAudienceOptions>(ctx, (init) =>
		getSchoolAnnouncementAudienceOptions(init)
	);
export const createAnnouncement = (ctx: Ctx, body: SchoolAnnouncementInput) =>
	callBackend<SchoolAnnouncement>(ctx, (init) => createSchoolAnnouncement(body, init));
export const updateAnnouncement = (ctx: Ctx, id: string, body: SchoolAnnouncementInput) =>
	callBackend<SchoolAnnouncement>(ctx, (init) => updateSchoolAnnouncement(id, body, init));
/** 204 tanpa data. */
export const deleteAnnouncement = (ctx: Ctx, id: string) =>
	callBackend<undefined>(ctx, (init) => deleteSchoolAnnouncement(id, init));
export const submitAnnouncement = (ctx: Ctx, id: string) =>
	callBackend<SchoolAnnouncement>(ctx, (init) => submitSchoolAnnouncement(id, init));
export const withdrawAnnouncement = (ctx: Ctx, id: string) =>
	callBackend<SchoolAnnouncement>(ctx, (init) => withdrawSchoolAnnouncement(id, init));
export const archiveAnnouncement = (ctx: Ctx, id: string, reason: string) =>
	callBackend<SchoolAnnouncement>(ctx, (init) => archiveSchoolAnnouncement(id, { reason }, init));

// ===== Kepala sekolah =====
export const fetchPendingAnnouncements = (ctx: Ctx) =>
	callBackend<SchoolAnnouncementPendingView>(ctx, (init) => listPendingSchoolAnnouncements(init));
export const approveAnnouncement = (ctx: Ctx, id: string, note: string) =>
	callBackend<SchoolAnnouncement>(ctx, (init) => approveSchoolAnnouncement(id, { note }, init));
export const rejectAnnouncement = (
	ctx: Ctx,
	id: string,
	reasonCode: SchoolAnnouncementRejectReason,
	note: string
) =>
	callBackend<SchoolAnnouncement>(ctx, (init) =>
		rejectSchoolAnnouncement(id, { reason_code: reasonCode, note }, init)
	);

// ===== Feed penerima (guru, murid, orang tua) =====
export const fetchFeed = (ctx: Ctx, cursor: string) =>
	callBackend<AnnouncementFeed>(ctx, (init) =>
		getAnnouncementFeed({ cursor: cursor || undefined }, init)
	);
