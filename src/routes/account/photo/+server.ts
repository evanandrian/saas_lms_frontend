import { proxyAccountFile } from '$lib/features/account/account.server';
import { assertHostKind } from '$lib/utils/host-context';
import type { RequestHandler } from './$types';

/** Foto profil pengguna yang sedang masuk (Pengaturan Akun, sidebar). */
export const GET: RequestHandler = (event) => {
	assertHostKind(event.locals.host, ['platform', 'tenant', 'unified']);
	return proxyAccountFile(event, '/api/v1/account/photo');
};
