import { completeOAuthCallback } from '$lib/auth/backend-auth';
import { consumeLinkReturn, writeAccountNotice } from '$lib/features/account/account.server';
import { clientMeta, finishLogin } from '$lib/auth/finish-login';
import { APP_PATHS } from '$lib/utils/app-paths';
import { assertHostKind } from '$lib/utils/host-context';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const SEE_OTHER_STATUS = 303;

/** Return path internal saja (cegah open redirect); cadangan: halaman masuk. */
const safePath = (path: string) =>
	path.startsWith('/') && !path.startsWith('//') ? path : APP_PATHS.LOGIN;

/**
 * Callback penyedia OAuth (Google / belajar.id) untuk dua tujuan: menghubungkan akun dari
 * Pengaturan Akun, atau masuk dengan akun yang sudah terhubung.
 */
export const GET: RequestHandler = async (event) => {
	assertHostKind(event.locals.host, ['public', 'platform', 'tenant', 'unified']);
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const linkReturn = consumeLinkReturn(event.cookies);
	const missingCode = event.url.searchParams.get('error') ? 'oauth_cancelled' : 'oauth_failed';
	if (!code || !state) {
		if (linkReturn) {
			writeAccountNotice(event.cookies, { linkError: missingCode });
			redirect(SEE_OTHER_STATUS, linkReturn);
		}
		redirect(SEE_OTHER_STATUS, `${APP_PATHS.LOGIN}?oauth_error=${missingCode}`);
	}
	const result = await completeOAuthCallback(
		event.fetch,
		event.cookies,
		code,
		state,
		clientMeta(event)
	);
	if (result.kind === 'link') {
		writeAccountNotice(event.cookies, { linked: result.provider });
		redirect(SEE_OTHER_STATUS, safePath(result.returnTo));
	}
	if (result.kind === 'error' && linkReturn) {
		writeAccountNotice(event.cookies, { linkError: result.code });
		redirect(SEE_OTHER_STATUS, linkReturn);
	}
	if (result.kind === 'error') {
		redirect(SEE_OTHER_STATUS, `${APP_PATHS.LOGIN}?oauth_error=${encodeURIComponent(result.code)}`);
	}
	const login = result.result;
	if (login.ok) return finishLogin(event, '');
	// 2 langkah aktif → halaman masuk menampilkan langkah kode (tantangan di cookie HttpOnly).
	if (login.reason === 'two_factor_required') redirect(SEE_OTHER_STATUS, APP_PATHS.LOGIN);
	redirect(SEE_OTHER_STATUS, `${APP_PATHS.LOGIN}?oauth_error=${login.reason}`);
};
