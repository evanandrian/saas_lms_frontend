import { loadRoleShell } from '$lib/features/navigation/role-shell.server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => loadRoleShell(event, 'guardian');
