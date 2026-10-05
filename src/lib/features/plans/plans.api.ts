import {
	createPlan,
	deletePlan,
	listPlans,
	updatePlan,
	type MasterIssue,
	type Plan,
	type SavePlanRequest
} from '$lib/api/generated/lms';
import { backendApiAccess } from '$lib/auth/backend-auth';
import type { Cookies } from '@sveltejs/kit';

/**
 * Feature API Master Paket (ADR-021) — server-only (load/form action): token berada di cookie HttpOnly
 * dan backend menerima `Authorization: Bearer` (ADR-019 §2 alur SSR → API).
 */
export interface PlansApiContext {
	fetch: typeof fetch;
	cookies: Cookies;
}

/**
 * Alasan kegagalan stabil untuk UI: `conflict` = diubah orang lain; `in_use` = sudah punya langganan;
 * `validation` = isian ditolak (`issues`).
 */
export type PlansFailure =
	| 'unauthenticated'
	| 'forbidden'
	| 'not_found'
	| 'conflict'
	| 'in_use'
	| 'validation'
	| 'unavailable';

export type PlansResult<T> =
	| { ok: true; data: T }
	| { ok: false; reason: PlansFailure; issues?: MasterIssue[]; subscriptions?: number };

const FAILURE_BY_STATUS: Readonly<Record<number, PlansFailure>> = {
	400: 'validation',
	401: 'unauthenticated',
	403: 'forbidden',
	404: 'not_found',
	422: 'validation'
};

type GeneratedResponse = { status: number; data: unknown };
type ErrorBody = { error?: { code?: string; details?: unknown[] } } | undefined;

async function call<T>(
	ctx: PlansApiContext,
	request: (init: {
		baseUrl: string;
		token: string;
		fetch: typeof fetch;
	}) => Promise<GeneratedResponse>
): Promise<PlansResult<T>> {
	const access = backendApiAccess(ctx.cookies);
	if (!access) return { ok: false, reason: 'unauthenticated' };
	try {
		const response = await request({ ...access, fetch: ctx.fetch });
		if (response.status >= 200 && response.status < 300) {
			return { ok: true, data: (response.data as { data?: T } | undefined)?.data as T };
		}
		const error = (response.data as ErrorBody)?.error;
		if (response.status === 409) {
			const usage = (error?.details as { count?: number }[] | undefined)?.[0];
			return error?.code === 'in_use'
				? { ok: false, reason: 'in_use', subscriptions: usage?.count ?? 0 }
				: { ok: false, reason: 'conflict' };
		}
		return {
			ok: false,
			reason: FAILURE_BY_STATUS[response.status] ?? 'unavailable',
			issues: (error?.details as MasterIssue[] | undefined) ?? []
		};
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
}

export function listPlanCatalog(ctx: PlansApiContext) {
	return call<Plan[]>(ctx, (init) => listPlans(init));
}

export function createPlanEntry(ctx: PlansApiContext, body: SavePlanRequest) {
	return call<Plan>(ctx, (init) => createPlan(body, init));
}

export function updatePlanEntry(ctx: PlansApiContext, code: string, body: SavePlanRequest) {
	return call<Plan>(ctx, (init) => updatePlan(code, body, init));
}

export function deletePlanEntry(ctx: PlansApiContext, code: string) {
	return call<null>(ctx, (init) => deletePlan(code, init));
}
