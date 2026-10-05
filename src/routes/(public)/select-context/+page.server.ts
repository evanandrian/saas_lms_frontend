import { dev } from '$app/environment';
import {
	eligibleMemberships,
	enforceRouteAccess,
	resolvePostAuthDestination
} from '$lib/auth/dashboard-routing';
import { assertHostKind } from '$lib/utils/host-context';
import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const SEE_OTHER_STATUS = 303;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;

export const load: PageServerLoad = ({ locals, url }) => {
	assertHostKind(locals.host, ['platform', 'tenant', 'unified']);
	enforceRouteAccess(locals.session, locals.host, url);
	return {
		contexts: eligibleMemberships(locals.session, locals.host).map(({ id, label }) => ({
			id,
			label
		}))
	};
};

export const actions: Actions = {
	select: async ({ locals, request, cookies }) => {
		assertHostKind(locals.host, ['platform', 'tenant', 'unified']);
		const membershipId = (await request.formData()).get('membershipId');
		const isEligible = eligibleMemberships(locals.session, locals.host).some(
			(membership) => membership.id === membershipId
		);
		if (typeof membershipId !== 'string' || !isEligible) {
			error(HTTP_BAD_REQUEST, { message: 'Bad Request' });
		}
		// Penyimpanan konteks aktif adalah operasi sesi backend (BLOCKED-02); kini hanya sesi contoh dev.
		const devSession = dev ? await import('$lib/auth/dev-session.fixture') : null;
		if (!devSession) error(HTTP_NOT_FOUND, { message: 'Not Found' });
		const personaId = devSession.currentDevPersonaId(cookies);
		if (!personaId) error(HTTP_BAD_REQUEST, { message: 'Bad Request' });
		const session = devSession.writeDevSession(cookies, personaId, membershipId);
		redirect(SEE_OTHER_STATUS, resolvePostAuthDestination(session, locals.host));
	}
};
