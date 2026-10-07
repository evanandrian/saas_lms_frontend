import { accountActions, loadAccountPage } from '$lib/features/account/account.server';
import type { Actions, PageServerLoad } from './$types';

/** Pengaturan Akun area `school_admin` (referensi "10 Pengaturan Akun"); data & aksi dari backend. */
const AREA = 'school_admin';

export const load: PageServerLoad = (event) => loadAccountPage(event, AREA);

export const actions: Actions = accountActions(AREA);
