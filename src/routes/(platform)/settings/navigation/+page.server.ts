import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import {
	loadNavigationLayout,
	resetNavigationLayoutForRole,
	saveNavigationLayoutForRole,
	type NavigationFailure
} from '$lib/features/navigation/navigation.api';
import { defaultNavigationLayout } from '$lib/features/navigation/navigation.defaults';
import {
	NAVIGATION_ROLES,
	isNavigationRole,
	type NavigationGroupInput,
	type NavigationLayout,
	type NavigationRole
} from '$lib/features/navigation/navigation.model';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/** Kegagalan yang boleh diganti data simulasi saat dev (backend mati / belum masuk lewat backend). */
const SIMULATABLE_FAILURES: ReadonlySet<NavigationFailure> = new Set([
	'unavailable',
	'unauthenticated'
]);

const HTTP_STATUS_BY_FAILURE: Record<NavigationFailure, number> = {
	unauthenticated: 401,
	forbidden: 403,
	not_found: 404,
	conflict: 409,
	validation: 422,
	unavailable: 503
};

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const results = await Promise.all(
		NAVIGATION_ROLES.map(({ key }) => loadNavigationLayout({ fetch, cookies }, key))
	);
	const failure = results.find((r) => !r.ok);
	const preview = dev ? (await import('./navigation.fixture')).navigationPreviewFixture : null;
	const rootDomain = env.PUBLIC_LMS_ROOT_DOMAIN ?? '';

	if (!failure) {
		const layouts = {} as Record<NavigationRole, NavigationLayout>;
		for (const result of results) if (result.ok) layouts[result.layout.role] = result.layout;
		return { layouts, failure: null, simulate: false, preview, rootDomain };
	}
	const reason = failure.ok ? 'unavailable' : failure.reason;
	// Dev tanpa backend: susunan bawaan FLIXARE, simpan disimulasikan lokal (D6). Produksi: status gagal.
	if (dev && SIMULATABLE_FAILURES.has(reason)) {
		const layouts = Object.fromEntries(
			NAVIGATION_ROLES.map(({ key }) => [key, defaultNavigationLayout(key)])
		) as Record<NavigationRole, NavigationLayout>;
		return { layouts, failure: reason, simulate: true, preview, rootDomain };
	}
	return { layouts: null, failure: reason, simulate: false, preview, rootDomain };
};

function readRole(form: FormData): NavigationRole | null {
	const role = String(form.get('role') ?? '');
	return isNavigationRole(role) ? role : null;
}

function readVersion(form: FormData): number | null {
	const version = Number(form.get('version'));
	return Number.isInteger(version) ? version : null;
}

export const actions: Actions = {
	save: async ({ request, fetch, cookies }) => {
		const form = await request.formData();
		const role = readRole(form);
		const version = readVersion(form);
		let groups: NavigationGroupInput[];
		try {
			groups = JSON.parse(String(form.get('groups') ?? ''));
		} catch {
			return fail(400, { reason: 'validation' as NavigationFailure, issues: [] });
		}
		if (!role || version === null || !Array.isArray(groups)) {
			return fail(400, { reason: 'validation' as NavigationFailure, issues: [] });
		}
		const result = await saveNavigationLayoutForRole({ fetch, cookies }, role, { version, groups });
		if (!result.ok) {
			return fail(HTTP_STATUS_BY_FAILURE[result.reason], {
				reason: result.reason,
				issues: result.issues ?? []
			});
		}
		return { layout: result.layout };
	},
	reset: async ({ request, fetch, cookies }) => {
		const form = await request.formData();
		const role = readRole(form);
		const version = readVersion(form);
		if (!role || version === null) {
			return fail(400, { reason: 'validation' as NavigationFailure, issues: [] });
		}
		const result = await resetNavigationLayoutForRole({ fetch, cookies }, role, version);
		if (!result.ok) {
			return fail(HTTP_STATUS_BY_FAILURE[result.reason], { reason: result.reason, issues: [] });
		}
		return { layout: result.layout };
	}
};
