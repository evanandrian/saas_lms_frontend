import type { AccessContext } from './access-context';

/**
 * Batas integrasi sesi (ADR-019).
 *
 * Bentuk sesi final, endpoint auth, nama cookie, dan alur refresh ditentukan oleh kontrak
 * auth backend yang belum tersedia (BLOCKED-02, OQ-1..OQ-3). Sampai kontrak itu ada,
 * frontend tidak mem-parse JWT, tidak menyimpan token, dan di build produksi tidak pernah
 * menganggap pengguna terautentikasi (`unresolved` diperlakukan sebagai anonim).
 * Status `authenticated` saat ini hanya dihasilkan sesi contoh dev-only (FE-05).
 * Backend tetap otoritas keamanan.
 */
export type SessionState =
	| { readonly status: 'unresolved' }
	| { readonly status: 'authenticated'; readonly context: AccessContext };

export const UNRESOLVED_SESSION: SessionState = Object.freeze({ status: 'unresolved' });
