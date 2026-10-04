import { dev } from '$app/environment';
import type { LayoutServerLoad } from './$types';

// Identitas dari sesi menunggu kontrak auth (BLOCKED-02); data contoh hanya di dev (FE-04 D2).
export const load: LayoutServerLoad = async () => ({
	identity: dev ? (await import('../workspace.fixture')).schoolIdentityFixtures.admin : null
});
