import { fetchPlanning, fetchSetup } from '$lib/features/school-admin/school-admin.api';
import { throwIfTenantMaintenance } from '$lib/api/tenant-maintenance';
import { context, setupActions } from '$lib/features/school-admin/school-admin.server';
import { APP_PATHS } from '$lib/utils/app-paths';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/**
 * 03b Lengkapi data sekolah: 5 data wajib (wizard) lalu 7 bagian yang bisa menyusul (checklist).
 * Selain admin sekolah/kepala sekolah diteruskan ke beranda sesuai peran.
 */
export const load: PageServerLoad = async (event) => {
	const ctx = context(event);
	const [setup, planning] = await Promise.all([fetchSetup(ctx), fetchPlanning(ctx)]);
	if (!setup.ok) {
		if (setup.reason === 'unauthenticated') redirect(303, APP_PATHS.LOGIN);
		if (setup.reason === 'forbidden') redirect(303, APP_PATHS.ENTRY);
		throwIfTenantMaintenance(setup);
		return { setup: null, planning: null, failure: setup.reason };
	}
	return { setup: setup.data, planning: planning.ok ? planning.data : null, failure: null };
};

export const actions: Actions = setupActions;
