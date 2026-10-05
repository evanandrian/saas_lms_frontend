import {
	createMasterRecord,
	deleteMasterRecord,
	listMasterRecords,
	updateMasterRecord,
	type MasterIssue,
	type MasterKind,
	type MasterRecord,
	type MasterUsage,
	type SaveMasterRecordRequest
} from '$lib/api/generated/lms';
import { backendApiAccess } from '$lib/auth/backend-auth';
import type { Cookies } from '@sveltejs/kit';

/**
 * Feature API Master data (ADR-021) — server-only (load/form action): token berada di cookie HttpOnly
 * dan backend menerima `Authorization: Bearer` (ADR-019 §2 alur SSR → API).
 */
export interface MasterDataApiContext {
	fetch: typeof fetch;
	cookies: Cookies;
}

/**
 * Alasan kegagalan stabil untuk UI: `conflict` = diubah orang lain; `in_use` = masih dirujuk
 * (`usage`); `validation` = isian ditolak (`issues`).
 */
export type MasterDataFailure =
	| 'unauthenticated'
	| 'forbidden'
	| 'not_found'
	| 'conflict'
	| 'in_use'
	| 'validation'
	| 'unavailable';

export type MasterDataResult<T> =
	| { ok: true; data: T }
	| { ok: false; reason: MasterDataFailure; issues?: MasterIssue[]; usage?: MasterUsage[] };

const FAILURE_BY_STATUS: Readonly<Record<number, MasterDataFailure>> = {
	400: 'validation',
	401: 'unauthenticated',
	403: 'forbidden',
	404: 'not_found',
	422: 'validation'
};

type GeneratedResponse = { status: number; data: unknown };
type ErrorBody = { error?: { code?: string; details?: unknown[] } } | undefined;

async function call<T>(
	ctx: MasterDataApiContext,
	request: (init: {
		baseUrl: string;
		token: string;
		fetch: typeof fetch;
	}) => Promise<GeneratedResponse>
): Promise<MasterDataResult<T>> {
	const access = backendApiAccess(ctx.cookies);
	if (!access) return { ok: false, reason: 'unauthenticated' };
	try {
		const response = await request({ ...access, fetch: ctx.fetch });
		if (response.status >= 200 && response.status < 300) {
			return { ok: true, data: (response.data as { data?: T } | undefined)?.data as T };
		}
		const error = (response.data as ErrorBody)?.error;
		if (response.status === 409) {
			return error?.code === 'in_use'
				? { ok: false, reason: 'in_use', usage: error.details as MasterUsage[] }
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

export function listMaster(ctx: MasterDataApiContext, kind: MasterKind) {
	return call<MasterRecord[]>(ctx, (init) => listMasterRecords(kind, init));
}

export function createMaster(
	ctx: MasterDataApiContext,
	kind: MasterKind,
	body: SaveMasterRecordRequest
) {
	return call<MasterRecord>(ctx, (init) => createMasterRecord(kind, body, init));
}

export function updateMaster(
	ctx: MasterDataApiContext,
	kind: MasterKind,
	code: string,
	body: SaveMasterRecordRequest
) {
	return call<MasterRecord>(ctx, (init) => updateMasterRecord(kind, code, body, init));
}

export function deleteMaster(ctx: MasterDataApiContext, kind: MasterKind, code: string) {
	return call<null>(ctx, (init) => deleteMasterRecord(kind, code, init));
}
