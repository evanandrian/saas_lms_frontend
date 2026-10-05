import {
	getNavigationLayout,
	getNavigationSidebar,
	resetNavigationLayout,
	saveNavigationLayout,
	type NavigationIssue,
	type NavigationLayout,
	type NavigationRole,
	type SaveNavigationLayoutRequest
} from '$lib/api/generated/lms';
import { backendApiAccess } from '$lib/auth/backend-auth';
import type { Cookies } from '@sveltejs/kit';

/**
 * Feature API Menu & navigasi (ADR-021) — server-only (load/form action), karena token berada
 * di cookie HttpOnly dan backend menerima `Authorization: Bearer` (ADR-019 §2 alur SSR → API).
 */
export interface NavigationApiContext {
	fetch: typeof fetch;
	cookies: Cookies;
}

/**
 * Alasan kegagalan stabil untuk UI:
 * - `unauthenticated`: belum masuk lewat backend / sesi berakhir;
 * - `forbidden`: tidak punya `platform.navigation.manage`;
 * - `conflict`: susunan sudah diubah orang lain (versi berbeda);
 * - `validation`: isian ditolak backend (`issues` per node);
 * - `unavailable`: backend tak terjangkau atau error lain.
 */
export type NavigationFailure =
	'unauthenticated' | 'forbidden' | 'not_found' | 'conflict' | 'validation' | 'unavailable';

export type NavigationResult =
	| { ok: true; layout: NavigationLayout }
	| { ok: false; reason: NavigationFailure; issues?: NavigationIssue[] };

const FAILURE_BY_STATUS: Readonly<Record<number, NavigationFailure>> = {
	400: 'validation',
	401: 'unauthenticated',
	403: 'forbidden',
	404: 'not_found',
	409: 'conflict',
	422: 'validation'
};

type GeneratedResponse = { status: number; data: unknown };

async function call(
	ctx: NavigationApiContext,
	request: (init: {
		baseUrl: string;
		token: string;
		fetch: typeof fetch;
	}) => Promise<GeneratedResponse>
): Promise<NavigationResult> {
	const access = backendApiAccess(ctx.cookies);
	if (!access) return { ok: false, reason: 'unauthenticated' };
	try {
		const response = await request({ ...access, fetch: ctx.fetch });
		if (response.status === 200) {
			return { ok: true, layout: (response.data as { data: NavigationLayout }).data };
		}
		const issues = (response.data as { error?: { details?: NavigationIssue[] } } | undefined)?.error
			?.details;
		return { ok: false, reason: FAILURE_BY_STATUS[response.status] ?? 'unavailable', issues };
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
}

export function loadNavigationLayout(ctx: NavigationApiContext, role: NavigationRole) {
	return call(ctx, (init) => getNavigationLayout(role, init));
}

export function saveNavigationLayoutForRole(
	ctx: NavigationApiContext,
	role: NavigationRole,
	body: SaveNavigationLayoutRequest
) {
	return call(ctx, (init) => saveNavigationLayout(role, body, init));
}

export function resetNavigationLayoutForRole(
	ctx: NavigationApiContext,
	role: NavigationRole,
	version: number
) {
	return call(ctx, (init) => resetNavigationLayout(role, { version }, init));
}

export function loadNavigationSidebar(ctx: NavigationApiContext, role: NavigationRole) {
	return call(ctx, (init) => getNavigationSidebar(role, init));
}
