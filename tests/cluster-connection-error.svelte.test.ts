import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClusterList, ClusterTestResult } from '$lib/api/generated/lms';
import type { PageActionOutcome } from '$lib/utils/page-action';

/**
 * Sanitasi error koneksi cluster: konsol hanya memakai `error_code` stabil (kunci i18n
 * `clusters.test_error.*`), tidak pernah teks mentah driver walau backend lama masih mengirim `error`.
 */

vi.mock('$lib/utils/page-action', () => ({ runPageAction: vi.fn() }));

const { runPageAction } = await import('$lib/utils/page-action');
const { ClusterConsoleState } = await import('$lib/features/clusters/cluster-console.svelte');

const action = vi.mocked(runPageAction);
const RAW = 'failed to connect to host=10.20.30.40 user=lms_admin: connection refused';
const emptyList: ClusterList = { clusters: [], regions: [] };

const testResult = (over: Partial<ClusterTestResult>): PageActionOutcome<ClusterTestResult> => ({
	ok: true,
	data: { ok: false, pg_version: '', latency_ms: 0, ssl: false, error_code: '', error: '', ...over }
});

beforeEach(() => action.mockReset());

describe('ClusterConsoleState.runTest — error koneksi', () => {
	it('memakai error_code, bukan teks mentah driver', async () => {
		action.mockResolvedValueOnce(testResult({ error_code: 'connection_refused', error: RAW }));
		const state = new ClusterConsoleState(emptyList);
		await state.runTest();
		expect(state.test).toEqual({ phase: 'failed', reason: 'test_error.connection_refused' });
		expect(JSON.stringify(state.test)).not.toContain('10.20.30.40');
	});

	it('error_code tidak dikenal → connection_failed generik', async () => {
		action.mockResolvedValueOnce(testResult({ error_code: 'something_new', error: RAW }));
		const state = new ClusterConsoleState(emptyList);
		await state.runTest();
		expect(state.test).toEqual({ phase: 'failed', reason: 'test_error.connection_failed' });
	});
});
