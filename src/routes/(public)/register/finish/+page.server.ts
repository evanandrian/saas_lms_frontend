import { finishLogin } from '$lib/auth/finish-login';
import { hasBackendSession } from '$lib/auth/backend-auth';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const SEE_OTHER_STATUS = 303;

/** Setup awal selesai: sesi pemohon (kini pemilik tenant) diteruskan ke dashboard sesuai peran. */
export const load: PageServerLoad = async (event) => {
	if (!hasBackendSession(event.cookies)) redirect(SEE_OTHER_STATUS, '/login');
	return finishLogin(event, '');
};
