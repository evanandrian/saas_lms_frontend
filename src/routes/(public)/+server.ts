import { landingLocation, resolveLanding } from '$lib/auth/dashboard-routing';
import { assertHostKind } from '$lib/utils/host-context';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const TEMPORARY_REDIRECT_STATUS = 307;

/**
 * Entry aplikasi (FE-05, ADR-019 Revisi 1): `/` di semua host yang dilayani SvelteKit membuka login,
 * atau landing hasil Dashboard Routing Policy bila sudah terautentikasi.
 * Endpoint (bukan halaman) karena `/` tidak pernah merender konten.
 */
export const GET: RequestHandler = ({ locals }) => {
	assertHostKind(locals.host, ['public', 'platform', 'tenant', 'unified']);
	redirect(TEMPORARY_REDIRECT_STATUS, landingLocation(resolveLanding(locals.session, locals.host)));
};
