import { dev } from '$app/environment';
import {
	createMaster,
	deleteMaster,
	listMaster,
	updateMaster,
	type MasterDataFailure,
	type MasterDataResult
} from '$lib/features/master-data/master-data.api';
import {
	MASTER_DEFINITIONS,
	isMasterKind,
	type MasterKind,
	type MasterRecord,
	type SaveMasterRecordRequest
} from '$lib/features/master-data/master-data.model';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/** Kegagalan yang boleh diganti data simulasi saat dev (backend mati / belum masuk lewat backend). */
const SIMULATABLE_FAILURES: ReadonlySet<MasterDataFailure> = new Set([
	'unavailable',
	'unauthenticated'
]);

const HTTP_STATUS_BY_FAILURE: Record<MasterDataFailure, number> = {
	unauthenticated: 401,
	forbidden: 403,
	not_found: 404,
	conflict: 409,
	in_use: 409,
	validation: 422,
	unavailable: 503
};

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const results = await Promise.all(
		MASTER_DEFINITIONS.map((m) => listMaster({ fetch, cookies }, m.kind))
	);
	const failure = results.find((r) => !r.ok);
	if (!failure) {
		const masters = {} as Record<MasterKind, MasterRecord[]>;
		MASTER_DEFINITIONS.forEach((m, i) => {
			const result = results[i];
			masters[m.kind] = result?.ok ? result.data : [];
		});
		return { masters, failure: null, simulate: false };
	}
	const reason = failure.ok ? 'unavailable' : failure.reason;
	// Dev tanpa backend: data seeder sebagai contoh, simpan disimulasikan lokal (D6). Produksi: status gagal.
	if (dev && SIMULATABLE_FAILURES.has(reason)) {
		const { masterDataFixture } = await import('./master-data.fixture');
		return { masters: structuredClone(masterDataFixture), failure: reason, simulate: true };
	}
	return { masters: null, failure: reason, simulate: false };
};

function readKind(form: FormData): MasterKind | null {
	const kind = String(form.get('kind') ?? '');
	return isMasterKind(kind) ? kind : null;
}

function readBody(form: FormData): SaveMasterRecordRequest | null {
	try {
		const body: unknown = JSON.parse(String(form.get('body') ?? ''));
		return body && typeof body === 'object' ? (body as SaveMasterRecordRequest) : null;
	} catch {
		return null;
	}
}

function respond<T>(result: MasterDataResult<T>) {
	if (result.ok) return { record: result.data };
	return fail(HTTP_STATUS_BY_FAILURE[result.reason], {
		reason: result.reason,
		issues: result.issues ?? [],
		usage: result.usage ?? []
	});
}

const invalid = () =>
	fail(400, { reason: 'validation' as MasterDataFailure, issues: [], usage: [] });

export const actions: Actions = {
	create: async ({ request, fetch, cookies }) => {
		const form = await request.formData();
		const kind = readKind(form);
		const body = readBody(form);
		if (!kind || !body) return invalid();
		return respond(await createMaster({ fetch, cookies }, kind, body));
	},
	update: async ({ request, fetch, cookies }) => {
		const form = await request.formData();
		const kind = readKind(form);
		const code = String(form.get('code') ?? '');
		const body = readBody(form);
		if (!kind || !code || !body) return invalid();
		return respond(await updateMaster({ fetch, cookies }, kind, code, body));
	},
	delete: async ({ request, fetch, cookies }) => {
		const form = await request.formData();
		const kind = readKind(form);
		const code = String(form.get('code') ?? '');
		if (!kind || !code) return invalid();
		return respond(await deleteMaster({ fetch, cookies }, kind, code));
	}
};
