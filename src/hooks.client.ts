import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = ({ error, status, message }) => {
	if (status >= 500) {
		console.error('[hooks.client] Unhandled error', { status, error });
	}
	return { message };
};
