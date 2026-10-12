import { clientMeta } from '$lib/auth/finish-login';
import { activateStudent } from '$lib/features/school-admin/school-admin.api';
import { retryMinutes } from '$lib/features/school-admin/school-admin.model';
import { HTTP_STATUS_BY_FAILURE } from '$lib/features/school-admin/school-admin.server';
import { assertHostKind } from '$lib/utils/host-context';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/** Aktivasi akun murid tanpa email: username + kode aktivasi dari sekolah → buat kata sandi. */
export const load: PageServerLoad = ({ locals }) => {
	assertHostKind(locals.host, ['public', 'platform', 'tenant', 'unified']);
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const username = String(form.get('username') ?? '').trim();
		const result = await activateStudent(
			{
				fetch: event.fetch,
				userAgent: event.request.headers.get('user-agent') ?? '',
				clientAddress: clientMeta(event).address
			},
			{
				username,
				code: String(form.get('code') ?? ''),
				password: String(form.get('password') ?? '')
			}
		);
		// 429 rate_limited: sisa menit dari details.retry_at untuk pesan "coba lagi dalam N menit".
		if (!result.ok)
			return fail(HTTP_STATUS_BY_FAILURE[result.reason], {
				code: result.issues[0]?.code ?? result.code,
				minutes: retryMinutes(result.retryAt),
				username
			});
		return { done: true, username };
	}
};
