import type {
	BackendContext,
	BackendFailure,
	BackendFailureResult,
	BackendResult
} from '$lib/api/backend-call';
import type { ClusterInput, ClusterTestInput } from '$lib/api/generated/lms';
import { clientMeta } from '$lib/auth/finish-login';
import { fail, type Actions, type RequestEvent } from '@sveltejs/kit';
import {
	createCluster,
	fetchClusterDatabases,
	fetchClusters,
	testConnection,
	updateCluster,
	type ConnectionFailureDetail
} from './clusters.api';
import { CONNECTION_ISSUE_FIELD } from './clusters.model';

/**
 * Load & form action Cluster DB (`/platform/cluster-db`, referensi "04g Cluster DB"). Aksi dipanggil
 * lewat `runPageAction` (`?/<nama>`); simpan mengembalikan cluster terbaru + daftar terbaru.
 */

const HTTP_STATUS_BY_FAILURE: Record<BackendFailure, number> = {
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

function context(event: RequestEvent): BackendContext {
	return {
		fetch: event.fetch,
		cookies: event.cookies,
		userAgent: event.request.headers.get('user-agent') ?? '',
		clientAddress: clientMeta(event).address
	};
}

export async function loadClusterConsole(event: RequestEvent) {
	const result = await fetchClusters(context(event));
	return { list: result.ok ? result.data : null, failure: result.ok ? null : result.reason };
}

async function readBody<T>(event: RequestEvent): Promise<T | null> {
	try {
		const form = await event.request.formData();
		const body: unknown = JSON.parse(String(form.get('body') ?? 'null'));
		return body && typeof body === 'object' ? (body as T) : null;
	} catch {
		return null;
	}
}

/** Kegagalan → `fail`; kode kelas error koneksi dibawa sebagai isu `connection` agar bisa dipetakan UI. */
function failWith(result: BackendFailureResult, detail: ConnectionFailureDetail | null = null) {
	const issues = detail
		? [...result.issues, { field: CONNECTION_ISSUE_FIELD, code: detail.errorCode }]
		: result.issues;
	return fail(HTTP_STATUS_BY_FAILURE[result.reason], {
		reason: result.reason,
		code: result.code,
		issues,
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

const validId = (v: unknown): v is string => typeof v === 'string' && UUID_PATTERN.test(v);

type Outcome<T> = { result: BackendResult<T>; detail: ConnectionFailureDetail | null };

/** Simpan: hasil = cluster tersimpan + daftar terbaru (kartu & kapasitas selalu sinkron). */
async function respondSaved<T>(ctx: BackendContext, outcome: Outcome<T>) {
	if (!outcome.result.ok) return failWith(outcome.result, outcome.detail);
	const list = await fetchClusters(ctx);
	return { result: { cluster: outcome.result.data, list: list.ok ? list.data : null } };
}

export const clusterConsoleActions: Actions = {
	test: async (event) => {
		const body = await readBody<ClusterTestInput>(event);
		if (!body || (body.cluster_id !== undefined && !validId(body.cluster_id))) {
			return invalidBody();
		}
		const result = await testConnection(context(event), body);
		return result.ok ? { result: result.data } : failWith(result);
	},
	create: async (event) => {
		const body = await readBody<{ data: ClusterInput }>(event);
		if (!body?.data) return invalidBody();
		const ctx = context(event);
		return respondSaved(ctx, await createCluster(ctx, body.data));
	},
	update: async (event) => {
		const body = await readBody<{ id: string; data: ClusterInput }>(event);
		if (!body?.data || !validId(body.id)) return invalidBody();
		const ctx = context(event);
		return respondSaved(ctx, await updateCluster(ctx, body.id, body.data));
	},
	databases: async (event) => {
		const body = await readBody<{ id: string }>(event);
		if (!body || !validId(body.id)) return invalidBody();
		const outcome = await fetchClusterDatabases(context(event), body.id);
		return outcome.result.ok
			? { result: outcome.result.data }
			: failWith(outcome.result, outcome.detail);
	}
};
