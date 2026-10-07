import { dev } from '$app/environment';
import { logoutCurrentDevice } from '$lib/auth/backend-auth';
import { eligibleMemberships } from '$lib/auth/dashboard-routing';
import {
	clearSessionMeta,
	readSessionMeta,
	writeLogoutNotice,
	writeReauthEmail
} from '$lib/auth/session-meta';
import { APP_PATHS } from '$lib/utils/app-paths';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const SEE_OTHER_STATUS = 303;
const MILLISECONDS_PER_MINUTE = 60_000;

export const POST: RequestHandler = async ({ cookies, fetch, locals }) => {
	// Ringkasan untuk halaman "Anda telah keluar" (FE-06) dibaca SEBELUM sesi dihapus.
	const context = locals.session.status === 'authenticated' ? locals.session.context : null;
	const meta = readSessionMeta(cookies);
	if (context) {
		const membership =
			eligibleMemberships(locals.session, locals.host).find(
				(item) => item.id === context.activeMembershipId
			) ?? eligibleMemberships(locals.session, locals.host)[0];
		writeLogoutNotice(cookies, {
			name: context.user.displayName,
			area: membership?.area ?? null,
			email: meta?.email ?? null,
			durationMinutes: meta
				? Math.max(1, Math.round((Date.now() - meta.startedAt) / MILLISECONDS_PER_MINUTE))
				: null
		});
	}

	// Keluar = akhiri sesi perangkat ini (multi-sesi, keputusan pemilik 6 Okt 2026).
	await logoutCurrentDevice(fetch, cookies);
	if (dev) (await import('$lib/auth/dev-session.fixture')).clearDevSession(cookies);
	clearSessionMeta(cookies);
	// Tombol "Masuk kembali" di halaman keluar mengisi email ini (cookie HttpOnly, bukan URL).
	if (meta?.email) writeReauthEmail(cookies, meta.email);

	redirect(SEE_OTHER_STATUS, APP_PATHS.LOGGED_OUT);
};
