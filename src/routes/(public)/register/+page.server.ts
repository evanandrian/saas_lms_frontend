import { loadRegisterPage, registerActions } from '$lib/features/registration/registration.server';
import { assertHostKind } from '$lib/utils/host-context';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// Pendaftaran lembaga hanya di host publik (SAD Bagian III §5.1).
	assertHostKind(event.locals.host, ['public', 'unified']);
	return loadRegisterPage(event);
};

export const actions: Actions = registerActions;
