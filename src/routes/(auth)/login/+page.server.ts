import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import { resolvePostAuthDestination } from '$lib/auth/dashboard-routing';
import { loginWithPassword } from '$lib/auth/backend-auth';
import {
	clearReauthEmail,
	consumeSessionEnded,
	readReauthEmail,
	writeSessionMeta
} from '$lib/auth/session-meta';
import { APP_PATHS, LOGIN_MODE_PARAM, LOGIN_MODES } from '$lib/utils/app-paths';
import { assertHostKind, buildPublicUrl } from '$lib/utils/host-context';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const SEE_OTHER_STATUS = 303;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_UNAUTHORIZED = 401;
const HTTP_SERVICE_UNAVAILABLE = 503;

/** Kode error form login; teks ditampilkan halaman lewat i18n (`auth.login.errors.*`). */
type LoginErrorCode = 'missing_fields' | 'invalid_credentials' | 'service_unavailable';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// Login = entry aplikasi di semua host yang dilayani (ADR-019 Revisi 1).
	assertHostKind(locals.host, ['public', 'platform', 'tenant', 'unified']);
	const rootDomain = env.PUBLIC_LMS_ROOT_DOMAIN ?? '';
	const mode = url.searchParams.get(LOGIN_MODE_PARAM);
	if (mode === LOGIN_MODES.OTHER) clearReauthEmail(cookies);
	return {
		// Pendaftaran lembaga berada di host publik (root domain).
		registerUrl: buildPublicUrl(url, rootDomain, APP_PATHS.REGISTER),
		// Peserta tryout (kode sesi) dilayani di host publik/tenant, bukan konsol platform.
		showTryoutLink: locals.host.kind !== 'platform',
		// Email tidak pernah ditaruh di URL; dibaca dari cookie HttpOnly yang ditulis saat keluar.
		reauthEmail: mode === LOGIN_MODES.REAUTH ? readReauthEmail(cookies) : null,
		sessionEnded: consumeSessionEnded(cookies),
		// Pengenalan akun saat mengetik hanya untuk dev (risiko user enumeration; pola FE-04 D2).
		devAccounts: dev ? (await import('./accounts.fixture')).devAccounts : null
	};
};

/**
 * Aksi masuk nyata menunggu kontrak auth (BLOCKED-02). Aksi di bawah hanya sesi contoh dev;
 * tujuan setelah masuk selalu diminta ke Dashboard Routing Policy, bukan ditentukan halaman ini.
 */
export const actions: Actions = {
	login: async ({ request, cookies, fetch, locals }) => {
		const form = await request.formData();
		const email = form.get('email');
		const password = form.get('password');

		const loginFailure = (status: number, code: LoginErrorCode) =>
			fail(status, { email: typeof email === 'string' ? email : '', error: code });

		if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
			return loginFailure(HTTP_BAD_REQUEST, 'missing_fields');
		}

		// Backend mengakhiri sesi akun ini di perangkat lain (kebijakan sesi tunggal, FE-06).
		const result = await loginWithPassword(fetch, cookies, email, password);
		if (!result.ok) {
			return loginFailure(
				result.reason === 'invalid_credentials' ? HTTP_UNAUTHORIZED : HTTP_SERVICE_UNAVAILABLE,
				result.reason
			);
		}
		// Metadata tampilan sesi (waktu masuk & email) untuk dialog/halaman keluar; bukan kredensial.
		writeSessionMeta(cookies, email);
		clearReauthEmail(cookies);

		// Sesi frontend masih memakai persona contoh sampai kontrak sesi tersedia (BLOCKED-02):
		// email seed backend lokal dipetakan ke persona dev.
		const devSession = dev ? await import('$lib/auth/dev-session.fixture') : null;
		if (devSession) {
			const session = devSession.writeDevSession(cookies, devSession.personaIdForEmail(email));
			redirect(SEE_OTHER_STATUS, resolvePostAuthDestination(session, locals.host));
		}

		// Root (`/`) meneruskan ke dashboard sesuai peran (Dashboard Routing Policy).
		redirect(SEE_OTHER_STATUS, '/');
	},
	devSignIn: async ({ locals, request, cookies }) => {
		// Ternary `dev ? import : null` agar modul sesi contoh tereliminasi dari build produksi.
		const devSession = dev ? await import('$lib/auth/dev-session.fixture') : null;
		if (!devSession) error(HTTP_NOT_FOUND, { message: 'Not Found' });
		assertHostKind(locals.host, ['platform', 'tenant', 'unified']);
		const form = await request.formData();
		const personaId = form.get('persona');
		if (typeof personaId !== 'string') error(HTTP_BAD_REQUEST, { message: 'Bad Request' });

		const session = devSession.writeDevSession(cookies, personaId);
		if (session.status !== 'authenticated') error(HTTP_BAD_REQUEST, { message: 'Bad Request' });
		writeSessionMeta(cookies, null);

		redirect(SEE_OTHER_STATUS, resolvePostAuthDestination(session, locals.host));
	},
	devSignOut: async ({ cookies }) => {
		const devSession = dev ? await import('$lib/auth/dev-session.fixture') : null;
		if (!devSession) error(HTTP_NOT_FOUND, { message: 'Not Found' });
		devSession.clearDevSession(cookies);
		redirect(SEE_OTHER_STATUS, APP_PATHS.LOGIN);
	}
};
