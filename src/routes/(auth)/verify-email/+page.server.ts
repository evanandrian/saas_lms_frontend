import { backendBaseUrl } from '$lib/auth/backend-auth';
import { verifyEmailToken } from '$lib/features/account/account.api';
import { assertHostKind } from '$lib/utils/host-context';
import type { PageServerLoad } from './$types';

/** Tautan verifikasi email login (dari email Pengaturan Akun); tidak butuh sesi. */
export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	assertHostKind(locals.host, ['public', 'platform', 'tenant', 'unified']);
	const token = url.searchParams.get('token') ?? '';
	const baseUrl = backendBaseUrl();
	if (!token || !baseUrl) return { email: null, failure: token ? 'unavailable' : 'gone' };
	const result = await verifyEmailToken(fetch, baseUrl, token);
	return result.ok
		? { email: result.data.email, failure: null }
		: { email: null, failure: result.code === 'validation_failed' ? 'taken' : result.reason };
};
