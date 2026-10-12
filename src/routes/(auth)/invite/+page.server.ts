import { clientMeta } from '$lib/auth/finish-login';
import { acceptInvitation, fetchInvitation } from '$lib/features/school-admin/school-admin.api';
import { RATE_LIMITED_CODE, retryMinutes } from '$lib/features/school-admin/school-admin.model';
import { HTTP_STATUS_BY_FAILURE } from '$lib/features/school-admin/school-admin.server';
import { assertHostKind } from '$lib/utils/host-context';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/** Tautan undangan akun dari admin sekolah (sekali pakai, 72 jam): pengguna membuat kata sandi. */
export const load: PageServerLoad = async (event) => {
	assertHostKind(event.locals.host, ['public', 'platform', 'tenant', 'unified']);
	const tenant = event.url.searchParams.get('t') ?? '';
	const token = event.url.searchParams.get('token') ?? '';
	if (!tenant || !token)
		return { invitation: null, tenant, token, rateLimited: false, minutes: null };
	const result = await fetchInvitation(publicCtx(event), tenant, token);
	if (result.ok)
		return { invitation: result.data, tenant, token, rateLimited: false, minutes: null };
	// 429 rate_limited dibedakan dari tautan tidak berlaku agar pengguna tahu harus menunggu.
	const rateLimited = result.code === RATE_LIMITED_CODE;
	return {
		invitation: null,
		tenant,
		token,
		rateLimited,
		minutes: rateLimited ? retryMinutes(result.retryAt) : null
	};
};

function publicCtx(event: Parameters<PageServerLoad>[0]) {
	return {
		fetch: event.fetch,
		userAgent: event.request.headers.get('user-agent') ?? '',
		clientAddress: clientMeta(event).address
	};
}

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const password = String(form.get('password') ?? '');
		const result = await acceptInvitation(
			{
				fetch: event.fetch,
				userAgent: event.request.headers.get('user-agent') ?? '',
				clientAddress: clientMeta(event).address
			},
			{
				tenant: String(form.get('tenant') ?? ''),
				token: String(form.get('token') ?? ''),
				password
			}
		);
		if (!result.ok)
			return fail(HTTP_STATUS_BY_FAILURE[result.reason], {
				code: result.issues[0]?.code ?? result.code,
				minutes: retryMinutes(result.retryAt)
			});
		return { done: true, email: result.data.email };
	}
};
