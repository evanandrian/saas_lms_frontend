import {
	backendFailure,
	relayFile,
	type BackendContext,
	type BackendFailure,
	type BackendResult
} from '$lib/api/backend-call';
import type {
	SchoolAssessmentsInput,
	SchoolAssignmentInput,
	SchoolAttendanceInput,
	SchoolClassInput,
	SchoolClassesInput,
	SchoolExtraInput,
	SchoolGradeEntry,
	SchoolGuardianInput,
	SchoolNoteEntry,
	SchoolImportFile,
	SchoolImportRequest,
	SchoolLogoInput,
	SchoolObjectiveInput,
	SchoolPeriodsInput,
	SchoolProfileInput,
	SchoolScheduleCellInput,
	SchoolStudentInput,
	SchoolSubjectsInput,
	SchoolTeacherInput,
	SchoolYearInput
} from '$lib/api/generated/lms';
import { throwIfTenantMaintenance } from '$lib/api/tenant-maintenance';
import { clientMeta } from '$lib/auth/finish-login';
import { APP_PATHS } from '$lib/utils/app-paths';
import { fail, redirect, type Actions, type RequestEvent } from '@sveltejs/kit';
import * as api from './school-admin.api';
import type { ImportKind, InviteKind } from './school-admin.api';
import {
	AUDIT_ACTOR_ROLES,
	AUDIT_CATEGORIES,
	AUDIT_EXPORT_ERROR_PARAM,
	AUDIT_QUERY_MAX,
	PROGRESS_DEPENDENCY_KEY,
	auditExportErrorCode,
	auditExportQuery,
	gradeMembersPayload,
	type AuditActorRole,
	type AuditCategory
} from './school-admin.model';

/**
 * Load & form action Admin Sekolah. Aksi dipanggil lewat `runPageAction` (`?/<nama>`, body JSON);
 * hasil sukses = tampilan terbaru dari backend sehingga halaman selalu sinkron tanpa reload.
 */

/** Status HTTP `fail()` per alasan kegagalan backend (dipakai juga halaman undangan akun). */
export const HTTP_STATUS_BY_FAILURE: Record<BackendFailure, number> = {
	unauthenticated: 401,
	forbidden: 403,
	not_found: 404,
	conflict: 409,
	validation: 422,
	gone: 410,
	too_many: 429,
	unavailable: 503
};
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
const IMPORT_KINDS: readonly ImportKind[] = [
	'classes',
	'subjects',
	'teachers',
	'students',
	'guardians'
];
const INVITE_KINDS: readonly InviteKind[] = ['teachers', 'students', 'guardians'];

export function context(event: RequestEvent): BackendContext {
	return {
		fetch: event.fetch,
		cookies: event.cookies,
		userAgent: event.request.headers.get('user-agent') ?? '',
		clientAddress: clientMeta(event).address
	};
}

/** Bentuk UUID (validasi parameter rute & body aksi). */
export const validId = (v: unknown): v is string => typeof v === 'string' && UUID_PATTERN.test(v);
const optionalId = (v: unknown) => (validId(v) ? v : '');
const isImportKind = (v: unknown): v is ImportKind => IMPORT_KINDS.includes(v as ImportKind);
const isInviteKind = (v: unknown): v is InviteKind => INVITE_KINDS.includes(v as InviteKind);

async function readBody<T>(event: RequestEvent): Promise<T | null> {
	try {
		const form = await event.request.formData();
		const body: unknown = JSON.parse(String(form.get('body') ?? 'null'));
		return body && typeof body === 'object' ? (body as T) : null;
	} catch {
		return null;
	}
}

function failWith(result: Exclude<BackendResult<unknown>, { ok: true }>) {
	return fail(HTTP_STATUS_BY_FAILURE[result.reason], {
		reason: result.reason,
		code: result.code,
		issues: result.issues,
		remaining: result.remaining,
		retryAt: result.retryAt
	});
}

const invalidBody = () =>
	fail(400, {
		reason: 'validation' as BackendFailure,
		code: 'invalid_request',
		issues: [],
		remaining: null,
		retryAt: null
	});

/** Aksi generik: validasi bentuk minimal di sini, aturan bisnis di backend (dipakai juga feature pengumuman). */
export function action<B extends object>(
	run: (ctx: BackendContext, body: B) => Promise<BackendResult<unknown>> | null
) {
	return async (event: RequestEvent) => {
		const body = (await readBody<B>(event)) ?? ({} as B);
		const pending = run(context(event), body);
		if (!pending) return invalidBody();
		const result = await pending;
		if (!result.ok) return failWith(result);
		return { result: result.data };
	};
}

type WithId = { id?: string };
type Payload<T> = WithId & { data?: T };

/** Muat data halaman; kegagalan dikembalikan sebagai alasan stabil untuk StatePanel. */
export async function loadView<T>(
	event: RequestEvent,
	fetcher: (ctx: BackendContext) => Promise<BackendResult<T>>
): Promise<{ view: T | null; failure: BackendFailure | null }> {
	const result = await fetcher(context(event));
	if (result.ok) return { view: result.data, failure: null };
	if (result.reason === 'unauthenticated') redirect(303, APP_PATHS.LOGIN);
	throwIfTenantMaintenance(result);
	return { view: null, failure: result.reason };
}

/** Status 12 bagian untuk banner celah data (layout admin); gagal → null (banner tidak tampil). */
export const PROGRESS_DEPENDENCY = PROGRESS_DEPENDENCY_KEY;
export async function loadProgress(
	event: RequestEvent & { depends: (...deps: `${string}:${string}`[]) => void }
) {
	event.depends(PROGRESS_DEPENDENCY);
	const result = await api.fetchProgress(context(event));
	return result.ok ? result.data : null;
}

// ===== Aksi impor & undangan (dipakai beberapa halaman) =====
type ImportBody<T = undefined> = { kind?: string } & (T extends undefined ? object : T);

export const importActions: Actions = {
	importSpec: action<ImportBody>((ctx, b) =>
		isImportKind(b.kind) ? api.fetchImportSpec(ctx, b.kind) : null
	),
	importParse: action<ImportBody<{ file?: SchoolImportFile }>>((ctx, b) =>
		isImportKind(b.kind) && b.file ? api.parseImport(ctx, b.kind, b.file) : null
	),
	importPreview: action<ImportBody<{ request?: SchoolImportRequest }>>((ctx, b) =>
		isImportKind(b.kind) && b.request ? api.previewImport(ctx, b.kind, b.request) : null
	),
	importCommit: action<ImportBody<{ request?: SchoolImportRequest }>>((ctx, b) =>
		isImportKind(b.kind) && b.request ? api.commitImport(ctx, b.kind, b.request) : null
	),
	invite: action<{ kind?: string; ids?: string[] }>((ctx, b) =>
		isInviteKind(b.kind) && Array.isArray(b.ids) && b.ids.every(validId)
			? api.invite(ctx, b.kind, b.ids)
			: null
	),
	/** Progres undangan massal (> 50 akun diproses worker). */
	inviteJob: action<WithId>((ctx, b) => (validId(b.id) ? api.fetchInviteJob(ctx, b.id) : null))
};

// ===== Halaman =====
export const yearsActions: Actions = {
	detail: action<WithId>((ctx, b) => (validId(b.id) ? api.fetchYear(ctx, b.id) : null)),
	save: action<Payload<SchoolYearInput>>((ctx, b) =>
		b.data ? api.saveYear(ctx, optionalId(b.id), b.data) : null
	),
	remove: action<WithId>((ctx, b) => (validId(b.id) ? api.deleteYear(ctx, b.id) : null))
};

export const classesActions: Actions = {
	...importActions,
	detail: action<WithId>((ctx, b) => (validId(b.id) ? api.fetchClass(ctx, b.id) : null)),
	save: action<Payload<SchoolClassInput>>((ctx, b) =>
		b.data ? api.saveClass(ctx, optionalId(b.id), b.data) : null
	),
	remove: action<WithId>((ctx, b) => (validId(b.id) ? api.deleteClass(ctx, b.id) : null)),
	refresh: action((ctx) => api.fetchClasses(ctx))
};

export const teachersActions: Actions = {
	...importActions,
	detail: action<WithId>((ctx, b) => (validId(b.id) ? api.fetchTeacher(ctx, b.id) : null)),
	save: action<Payload<SchoolTeacherInput>>((ctx, b) =>
		b.data ? api.saveTeacher(ctx, optionalId(b.id), b.data) : null
	),
	remove: action<WithId>((ctx, b) => (validId(b.id) ? api.deleteTeacher(ctx, b.id) : null)),
	refresh: action((ctx) => api.fetchTeachers(ctx))
};

export const studentsActions: Actions = {
	...importActions,
	save: action<Payload<SchoolStudentInput>>((ctx, b) =>
		b.data ? api.saveStudent(ctx, optionalId(b.id), b.data) : null
	),
	remove: action<WithId>((ctx, b) => (validId(b.id) ? api.deleteStudent(ctx, b.id) : null)),
	refresh: action((ctx) => api.fetchStudents(ctx)),
	addSeats: action<{ seats?: number }>((ctx, b) =>
		typeof b.seats === 'number' ? api.addSeats(ctx, b.seats) : null
	)
};

export const guardiansActions: Actions = {
	...importActions,
	save: action<Payload<SchoolGuardianInput>>((ctx, b) =>
		b.data ? api.saveGuardian(ctx, optionalId(b.id), b.data) : null
	),
	remove: action<WithId>((ctx, b) => (validId(b.id) ? api.deleteGuardian(ctx, b.id) : null)),
	unlink: action<WithId & { studentId?: string }>((ctx, b) =>
		validId(b.id) && validId(b.studentId) ? api.unlinkGuardian(ctx, b.id, b.studentId) : null
	),
	refresh: action((ctx) => api.fetchGuardians(ctx))
};

type RemindBody = { classId?: string };
const remindAttendanceAction = action<RemindBody>((ctx, b) =>
	b.classId === undefined || validId(b.classId) ? api.remindAttendance(ctx, b.classId) : null
);

export const attendanceActions: Actions = {
	remind: remindAttendanceAction
};

type RemindReportBody = WithId & { message?: string; recipientIds?: string[] };

export const reportsActions: Actions = {
	pending: action<WithId>((ctx, b) => (validId(b.id) ? api.fetchReportPending(ctx, b.id) : null)),
	remind: action<RemindReportBody>((ctx, b) => {
		if (!validId(b.id)) return null;
		if (b.message !== undefined && typeof b.message !== 'string') return null;
		if (
			b.recipientIds !== undefined &&
			!(Array.isArray(b.recipientIds) && b.recipientIds.every((id) => validId(id)))
		)
			return null;
		return api.remindReport(ctx, b.id, {
			...(b.message ? { message: b.message } : {}),
			...(b.recipientIds ? { recipient_ids: b.recipientIds } : {})
		});
	})
};

type ReasonBody = WithId & { reason?: string };
const reasonOf = (b: ReasonBody) => (typeof b.reason === 'string' ? b.reason : null);

/** Tinjauan rapor kelas (admin & kepala sekolah); aturan peran & status di backend. */
export const classReportActions: Actions = {
	detail: action<WithId>((ctx, b) => (validId(b.id) ? api.fetchClassReport(ctx, b.id) : null)),
	approve: action<WithId>((ctx, b) => (validId(b.id) ? api.approveReport(ctx, b.id) : null)),
	return: action<ReasonBody>((ctx, b) =>
		validId(b.id) && reasonOf(b) !== null ? api.returnReport(ctx, b.id, reasonOf(b)!) : null
	),
	lock: action<WithId>((ctx, b) => (validId(b.id) ? api.lockReport(ctx, b.id) : null)),
	unlock: action<ReasonBody>((ctx, b) =>
		validId(b.id) && reasonOf(b) !== null ? api.unlockReport(ctx, b.id, reasonOf(b)!) : null
	)
};

/** Nilai akhir guru mapel. */
export const gradeActions: Actions = {
	save: action<WithId & { entries?: SchoolGradeEntry[] }>((ctx, b) =>
		validId(b.id) && Array.isArray(b.entries)
			? api.saveGrades(ctx, b.id, { entries: b.entries })
			: null
	),
	lock: action<WithId>((ctx, b) => (validId(b.id) ? api.lockGrades(ctx, b.id) : null))
};

/** Rapor kelas perwalian (wali kelas). */
export const homeroomReportActions: Actions = {
	notes: action<{ entries?: SchoolNoteEntry[] }>((ctx, b) =>
		Array.isArray(b.entries) ? api.saveReportNotes(ctx, { entries: b.entries }) : null
	),
	submit: action((ctx) => api.submitReport(ctx))
};

type AuditBody = {
	category?: string;
	from?: string;
	to?: string;
	q?: string;
	actorRole?: string;
	before?: string;
};
const asCategory = (v: unknown) =>
	AUDIT_CATEGORIES.includes(v as AuditCategory) ? (v as AuditCategory) : undefined;
const asActorRole = (v: unknown) =>
	AUDIT_ACTOR_ROLES.includes(v as AuditActorRole) ? (v as AuditActorRole) : undefined;

/** Riwayat perubahan: muat halaman berikutnya / filter / cari. */
export const auditActions: Actions = {
	list: action<AuditBody>((ctx, b) =>
		api.fetchAudit(ctx, {
			category: asCategory(b.category),
			from: b.from || undefined,
			to: b.to || undefined,
			q: typeof b.q === 'string' && b.q.trim() ? b.q.trim().slice(0, AUDIT_QUERY_MAX) : undefined,
			actor_role: asActorRole(b.actorRole),
			before: b.before || undefined
		})
	)
};

export const subscriptionActions: Actions = {
	addSeats: action<{ seats?: number }>((ctx, b) =>
		typeof b.seats === 'number' ? api.addSeats(ctx, b.seats) : null
	)
};

export const activationActions: Actions = {
	activate: action<{ plan_code?: string; seats?: number }>((ctx, b) =>
		typeof b.plan_code === 'string' && typeof b.seats === 'number'
			? api.activate(ctx, { plan_code: b.plan_code, seats: b.seats })
			: null
	)
};

export const dashboardActions: Actions = {
	remindAttendance: remindAttendanceAction,
	dashboard: action((ctx) => api.fetchDashboard(ctx))
};

export const setupActions: Actions = {
	...importActions,
	profile: action<{ data?: SchoolProfileInput }>((ctx, b) =>
		b.data ? api.saveProfile(ctx, b.data) : null
	),
	logo: action<{ data?: SchoolLogoInput }>((ctx, b) => (b.data ? api.saveLogo(ctx, b.data) : null)),
	curriculum: action<{ code?: string }>((ctx, b) =>
		typeof b.code === 'string' ? api.saveCurriculum(ctx, b.code) : null
	),
	year: action<{ data?: SchoolYearInput }>((ctx, b) =>
		b.data ? api.saveSetupYear(ctx, b.data) : null
	),
	classes: action<{ data?: SchoolClassesInput }>((ctx, b) =>
		b.data ? api.saveSetupClasses(ctx, b.data) : null
	),
	subjects: action<{ data?: SchoolSubjectsInput }>((ctx, b) =>
		b.data ? api.saveSetupSubjects(ctx, b.data) : null
	),
	setup: action((ctx) => api.fetchSetup(ctx)),
	planning: action((ctx) => api.fetchPlanning(ctx)),
	homeroom: action<WithId & { teacherId?: string }>((ctx, b) =>
		validId(b.id) ? api.setHomeroom(ctx, b.id, { teacher_id: optionalId(b.teacherId) }) : null
	),
	assignment: action<{ data?: SchoolAssignmentInput }>((ctx, b) =>
		b.data ? api.setAssignment(ctx, b.data) : null
	),
	objectiveAdd: action<{ data?: SchoolObjectiveInput }>((ctx, b) =>
		b.data ? api.addObjective(ctx, b.data) : null
	),
	objectiveRemove: action<WithId>((ctx, b) =>
		validId(b.id) ? api.deleteObjective(ctx, b.id) : null
	),
	objectiveUpdate: action<WithId & { description?: string }>((ctx, b) =>
		validId(b.id) && typeof b.description === 'string'
			? api.updateObjective(ctx, b.id, { description: b.description })
			: null
	),
	assessments: action<{ data?: SchoolAssessmentsInput }>((ctx, b) =>
		b.data ? api.saveAssessments(ctx, b.data) : null
	),
	periods: action<{ data?: SchoolPeriodsInput }>((ctx, b) =>
		b.data ? api.savePeriods(ctx, b.data) : null
	),
	scheduleCell: action<{ data?: SchoolScheduleCellInput }>((ctx, b) =>
		b.data ? api.setScheduleCell(ctx, b.data) : null
	),
	extraSave: action<Payload<SchoolExtraInput>>((ctx, b) =>
		b.data ? api.saveExtra(ctx, optionalId(b.id), b.data) : null
	),
	extraRemove: action<WithId>((ctx, b) => (validId(b.id) ? api.deleteExtra(ctx, b.id) : null)),
	teachers: action((ctx) => api.fetchTeachers(ctx)),
	students: action((ctx) => api.fetchStudents(ctx))
};

/** Halaman Mapel & TP: daftar mapel (setup) + TP (perencanaan), memakai aksi setup yang sama. */
const SUBJECTS_PAGE_ACTIONS = [
	'subjects',
	'planning',
	'objectiveAdd',
	'objectiveRemove',
	'objectiveUpdate'
] as const;
export const subjectsPageActions: Actions = Object.fromEntries(
	SUBJECTS_PAGE_ACTIONS.map((name) => [name, setupActions[name]!])
);

/** Halaman Penugasan mengajar (per kelas langsung tersimpan). */
export const assignmentsPageActions: Actions = {
	assignment: setupActions.assignment!
};

/** Halaman Asesmen & bobot. */
export const assessmentsPageActions: Actions = {
	assessments: setupActions.assessments!
};

type MembersAddBody = WithId & {
	studentIds?: unknown;
	classId?: unknown;
	gradeLevelIds?: unknown;
	allStudents?: unknown;
};

/** Halaman Ekstrakurikuler: data ekskul (perencanaan) + anggota per tahun ajaran aktif. */
export const extrasPageActions: Actions = {
	planning: setupActions.planning!,
	extraSave: setupActions.extraSave!,
	extraRemove: setupActions.extraRemove!,
	students: setupActions.students!,
	extraMembers: action<WithId>((ctx, b) =>
		validId(b.id) ? api.fetchExtraMembers(ctx, b.id) : null
	),
	extraMembersAdd: action<MembersAddBody>((ctx, b) => {
		if (!validId(b.id)) return null;
		// Daftar murid eksplisit (bukan "semua"): bila dikirim harus array berisi id valid.
		let ids: string[] = [];
		if (b.studentIds !== undefined) {
			if (!Array.isArray(b.studentIds) || !b.studentIds.every(validId)) return null;
			ids = b.studentIds;
		}
		let classId = '';
		if (b.classId !== undefined) {
			if (!validId(b.classId)) return null;
			classId = b.classId;
		}
		// Per tingkat / semua murid (ekskul wajib; backend memvalidasi): bentuk harus tepat bila dikirim.
		let gradeLevelIds: string[] = [];
		if (b.gradeLevelIds !== undefined) {
			if (!Array.isArray(b.gradeLevelIds) || !b.gradeLevelIds.every(validId)) return null;
			gradeLevelIds = b.gradeLevelIds;
		}
		if (b.allStudents !== undefined && typeof b.allStudents !== 'boolean') return null;
		const byGrade = gradeMembersPayload({ gradeLevelIds, allStudents: b.allStudents === true });
		if (!ids.length && !classId && !byGrade) return null;
		return api.addExtraMembers(ctx, b.id, {
			...(ids.length ? { student_ids: ids } : {}),
			...(classId ? { class_id: classId } : {}),
			...byGrade
		});
	}),
	extraMemberRemove: action<WithId & { studentId?: string }>((ctx, b) =>
		validId(b.id) && validId(b.studentId) ? api.removeExtraMember(ctx, b.id, b.studentId) : null
	)
};

export const homeroomAttendanceActions: Actions = {
	save: action<{ data?: SchoolAttendanceInput }>((ctx, b) =>
		b.data ? api.saveHomeroomAttendanceEntries(ctx, b.data) : null
	)
};

// ===== Berkas =====
export async function proxyImportTemplate(event: RequestEvent, kind: string, format: string) {
	if (!isImportKind(kind)) return new Response(null, { status: 404 });
	return relayFile(
		await api.fetchImportTemplate(context(event), kind, format === 'csv' ? 'csv' : 'xlsx')
	);
}

/** Unduh PDF rapor kelas (semua murid) atau satu murid (`student`); hanya rapor terkunci. */
export async function proxyReportPdf(event: RequestEvent, classId: string, studentId: string) {
	if (!validId(classId) || (studentId && !validId(studentId))) {
		return new Response('Not found', { status: 404 });
	}
	return relayFile(await api.fetchReportPdf(context(event), classId, studentId));
}

/** Unduh PDF rapor terbit milik murid sendiri / anak tertaut (`?id=<reportId>`). */
export async function proxyLearnerReportPdf(event: RequestEvent, reportId: string) {
	if (!validId(reportId)) return new Response('Not found', { status: 404 });
	return relayFile(await api.fetchLearnerReportPdf(context(event), reportId));
}

/**
 * Unduh CSV riwayat (backend mencatat `export.audit_log`); token tetap di cookie HttpOnly.
 * Galat backend (non-2xx, JSON sebelum byte CSV pertama) tidak diteruskan sebagai berkas: kembali ke
 * halaman riwayat dengan `?export_error=<kode>` agar halaman menampilkan Toast i18n (PF7).
 */
export async function proxyAuditExport(event: RequestEvent) {
	const p = event.url.searchParams;
	const query = auditExportQuery({
		category: asCategory(p.get('category')) ?? '',
		from: p.get('from') ?? '',
		to: p.get('to') ?? '',
		q: p.get('q') ?? '',
		actorRole: asActorRole(p.get('actor_role')) ?? ''
	});
	const upstream = await api.fetchAuditExport(context(event), query);
	if (upstream?.ok) return relayFile(upstream);
	const code = upstream
		? auditExportErrorCode(backendFailure(upstream.status, await upstream.json().catch(() => null)))
		: 'unauthenticated';
	redirect(
		303,
		`${APP_PATHS.SCHOOL_ADMIN_AUDIT}?${new URLSearchParams({ [AUDIT_EXPORT_ERROR_PARAM]: code })}`
	);
}

export async function proxyLogo(event: RequestEvent) {
	return relayFile(await api.fetchLogo(context(event)));
}
