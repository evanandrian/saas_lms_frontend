import {
	createPlatformCluster,
	listPlatformClusterDatabases,
	listPlatformClusters,
	testPlatformClusterConnection,
	updatePlatformCluster,
	type ClusterDatabaseList,
	type ClusterInput,
	type ClusterList,
	type ClusterTestInput,
	type ClusterTestResult,
	type ClusterView
} from '$lib/api/generated/lms';
import {
	callBackend,
	type BackendContext,
	type BackendRequestInit,
	type BackendResult
} from '$lib/api/backend-call';

/** Feature API Cluster DB (referensi "04g Cluster DB") — server-only. */

/** Detail `connection_failed` (422) / `cluster_unreachable` (503): kode kelas error koneksi. */
export interface ConnectionFailureDetail {
	errorCode: string;
}

type GeneratedResponse = { status: number; data: unknown };
type ErrorBody = { error?: { details?: { error_code?: unknown } } } | undefined;

/**
 * `callBackend` hanya memetakan detail berbentuk daftar isu; detail objek `{error_code}` dibaca
 * di sini agar UI bisa menampilkan penyebab gagal koneksi (backend tidak mengirim pesan mentah driver;
 * hanya `error_code` yang dipakai).
 */
async function callWithConnectionDetail<T>(
	ctx: BackendContext,
	request: (init: BackendRequestInit) => Promise<GeneratedResponse>
): Promise<{ result: BackendResult<T>; detail: ConnectionFailureDetail | null }> {
	let detail: ConnectionFailureDetail | null = null;
	const result = await callBackend<T>(ctx, async (init) => {
		const response = await request(init);
		const code = (response.data as ErrorBody)?.error?.details?.error_code;
		if (response.status >= 400 && typeof code === 'string') detail = { errorCode: code };
		return response;
	});
	return { result, detail };
}

export const fetchClusters = (ctx: BackendContext) =>
	callBackend<ClusterList>(ctx, (init) => listPlatformClusters(init));

export const testConnection = (ctx: BackendContext, body: ClusterTestInput) =>
	callBackend<ClusterTestResult>(ctx, (init) => testPlatformClusterConnection(body, init));

export const createCluster = (ctx: BackendContext, body: ClusterInput) =>
	callWithConnectionDetail<ClusterView>(ctx, (init) => createPlatformCluster(body, init));

export const updateCluster = (ctx: BackendContext, id: string, body: ClusterInput) =>
	callWithConnectionDetail<ClusterView>(ctx, (init) => updatePlatformCluster(id, body, init));

export const fetchClusterDatabases = (ctx: BackendContext, id: string) =>
	callWithConnectionDetail<ClusterDatabaseList>(ctx, (init) =>
		listPlatformClusterDatabases(id, init)
	);
