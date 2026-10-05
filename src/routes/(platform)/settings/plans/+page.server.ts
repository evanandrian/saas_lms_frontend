import { dev } from '$app/environment';
import {
	createPlanEntry,
	deletePlanEntry,
	listPlanCatalog,
	updatePlanEntry,
	type PlansFailure,
	type PlansResult
} from '$lib/features/plans/plans.api';
import type { SavePlanRequest } from '$lib/features/plans/plans.model';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/** Kegagalan yang boleh diganti data simulasi saat dev (backend mati / belum masuk lewat backend). */
const SIMULATABLE_FAILURES: ReadonlySet<PlansFailure> = new Set(['unavailable', 'unauthenticated']);

const HTTP_STATUS_BY_FAILURE: Record<PlansFailure, number> = {
	unauthenticated: 401,
	forbidden: 403,
	not_found: 404,
	conflict: 409,
	in_use: 409,
	validation: 422,
	unavailable: 503
};

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const result = await listPlanCatalog({ fetch, cookies });
	if (result.ok) return { plans: result.data, failure: null, simulate: false };
	// Dev tanpa backend: data seeder sebagai contoh, simpan disimulasikan lokal (D6). Produksi: status gagal.
	if (dev && SIMULATABLE_FAILURES.has(result.reason)) {
		const { plansFixture } = await import('./plans.fixture');
		return { plans: structuredClone(plansFixture), failure: result.reason, simulate: true };
	}
	return { plans: null, failure: result.reason, simulate: false };
};

function readBody(form: FormData): SavePlanRequest | null {
	try {
		const body: unknown = JSON.parse(String(form.get('body') ?? ''));
		return body && typeof body === 'object' ? (body as SavePlanRequest) : null;
	} catch {
		return null;
	}
}

function respond<T>(result: PlansResult<T>) {
	if (result.ok) return { plan: result.data };
	return fail(HTTP_STATUS_BY_FAILURE[result.reason], {
		reason: result.reason,
		issues: result.issues ?? [],
		subscriptions: result.subscriptions ?? 0
	});
}

const invalid = () =>
	fail(400, { reason: 'validation' as PlansFailure, issues: [], subscriptions: 0 });

export const actions: Actions = {
	create: async ({ request, fetch, cookies }) => {
		const body = readBody(await request.formData());
		if (!body) return invalid();
		return respond(await createPlanEntry({ fetch, cookies }, body));
	},
	update: async ({ request, fetch, cookies }) => {
		const form = await request.formData();
		const code = String(form.get('code') ?? '');
		const body = readBody(form);
		if (!code || !body) return invalid();
		return respond(await updatePlanEntry({ fetch, cookies }, code, body));
	},
	delete: async ({ request, fetch, cookies }) => {
		const code = String((await request.formData()).get('code') ?? '');
		if (!code) return invalid();
		return respond(await deletePlanEntry({ fetch, cookies }, code));
	}
};
