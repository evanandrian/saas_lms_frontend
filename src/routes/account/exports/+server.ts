import { proxyAccountFile } from '$lib/features/account/account.server';
import { assertHostKind } from '$lib/utils/host-context';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

/** Unduh salinan data pribadi (`?id=`; berlaku 7 hari). */
export const GET: RequestHandler = (event) => {
	assertHostKind(event.locals.host, ['platform', 'tenant', 'unified']);
	const id = event.url.searchParams.get('id') ?? '';
	if (!UUID_PATTERN.test(id)) error(404, { message: 'Not Found' });
	return proxyAccountFile(event, `/api/v1/account/exports/${id}/download`);
};
