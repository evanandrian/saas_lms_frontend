import { loadWorkspace } from '$lib/features/workspace/workspace.server';
import type { LayoutServerLoad } from './$types';

// Kartu lembaga/user, sapaan dashboard, dan badge menu dari backend.
export const load: LayoutServerLoad = async (event) => ({
	workspace: await loadWorkspace(event, 'guardian')
});
