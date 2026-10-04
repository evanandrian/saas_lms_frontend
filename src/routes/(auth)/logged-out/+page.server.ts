import { consumeLogoutNotice } from '$lib/auth/session-meta';
import { assertHostKind } from '$lib/utils/host-context';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, cookies }) => {
	assertHostKind(locals.host, ['public', 'platform', 'tenant', 'unified']);
	// Ringkasan sekali tampil dari POST /logout; tanpa ringkasan → pesan umum.
	return { notice: consumeLogoutNotice(cookies) };
};
