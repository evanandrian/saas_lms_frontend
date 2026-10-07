import { dev } from '$app/environment';
import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { fetchBackendRoles, type ClientMeta } from './backend-auth';
import { resolvePostAuthDestination } from './dashboard-routing';
import { clearReauthEmail, writeSessionMeta } from './session-meta';

const SEE_OTHER_STATUS = 303;

/** Perangkat klien (User-Agent + alamat) yang diteruskan ke backend saat masuk. */
export function clientMeta(event: Pick<RequestEvent, 'request' | 'getClientAddress'>): ClientMeta {
	return {
		userAgent: event.request.headers.get('user-agent') ?? '',
		address: clientAddress(event)
	};
}

function clientAddress(event: Pick<RequestEvent, 'getClientAddress'>): string {
	try {
		return event.getClientAddress();
	} catch {
		return '';
	}
}

/**
 * Selesai masuk (kata sandi, 2 langkah, atau OAuth): metadata sesi lalu dashboard sesuai peran.
 * Sesi frontend masih persona contoh (BLOCKED-02): dipetakan dari email seed atau peran backend.
 */
export async function finishLogin(
	event: Pick<RequestEvent, 'cookies' | 'fetch' | 'locals'>,
	email: string
): Promise<never> {
	const { cookies, fetch, locals } = event;
	const identity = await fetchBackendRoles(fetch, cookies);
	const loginEmail = email || identity?.email || '';
	writeSessionMeta(cookies, loginEmail || null);
	clearReauthEmail(cookies);
	const devSession = dev ? await import('./dev-session.fixture') : null;
	if (devSession) {
		const session = devSession.writeDevSession(
			cookies,
			devSession.personaIdForBackend(loginEmail, identity?.roles ?? [])
		);
		redirect(SEE_OTHER_STATUS, resolvePostAuthDestination(session, locals.host));
	}
	// Root (`/`) meneruskan ke dashboard sesuai peran (Dashboard Routing Policy).
	redirect(SEE_OTHER_STATUS, '/');
}
