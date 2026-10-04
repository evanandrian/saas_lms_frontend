import type { Cookies } from '@sveltejs/kit';
import { isWorkspaceArea, type WorkspaceArea } from './access-context';

/**
 * Metadata tampilan sesi (FE-06) — BUKAN kredensial. Disimpan di cookie HttpOnly host-only:
 * - `lms_session_meta`: waktu masuk + email yang dipakai masuk (untuk "Masuk sejak" & kartu akun);
 * - `lms_logout_notice`: ringkasan sekali baca untuk halaman "Anda telah keluar" (umur 2 menit);
 * - `lms_reauth_email`: email untuk tombol "Masuk kembali" setelah keluar (umur 15 menit);
 * - `lms_session_ended`: alasan sesi berakhir (dicabut perangkat lain / kedaluwarsa), sekali tampil.
 * Token/sesi tetap urusan kontrak auth backend (BLOCKED-02).
 */
const SESSION_META_COOKIE = 'lms_session_meta';
const LOGOUT_NOTICE_COOKIE = 'lms_logout_notice';
const LOGOUT_NOTICE_MAX_AGE_SECONDS = 120;
const REAUTH_EMAIL_COOKIE = 'lms_reauth_email';
const REAUTH_EMAIL_MAX_AGE_SECONDS = 15 * 60;
const SESSION_ENDED_COOKIE = 'lms_session_ended';
const SESSION_ENDED_MAX_AGE_SECONDS = 120;
const COOKIE_OPTIONS = { path: '/', httpOnly: true, sameSite: 'lax' } as const;

export interface SessionMeta {
	readonly startedAt: number;
	readonly email: string | null;
}

export interface LogoutNotice {
	readonly name: string;
	readonly area: WorkspaceArea | null;
	readonly email: string | null;
	readonly durationMinutes: number | null;
}

function parseJson(value: string | undefined): Record<string, unknown> | null {
	if (!value) return null;
	try {
		const parsed: unknown = JSON.parse(value);
		return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

const stringOrNull = (value: unknown) => (typeof value === 'string' && value ? value : null);

export function writeSessionMeta(cookies: Cookies, email: string | null): void {
	const meta: SessionMeta = { startedAt: Date.now(), email };
	cookies.set(SESSION_META_COOKIE, JSON.stringify(meta), COOKIE_OPTIONS);
}

export function readSessionMeta(cookies: Cookies): SessionMeta | null {
	const raw = parseJson(cookies.get(SESSION_META_COOKIE));
	if (!raw || typeof raw.startedAt !== 'number') return null;
	return { startedAt: raw.startedAt, email: stringOrNull(raw.email) };
}

export function clearSessionMeta(cookies: Cookies): void {
	cookies.delete(SESSION_META_COOKIE, COOKIE_OPTIONS);
}

export function writeLogoutNotice(cookies: Cookies, notice: LogoutNotice): void {
	cookies.set(LOGOUT_NOTICE_COOKIE, JSON.stringify(notice), {
		...COOKIE_OPTIONS,
		maxAge: LOGOUT_NOTICE_MAX_AGE_SECONDS
	});
}

/** Membaca lalu menghapus pemberitahuan (sekali tampil). */
export function consumeLogoutNotice(cookies: Cookies): LogoutNotice | null {
	const raw = parseJson(cookies.get(LOGOUT_NOTICE_COOKIE));
	cookies.delete(LOGOUT_NOTICE_COOKIE, COOKIE_OPTIONS);
	if (!raw || typeof raw.name !== 'string') return null;
	return {
		name: raw.name,
		area: isWorkspaceArea(raw.area) ? raw.area : null,
		email: stringOrNull(raw.email),
		durationMinutes: typeof raw.durationMinutes === 'number' ? raw.durationMinutes : null
	};
}

export function writeReauthEmail(cookies: Cookies, email: string): void {
	cookies.set(REAUTH_EMAIL_COOKIE, email, {
		...COOKIE_OPTIONS,
		maxAge: REAUTH_EMAIL_MAX_AGE_SECONDS
	});
}

export function readReauthEmail(cookies: Cookies): string | null {
	return stringOrNull(cookies.get(REAUTH_EMAIL_COOKIE));
}

export function clearReauthEmail(cookies: Cookies): void {
	cookies.delete(REAUTH_EMAIL_COOKIE, COOKIE_OPTIONS);
}

/** `revoked` = akun masuk di perangkat lain atau keluar dari perangkat lain; `expired` = sesi habis. */
export type SessionEndedReason = 'revoked' | 'expired';

export function writeSessionEnded(cookies: Cookies, reason: SessionEndedReason): void {
	cookies.set(SESSION_ENDED_COOKIE, reason, {
		...COOKIE_OPTIONS,
		maxAge: SESSION_ENDED_MAX_AGE_SECONDS
	});
}

/** Membaca lalu menghapus alasan sesi berakhir (sekali tampil di halaman masuk). */
export function consumeSessionEnded(cookies: Cookies): SessionEndedReason | null {
	const value = cookies.get(SESSION_ENDED_COOKIE);
	if (value) cookies.delete(SESSION_ENDED_COOKIE, COOKIE_OPTIONS);
	return value === 'revoked' || value === 'expired' ? value : null;
}
