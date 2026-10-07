import { dev } from '$app/environment';
import { env as privateEnv } from '$env/dynamic/private';
import { env } from '$env/dynamic/public';
import { clearBackendTokens, verifyBackendSession } from '$lib/auth/backend-auth';
import { UNRESOLVED_SESSION } from '$lib/auth/session';
import { clearSessionMeta, writeSessionEnded } from '$lib/auth/session-meta';
import { DEFAULT_LOCALE } from '$lib/i18n';
import { COLOR_MODE_COOKIE, resolveColorMode } from '$lib/utils/color-mode';
import { RESERVED_SUBDOMAINS, UNIFIED_DEV_HOST, resolveHostContext } from '$lib/utils/host-context';
import { REQUIRED_BODY_BYTES, parseBodySizeLimit } from '$lib/utils/upload-limits';
import type { Handle, HandleServerError, RequestEvent, ServerInit } from '@sveltejs/kit';

const HTML_LANG_PLACEHOLDER = '%lms.lang%';
const HTML_MODE_PLACEHOLDER = '%lms.mode%';
const PERMANENT_REDIRECT_STATUS = 308;

/**
 * Server produksi (adapter-node) menolak body di atas `BODY_SIZE_LIMIT` (default 512K), padahal foto
 * profil dan dokumen pengajuan dikirim base64. Peringatan sejak server start agar salah konfigurasi
 * terlihat sebelum pengguna gagal mengunggah. Dev (Vite) tidak membatasi body.
 */
export const init: ServerInit = () => {
	if (dev) return;
	const limit = parseBodySizeLimit(privateEnv.BODY_SIZE_LIMIT);
	if (limit === null || limit < REQUIRED_BODY_BYTES) {
		console.warn(
			`[hooks.server] BODY_SIZE_LIMIT=${privateEnv.BODY_SIZE_LIMIT || '(tidak diset, default 512K)'} terlalu kecil; ` +
				`unggahan foto/dokumen butuh minimal ${Math.ceil(REQUIRED_BODY_BYTES / 1024 / 1024)}M. Set BODY_SIZE_LIMIT=8M.`
		);
	}
};

export const handle: Handle = async ({ event, resolve }) => {
	// Root domain selalu dari environment; tanpa nilai, semua host dianggap tidak dikenal (fail-closed).
	const resolvedHost = resolveHostContext(event.url.hostname, env.PUBLIC_LMS_ROOT_DOMAIN ?? '');
	// Dev: root domain = host gabungan (satu URL untuk platform & sekolah). Produksi: tidak pernah.
	const host = dev && resolvedHost.kind === 'public' ? UNIFIED_DEV_HOST : resolvedHost;

	if (host.kind === 'www') {
		const target = new URL(event.url);
		target.hostname = target.hostname.slice(RESERVED_SUBDOMAINS.WWW.length + 1);
		return new Response(null, {
			status: PERMANENT_REDIRECT_STATUS,
			headers: { location: target.href }
		});
	}

	event.locals.host = host;
	// UI hanya Bahasa Indonesia (FE-04R); tidak ada preferensi bahasa yang dibaca dari request.
	event.locals.locale = DEFAULT_LOCALE;
	// Preferensi mode warna (FE-05R); nilai tak dikenal → `system`.
	event.locals.colorMode = resolveColorMode(event.cookies.get(COLOR_MODE_COOKIE));
	// Integrasi sesi menunggu kontrak auth backend (BLOCKED-02, ADR-019 OQ-1..OQ-3).
	// Produksi: selalu `unresolved` (anonim). Dev: sesi contoh (FE-05), tidak ikut build produksi.
	event.locals.session = dev ? await resolveDevSession(event) : UNRESOLVED_SESSION;

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html
				.replace(HTML_LANG_PLACEHOLDER, event.locals.locale)
				.replace(HTML_MODE_PLACEHOLDER, event.locals.colorMode)
	});
};

/**
 * Sesi dev = persona contoh + (bila masuk lewat backend) token yang diverifikasi ke backend tiap request.
 * Multi-sesi: bila backend mencabut sesi perangkat ini (dikeluarkan dari Pengaturan Akun), cookie dihapus
 * dan halaman masuk menampilkan alasannya. Backend tak terjangkau → anonim tanpa menghapus cookie.
 */
async function resolveDevSession(event: RequestEvent) {
	const devSession = await import('$lib/auth/dev-session.fixture');
	const status = await verifyBackendSession(event.fetch, event.cookies);
	if (status === 'revoked' || status === 'expired') {
		clearBackendTokens(event.cookies);
		devSession.clearDevSession(event.cookies);
		clearSessionMeta(event.cookies);
		writeSessionEnded(event.cookies, status);
		return UNRESOLVED_SESSION;
	}
	if (status === 'unavailable') return UNRESOLVED_SESSION;
	return devSession.readDevSession(event.cookies);
}

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	// Detail hanya di log server; klien menerima pesan generik (SAD §10.2).
	if (status >= 500) {
		console.error('[hooks.server] Unhandled error', { path: event.url.pathname, status, error });
	}
	return { message };
};
