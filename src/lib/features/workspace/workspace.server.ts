import type { AccountArea } from '$lib/api/generated/lms';
import { clientMeta } from '$lib/auth/finish-login';
import type { RequestEvent } from '@sveltejs/kit';
import { loadWorkspaceIdentity } from './workspace.api';

/**
 * Identitas workspace (kartu lembaga & user, sapaan dashboard, badge menu) dari backend untuk layout
 * area. `null` bila belum masuk lewat backend atau konteks area tidak ada — shell tampil tanpa kartu.
 */
export async function loadWorkspace(event: RequestEvent, area: AccountArea) {
	const result = await loadWorkspaceIdentity(
		{
			fetch: event.fetch,
			cookies: event.cookies,
			userAgent: event.request.headers.get('user-agent') ?? '',
			clientAddress: clientMeta(event).address
		},
		area
	);
	return result.ok ? result.data : null;
}
