import { finishLogin } from '$lib/auth/finish-login';
import { fetchBackendRoles, hasBackendSession } from '$lib/auth/backend-auth';
import { APP_PATHS } from '$lib/utils/app-paths';
import { isRedirect, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const SEE_OTHER_STATUS = 303;
/** Peran pemilik tenant sekolah (tenant pribadi/event memakai peran lain → langsung ke dashboard). */
const SCHOOL_OWNER_ROLE = 'SCHOOL_ADMIN';

/**
 * Setup awal selesai: sesi pemohon (kini pemilik tenant) diteruskan ke dashboard sesuai peran;
 * pemilik tenant sekolah lebih dulu ke "Lengkapi data sekolah" (03b, referensi v4).
 */
export const load: PageServerLoad = async (event) => {
	if (!hasBackendSession(event.cookies)) redirect(SEE_OTHER_STATUS, '/login');
	const identity = await fetchBackendRoles(event.fetch, event.cookies);
	const schoolOwner = identity?.roles.some((r) => r.roleCode === SCHOOL_OWNER_ROLE) ?? false;
	if (!schoolOwner) return finishLogin(event, '');
	try {
		return await finishLogin(event, '');
	} catch (error) {
		// Pemohon yang lembaganya belum aktif tetap dikembalikan ke wizard pendaftaran.
		if (isRedirect(error) && error.location !== APP_PATHS.REGISTER) {
			redirect(SEE_OTHER_STATUS, APP_PATHS.SCHOOL_ADMIN_SETUP);
		}
		throw error;
	}
};
