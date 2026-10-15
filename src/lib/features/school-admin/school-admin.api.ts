import {
	acceptSchoolInvitation,
	approveSchoolClassReport,
	getHomeroomReport,
	getLearnerReports,
	getSchoolAudit,
	getSchoolClassReport,
	getSchoolInviteJob,
	getTeacherGradeAssignments,
	getTeacherGradeSheet,
	lockSchoolClassReport,
	lockTeacherGrades,
	returnSchoolClassReport,
	saveHomeroomReportNotes,
	saveTeacherGrades,
	submitHomeroomReport,
	unlockSchoolClassReport,
	type GetSchoolAuditParams,
	type LearnerReportsView,
	type SchoolAuditView,
	type SchoolClassReport,
	type SchoolGradeAssignmentsView,
	type SchoolGradeSheet,
	type SchoolGradesInput,
	type SchoolInviteJob,
	type SchoolNotesInput,
	activateSchoolStudent,
	addSchoolObjective,
	activateSchoolSubscription,
	addSchoolSeats,
	commitSchoolImport,
	createSchoolClass,
	createSchoolExtra,
	createSchoolGuardian,
	createSchoolStudent,
	createSchoolTeacher,
	createSchoolYear,
	deleteSchoolClass,
	deleteSchoolExtra,
	deleteSchoolGuardian,
	deleteSchoolObjective,
	deleteSchoolStudent,
	deleteSchoolTeacher,
	deleteSchoolYear,
	getHomeroomAttendance,
	getSchoolActivation,
	getSchoolAttendance,
	getSchoolClass,
	getSchoolDashboard,
	getSchoolImportSpec,
	getSchoolInvitation,
	getSchoolPlanning,
	getSchoolReports,
	getSchoolSetup,
	getSchoolSetupProgress,
	getSchoolSubscription,
	getSchoolTeacher,
	getSchoolYear,
	inviteSchoolAccounts,
	listSchoolClasses,
	listSchoolGuardians,
	listSchoolStudents,
	listSchoolTeachers,
	listSchoolYears,
	parseSchoolImport,
	previewSchoolImport,
	remindSchoolAttendance,
	remindSchoolReport,
	saveHomeroomAttendance,
	saveSchoolAssessments,
	saveSchoolPeriods,
	saveSchoolSetupClasses,
	saveSchoolSetupCurriculum,
	saveSchoolSetupLogo,
	saveSchoolSetupProfile,
	saveSchoolSetupSubjects,
	saveSchoolSetupYear,
	setSchoolAssignment,
	setSchoolHomeroom,
	setSchoolScheduleCell,
	unlinkSchoolGuardian,
	updateSchoolClass,
	updateSchoolExtra,
	updateSchoolGuardian,
	updateSchoolStudent,
	updateSchoolTeacher,
	updateSchoolYear,
	type SchoolAcceptInput,
	type SchoolActivationInput,
	type SchoolActivationResult,
	type SchoolActivationView,
	type SchoolActivateInput,
	type SchoolAssessmentsInput,
	type SchoolAssignmentInput,
	type SchoolAttendanceInput,
	type SchoolAttendanceView,
	type SchoolClassDetail,
	type SchoolClassInput,
	type SchoolClassesInput,
	type SchoolClassesView,
	type SchoolDashboardView,
	type SchoolExtraInput,
	type SchoolGuardianInput,
	type SchoolGuardiansView,
	type SchoolHomeroomAttendanceView,
	type SchoolHomeroomInput,
	type SchoolImportFile,
	type SchoolImportPreview,
	type SchoolImportRequest,
	type SchoolImportResult,
	type SchoolImportSpec,
	type SchoolInvitationInfo,
	type SchoolInviteResult,
	type SchoolLogoInput,
	type SchoolObjectiveInput,
	type SchoolParsedImport,
	type SchoolPeriodsInput,
	type SchoolPlanningView,
	type SchoolProgressView,
	type SchoolProfileInput,
	type SchoolReportsView,
	type SchoolScheduleCellInput,
	type SchoolSeatsResult,
	type SchoolSetupState,
	type SchoolStudentInput,
	type SchoolStudentsView,
	type SchoolSubjectsInput,
	type SchoolSubscriptionView,
	type SchoolTeacherDetail,
	type SchoolTeacherInput,
	type SchoolTeachersView,
	type SchoolYearDetail,
	type SchoolYearInput,
	type SchoolYearsView
} from '$lib/api/generated/lms';
import {
	callBackend,
	callPublic,
	fetchBackendFile,
	type BackendContext
} from '$lib/api/backend-call';

/**
 * Feature API Admin Sekolah (referensi v4 03b & 05a–05h) — server-only. Semua data dari
 * `/api/v1/school/*`; peran diverifikasi backend dari keanggotaan aktif.
 */
type Ctx = BackendContext;
type PublicCtx = Pick<BackendContext, 'fetch' | 'userAgent' | 'clientAddress'>;

export type ImportKind = 'classes' | 'subjects' | 'teachers' | 'students' | 'guardians';
export type InviteKind = 'teachers' | 'students' | 'guardians';

// ===== Dashboard & 03b =====
export const fetchDashboard = (ctx: Ctx) =>
	callBackend<SchoolDashboardView>(ctx, (init) => getSchoolDashboard(init));
export const fetchSetup = (ctx: Ctx) =>
	callBackend<SchoolSetupState>(ctx, (init) => getSchoolSetup(init));
export const fetchProgress = (ctx: Ctx) =>
	callBackend<SchoolProgressView>(ctx, (init) => getSchoolSetupProgress(init));
export const saveProfile = (ctx: Ctx, body: SchoolProfileInput) =>
	callBackend<SchoolSetupState>(ctx, (init) => saveSchoolSetupProfile(body, init));
export const saveLogo = (ctx: Ctx, body: SchoolLogoInput) =>
	callBackend<SchoolSetupState>(ctx, (init) => saveSchoolSetupLogo(body, init));
export const saveCurriculum = (ctx: Ctx, code: string) =>
	callBackend<SchoolSetupState>(ctx, (init) => saveSchoolSetupCurriculum({ code }, init));
export const saveSetupYear = (ctx: Ctx, body: SchoolYearInput) =>
	callBackend<SchoolSetupState>(ctx, (init) => saveSchoolSetupYear(body, init));
export const saveSetupClasses = (ctx: Ctx, body: SchoolClassesInput) =>
	callBackend<SchoolSetupState>(ctx, (init) => saveSchoolSetupClasses(body, init));
export const saveSetupSubjects = (ctx: Ctx, body: SchoolSubjectsInput) =>
	callBackend<SchoolSetupState>(ctx, (init) => saveSchoolSetupSubjects(body, init));
export const fetchLogo = (ctx: Ctx) => fetchBackendFile(ctx, '/api/v1/school/logo');

// ===== Data opsional 03b =====
export const fetchPlanning = (ctx: Ctx) =>
	callBackend<SchoolPlanningView>(ctx, (init) => getSchoolPlanning(init));
export const setHomeroom = (ctx: Ctx, classId: string, body: SchoolHomeroomInput) =>
	callBackend<SchoolPlanningView>(ctx, (init) => setSchoolHomeroom(classId, body, init));
export const setAssignment = (ctx: Ctx, body: SchoolAssignmentInput) =>
	callBackend<SchoolPlanningView>(ctx, (init) => setSchoolAssignment(body, init));
export const addObjective = (ctx: Ctx, body: SchoolObjectiveInput) =>
	callBackend<SchoolPlanningView>(ctx, (init) => addSchoolObjective(body, init));
export const deleteObjective = (ctx: Ctx, id: string) =>
	callBackend<SchoolPlanningView>(ctx, (init) => deleteSchoolObjective(id, init));
export const saveAssessments = (ctx: Ctx, body: SchoolAssessmentsInput) =>
	callBackend<SchoolPlanningView>(ctx, (init) => saveSchoolAssessments(body, init));
export const savePeriods = (ctx: Ctx, body: SchoolPeriodsInput) =>
	callBackend<SchoolPlanningView>(ctx, (init) => saveSchoolPeriods(body, init));
export const setScheduleCell = (ctx: Ctx, body: SchoolScheduleCellInput) =>
	callBackend<SchoolPlanningView>(ctx, (init) => setSchoolScheduleCell(body, init));
export const saveExtra = (ctx: Ctx, id: string, body: SchoolExtraInput) =>
	callBackend<SchoolPlanningView>(ctx, (init) =>
		id ? updateSchoolExtra(id, body, init) : createSchoolExtra(body, init)
	);
export const deleteExtra = (ctx: Ctx, id: string) =>
	callBackend<SchoolPlanningView>(ctx, (init) => deleteSchoolExtra(id, init));

// ===== 05a–05e =====
export const fetchYears = (ctx: Ctx) =>
	callBackend<SchoolYearsView>(ctx, (init) => listSchoolYears(init));
export const fetchYear = (ctx: Ctx, id: string) =>
	callBackend<SchoolYearDetail>(ctx, (init) => getSchoolYear(id, init));
export const saveYear = (ctx: Ctx, id: string, body: SchoolYearInput) =>
	callBackend<SchoolYearsView>(ctx, (init) =>
		id ? updateSchoolYear(id, body, init) : createSchoolYear(body, init)
	);
export const deleteYear = (ctx: Ctx, id: string) =>
	callBackend<SchoolYearsView>(ctx, (init) => deleteSchoolYear(id, init));

export const fetchClasses = (ctx: Ctx) =>
	callBackend<SchoolClassesView>(ctx, (init) => listSchoolClasses(init));
export const fetchClass = (ctx: Ctx, id: string) =>
	callBackend<SchoolClassDetail>(ctx, (init) => getSchoolClass(id, init));
export const saveClass = (ctx: Ctx, id: string, body: SchoolClassInput) =>
	callBackend<SchoolClassesView>(ctx, (init) =>
		id ? updateSchoolClass(id, body, init) : createSchoolClass(body, init)
	);
export const deleteClass = (ctx: Ctx, id: string) =>
	callBackend<SchoolClassesView>(ctx, (init) => deleteSchoolClass(id, init));

export const fetchTeachers = (ctx: Ctx) =>
	callBackend<SchoolTeachersView>(ctx, (init) => listSchoolTeachers(init));
export const fetchTeacher = (ctx: Ctx, id: string) =>
	callBackend<SchoolTeacherDetail>(ctx, (init) => getSchoolTeacher(id, init));
export const saveTeacher = (ctx: Ctx, id: string, body: SchoolTeacherInput) =>
	callBackend<SchoolTeachersView>(ctx, (init) =>
		id ? updateSchoolTeacher(id, body, init) : createSchoolTeacher(body, init)
	);
export const deleteTeacher = (ctx: Ctx, id: string) =>
	callBackend<SchoolTeachersView>(ctx, (init) => deleteSchoolTeacher(id, init));

export const fetchStudents = (ctx: Ctx) =>
	callBackend<SchoolStudentsView>(ctx, (init) => listSchoolStudents(init));
export const saveStudent = (ctx: Ctx, id: string, body: SchoolStudentInput) =>
	callBackend<SchoolStudentsView>(ctx, (init) =>
		id ? updateSchoolStudent(id, body, init) : createSchoolStudent(body, init)
	);
export const deleteStudent = (ctx: Ctx, id: string) =>
	callBackend<SchoolStudentsView>(ctx, (init) => deleteSchoolStudent(id, init));

export const fetchGuardians = (ctx: Ctx) =>
	callBackend<SchoolGuardiansView>(ctx, (init) => listSchoolGuardians(init));
export const saveGuardian = (ctx: Ctx, id: string, body: SchoolGuardianInput) =>
	callBackend<SchoolGuardiansView>(ctx, (init) =>
		id ? updateSchoolGuardian(id, body, init) : createSchoolGuardian(body, init)
	);
export const deleteGuardian = (ctx: Ctx, id: string) =>
	callBackend<SchoolGuardiansView>(ctx, (init) => deleteSchoolGuardian(id, init));
export const unlinkGuardian = (ctx: Ctx, id: string, studentId: string) =>
	callBackend<SchoolGuardiansView>(ctx, (init) => unlinkSchoolGuardian(id, studentId, init));

export const invite = (ctx: Ctx, kind: InviteKind, ids: string[]) =>
	callBackend<SchoolInviteResult>(ctx, (init) => inviteSchoolAccounts({ kind, ids }, init));

// ===== 05f–05h =====
export const fetchAttendance = (ctx: Ctx, mode: string, date: string) =>
	callBackend<SchoolAttendanceView>(ctx, (init) =>
		getSchoolAttendance({ mode: mode || undefined, date: date || undefined }, init)
	);
export const remindAttendance = (ctx: Ctx) =>
	callBackend<SchoolAttendanceView>(ctx, (init) => remindSchoolAttendance(undefined, init));
export const fetchHomeroomAttendance = (ctx: Ctx, date: string) =>
	callBackend<SchoolHomeroomAttendanceView>(ctx, (init) =>
		getHomeroomAttendance({ date: date || undefined }, init)
	);
export const saveHomeroomAttendanceEntries = (ctx: Ctx, body: SchoolAttendanceInput) =>
	callBackend<SchoolHomeroomAttendanceView>(ctx, (init) => saveHomeroomAttendance(body, init));
export const fetchReports = (ctx: Ctx) =>
	callBackend<SchoolReportsView>(ctx, (init) => getSchoolReports(init));
export const remindReport = (ctx: Ctx, classId: string) =>
	callBackend<SchoolReportsView>(ctx, (init) => remindSchoolReport(classId, undefined, init));

// ===== Alur rapor =====
export const fetchClassReport = (ctx: Ctx, classId: string) =>
	callBackend<SchoolClassReport>(ctx, (init) => getSchoolClassReport(classId, init));
export const approveReport = (ctx: Ctx, classId: string) =>
	callBackend<SchoolClassReport>(ctx, (init) => approveSchoolClassReport(classId, init));
export const returnReport = (ctx: Ctx, classId: string, reason: string) =>
	callBackend<SchoolClassReport>(ctx, (init) => returnSchoolClassReport(classId, { reason }, init));
export const lockReport = (ctx: Ctx, classId: string) =>
	callBackend<SchoolClassReport>(ctx, (init) => lockSchoolClassReport(classId, init));
export const unlockReport = (ctx: Ctx, classId: string, reason: string) =>
	callBackend<SchoolClassReport>(ctx, (init) => unlockSchoolClassReport(classId, { reason }, init));
export const fetchReportPdf = (ctx: Ctx, classId: string, studentId: string) =>
	fetchBackendFile(
		ctx,
		`/api/v1/school/reports/${encodeURIComponent(classId)}/pdf${studentId ? `?student=${encodeURIComponent(studentId)}` : ''}`
	);
export const fetchTeacherGrades = (ctx: Ctx) =>
	callBackend<SchoolGradeAssignmentsView>(ctx, (init) => getTeacherGradeAssignments(init));
export const fetchGradeSheet = (ctx: Ctx, assignmentId: string) =>
	callBackend<SchoolGradeSheet>(ctx, (init) => getTeacherGradeSheet(assignmentId, init));
export const saveGrades = (ctx: Ctx, assignmentId: string, body: SchoolGradesInput) =>
	callBackend<SchoolGradeSheet>(ctx, (init) => saveTeacherGrades(assignmentId, body, init));
export const lockGrades = (ctx: Ctx, assignmentId: string) =>
	callBackend<SchoolGradeSheet>(ctx, (init) => lockTeacherGrades(assignmentId, init));
export const fetchHomeroomReport = (ctx: Ctx) =>
	callBackend<SchoolClassReport>(ctx, (init) => getHomeroomReport(init));
export const saveReportNotes = (ctx: Ctx, body: SchoolNotesInput) =>
	callBackend<SchoolClassReport>(ctx, (init) => saveHomeroomReportNotes(body, init));
export const submitReport = (ctx: Ctx) =>
	callBackend<SchoolClassReport>(ctx, (init) => submitHomeroomReport(init));

// ===== Rapor murid & orang tua (hanya rapor terbit) =====
export const fetchLearnerReports = (ctx: Ctx) =>
	callBackend<LearnerReportsView>(ctx, (init) => getLearnerReports(init));
export const fetchLearnerReportPdf = (ctx: Ctx, reportId: string) =>
	fetchBackendFile(ctx, `/api/v1/school/learner/reports/${encodeURIComponent(reportId)}/pdf`);

// ===== Undangan massal & riwayat perubahan =====
export const fetchInviteJob = (ctx: Ctx, jobId: string) =>
	callBackend<SchoolInviteJob>(ctx, (init) => getSchoolInviteJob(jobId, init));
export const fetchAudit = (ctx: Ctx, params: GetSchoolAuditParams) =>
	callBackend<SchoolAuditView>(ctx, (init) => getSchoolAudit(params, init));
export const fetchSubscription = (ctx: Ctx) =>
	callBackend<SchoolSubscriptionView>(ctx, (init) => getSchoolSubscription(init));
export const fetchActivation = (ctx: Ctx) =>
	callBackend<SchoolActivationView>(ctx, (init) => getSchoolActivation(init));
export const activate = (ctx: Ctx, body: SchoolActivationInput) =>
	callBackend<SchoolActivationResult>(ctx, (init) => activateSchoolSubscription(body, init));
export const addSeats = (ctx: Ctx, seats: number) =>
	callBackend<SchoolSeatsResult>(ctx, (init) => addSchoolSeats({ seats }, init));

// ===== Impor =====
export const fetchImportSpec = (ctx: Ctx, kind: ImportKind) =>
	callBackend<SchoolImportSpec>(ctx, (init) => getSchoolImportSpec(kind, init));
export const fetchImportTemplate = (ctx: Ctx, kind: ImportKind, format: 'xlsx' | 'csv') =>
	fetchBackendFile(ctx, `/api/v1/school/imports/${kind}/template?format=${format}`);
export const parseImport = (ctx: Ctx, kind: ImportKind, body: SchoolImportFile) =>
	callBackend<SchoolParsedImport>(ctx, (init) => parseSchoolImport(kind, body, init));
export const previewImport = (ctx: Ctx, kind: ImportKind, body: SchoolImportRequest) =>
	callBackend<SchoolImportPreview>(ctx, (init) => previewSchoolImport(kind, body, init));
export const commitImport = (ctx: Ctx, kind: ImportKind, body: SchoolImportRequest) =>
	callBackend<SchoolImportResult>(ctx, (init) => commitSchoolImport(kind, body, init));

// ===== Publik: undangan & aktivasi =====
export const fetchInvitation = (ctx: PublicCtx, tenant: string, token: string) =>
	callPublic<SchoolInvitationInfo>(ctx, (init) => getSchoolInvitation({ t: tenant, token }, init));
export const acceptInvitation = (ctx: PublicCtx, body: SchoolAcceptInput) =>
	callPublic<SchoolInvitationInfo>(ctx, (init) => acceptSchoolInvitation(body, init));
export const activateStudent = (ctx: PublicCtx, body: SchoolActivateInput) =>
	callPublic<SchoolInvitationInfo>(ctx, (init) => activateSchoolStudent(body, init));
