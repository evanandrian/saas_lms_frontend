import {
	getDashboardContext,
	getHomeroomDashboard,
	getPrincipalDashboard,
	getStudentDashboard,
	getTeacherDashboard,
	type DashboardContext,
	type GetDashboardContextArea,
	type HomeroomDashboard,
	type PrincipalDashboard,
	type StudentDashboard,
	type TeacherDashboard
} from '$lib/api/generated/lms';
import { callBackend, type BackendContext } from '$lib/api/backend-call';

/**
 * Feature API dashboard per peran (ADR-021) — server-only. Peran & tampilan ditentukan backend dari
 * keanggotaan aktif; bagian tanpa modul backend bernilai `null` (UI menampilkan data contoh).
 */
export const loadContext = (ctx: BackendContext, area: GetDashboardContextArea) =>
	callBackend<DashboardContext>(ctx, (init) => getDashboardContext({ area }, init));

export const loadPrincipal = (ctx: BackendContext) =>
	callBackend<PrincipalDashboard>(ctx, (init) => getPrincipalDashboard(init));

export const loadHomeroom = (ctx: BackendContext) =>
	callBackend<HomeroomDashboard>(ctx, (init) => getHomeroomDashboard(init));

export const loadTeacher = (ctx: BackendContext) =>
	callBackend<TeacherDashboard>(ctx, (init) => getTeacherDashboard(init));

export const loadStudent = (ctx: BackendContext) =>
	callBackend<StudentDashboard>(ctx, (init) => getStudentDashboard(init));

