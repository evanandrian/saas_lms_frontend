import { assertHostKind } from '$lib/utils/host-context';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const HTTP_FORBIDDEN = 403;

// Tujuan eksplisit bila pengguna terautentikasi tidak memiliki konteks/area yang sah (FE-05):
// tidak pernah dialihkan diam-diam ke dashboard lain.
export const load: PageServerLoad = ({ locals }) => {
	assertHostKind(locals.host, ['platform', 'tenant', 'unified']);
	error(HTTP_FORBIDDEN, { message: 'Forbidden', code: 'ACCESS_DENIED' });
};
