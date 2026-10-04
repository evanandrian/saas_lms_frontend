import { readSessionMeta } from '$lib/auth/session-meta';
import { assertHostKind } from '$lib/utils/host-context';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, cookies }) => {
	// Host di luar topologi (tidak dikenal atau `api.<root>`) tidak dilayani SvelteKit (ADR-019 §1).
	assertHostKind(locals.host, ['public', 'platform', 'tenant', 'unified']);
	return {
		locale: locals.locale,
		colorMode: locals.colorMode,
		// Waktu masuk (epoch ms) untuk dialog keluar; hanya tampilan, bukan status autentikasi.
		sessionStartedAt: readSessionMeta(cookies)?.startedAt ?? null
	};
};
