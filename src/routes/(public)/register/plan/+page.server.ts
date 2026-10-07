import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const PERMANENT_REDIRECT_STATUS = 308;

/** Pilih paket kini satu alur dengan `/register` (langkah "Paket"). */
export const load: PageServerLoad = () => redirect(PERMANENT_REDIRECT_STATUS, '/register');
