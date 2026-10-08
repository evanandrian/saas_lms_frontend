import type { AccessContext } from './access-context';

/**
 * Batas integrasi sesi (ADR-019).
 *
 * Produksi: `resolveProductionSession()` (`backend-session.ts`) memverifikasi cookie token ke
 * `/auth/me` tiap request dan memetakan roles → WorkspaceArea; `unresolved` = anonim (fail-closed).
 * Dev: sesi contoh dev-only (FE-05) yang juga diverifikasi ke backend bila token ada.
 * Backend tetap otoritas keamanan; frontend tidak mem-parse JWT.
 */
export type SessionState =
	| { readonly status: 'unresolved' }
	| { readonly status: 'authenticated'; readonly context: AccessContext };

export const UNRESOLVED_SESSION: SessionState = Object.freeze({ status: 'unresolved' });
