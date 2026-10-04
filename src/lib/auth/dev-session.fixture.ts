/**
 * SESI CONTOH — HANYA DEV (keputusan FE-05, pola sama dengan fixture FE-04 D2).
 *
 * Modul ini hanya dimuat lewat `dev ? await import(...) : ...`; build produksi tidak menyertakannya
 * dan tidak pernah menghasilkan sesi terautentikasi. Ini BUKAN autentikasi: tidak ada kredensial,
 * token, maupun kontrak backend (BLOCKED-02). Cookie hanya berisi ID persona contoh.
 */
import type { Cookies } from '@sveltejs/kit';
import { toAccessContext, type RawAccessContext } from './access-context';
import { UNRESOLVED_SESSION, type SessionState } from './session';

const DEV_SESSION_COOKIE = 'lms_dev_session';
const DEV_TENANT = 'demo';
const COOKIE_VALUE_SEPARATOR = '~';

type DevPersona = Omit<RawAccessContext, 'activeMembershipId'> & { readonly label: string };

const DEV_PERSONAS: Readonly<Record<string, DevPersona>> = {
	platform: {
		label: 'Pemilik platform',
		user: { id: 'dev-platform', displayName: 'Efan Andrian' },
		memberships: [{ id: 'm-platform', area: 'platform', tenant: null, label: 'FLIXARE Console' }]
	},
	'school-admin': {
		label: 'Admin sekolah',
		user: { id: 'dev-admin', displayName: 'Ahmad Fauzi' },
		memberships: [
			{ id: 'm-admin', area: 'school_admin', tenant: DEV_TENANT, label: 'Admin · SMA Nusantara' }
		]
	},
	teacher: {
		label: 'Guru',
		user: { id: 'dev-teacher', displayName: 'Rina Pratiwi' },
		memberships: [
			{ id: 'm-teacher', area: 'teacher', tenant: DEV_TENANT, label: 'Guru · SMA Nusantara' }
		]
	},
	student: {
		label: 'Murid',
		user: { id: 'dev-student', displayName: 'Dimas Pratama' },
		memberships: [
			{ id: 'm-student', area: 'student', tenant: DEV_TENANT, label: 'Murid · SMA Nusantara' }
		]
	},
	guardian: {
		label: 'Orang tua',
		user: { id: 'dev-guardian', displayName: 'Sari Wulandari' },
		memberships: [
			{ id: 'm-guardian', area: 'guardian', tenant: DEV_TENANT, label: 'Orang tua · SMA Nusantara' }
		]
	},
	'multi-context': {
		label: 'Guru + admin (multi-konteks)',
		user: { id: 'dev-multi', displayName: 'Budi Santoso' },
		memberships: [
			{ id: 'm-multi-teacher', area: 'teacher', tenant: DEV_TENANT, label: 'Guru · SMA Nusantara' },
			{
				id: 'm-multi-admin',
				area: 'school_admin',
				tenant: DEV_TENANT,
				label: 'Admin · SMA Nusantara'
			}
		]
	},
	'other-tenant': {
		label: 'Guru di lembaga lain',
		user: { id: 'dev-other', displayName: 'Lina Marlina' },
		memberships: [
			{ id: 'm-other', area: 'teacher', tenant: 'lembaga-lain', label: 'Guru · Lembaga lain' }
		]
	},
	'unsupported-role': {
		label: 'Peran tidak didukung',
		user: { id: 'dev-unknown', displayName: 'Peran Tak Dikenal' },
		memberships: [
			{
				id: 'm-unknown',
				area: 'librarian',
				tenant: DEV_TENANT,
				label: 'Pustakawan · SMA Nusantara'
			}
		]
	}
};

export interface DevPersonaOption {
	readonly id: string;
	readonly label: string;
	/** Host tempat persona masuk: subdomain tenant, atau `platform`. Sesi bersifat host-only. */
	readonly hostSubdomain: string;
}

export const devPersonaOptions: readonly DevPersonaOption[] = Object.entries(DEV_PERSONAS).map(
	([id, persona]) => ({
		id,
		label: persona.label,
		hostSubdomain: persona.memberships[0]?.tenant ?? 'platform'
	})
);

interface ParsedDevSession {
	readonly personaId: string;
	readonly persona: DevPersona;
	readonly activeId: string | null;
}

function parseCookie(value: string | undefined): ParsedDevSession | null {
	if (!value) return null;
	const [personaId = '', activeId] = value.split(COOKIE_VALUE_SEPARATOR);
	const persona = Object.hasOwn(DEV_PERSONAS, personaId) ? DEV_PERSONAS[personaId] : undefined;
	return persona ? { personaId, persona, activeId: activeId || null } : null;
}

function sessionFromValue(value: string | undefined): SessionState {
	const parsed = parseCookie(value);
	if (!parsed) return UNRESOLVED_SESSION;
	return {
		status: 'authenticated',
		context: toAccessContext({
			...parsed.persona,
			activeMembershipId: parsed.activeId
		})
	};
}

export function readDevSession(cookies: Cookies): SessionState {
	return sessionFromValue(cookies.get(DEV_SESSION_COOKIE));
}

export function readDevPersonaLabel(cookies: Cookies): string | null {
	const parsed = parseCookie(cookies.get(DEV_SESSION_COOKIE));
	return parsed?.persona.label ?? null;
}

export function writeDevSession(
	cookies: Cookies,
	personaId: string,
	activeMembershipId: string | null = null
): SessionState {
	if (!Object.hasOwn(DEV_PERSONAS, personaId)) return UNRESOLVED_SESSION;
	const value = activeMembershipId
		? `${personaId}${COOKIE_VALUE_SEPARATOR}${activeMembershipId}`
		: personaId;
	cookies.set(DEV_SESSION_COOKIE, value, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false
	});
	return sessionFromValue(value);
}

export function currentDevPersonaId(cookies: Cookies): string | null {
	return parseCookie(cookies.get(DEV_SESSION_COOKIE))?.personaId ?? null;
}

export function clearDevSession(cookies: Cookies): void {
	cookies.delete(DEV_SESSION_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax', secure: false });
}

/** Email seed backend lokal → persona contoh. Email lain → peran tidak didukung (akses ditolak). */
const DEV_PERSONA_BY_EMAIL: Readonly<Record<string, string>> = {
	'platform@flixare.com': 'platform',
	'admin@school.com': 'school-admin',
	'teacher@school.com': 'teacher',
	'student@school.com': 'student',
	'guardian@school.com': 'guardian'
};

export function personaIdForEmail(email: string): string {
	return DEV_PERSONA_BY_EMAIL[email.trim().toLowerCase()] ?? 'unsupported-role';
}
