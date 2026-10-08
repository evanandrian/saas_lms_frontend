import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cookies } from '@sveltejs/kit';

/**
 * Matriks uji BLOCKED-02 (B02-01..12): resolusi sesi produksi `resolveProductionSession`.
 *
 * Mode produksi disimulasikan dengan `dev = false`; panggilan backend disimulasikan stub `fetch`
 * yang meniru kontrak aktual `GET /api/v1/auth/{me,refresh}` (diverifikasi langsung terhadap
 * backend lokal: `/auth/me` → `{data:{id,email,full_name,status,memberships,roles}}`,
 * `/auth/refresh` → `{data:{token,refresh_token}}`, galat → `401 {error:{code}}`).
 */
vi.mock('$app/environment', () => ({ dev: false }));

const envState = vi.hoisted(() => ({
	LMS_API_INTERNAL_URL: 'http://backend.test' as string | undefined
}));
vi.mock('$env/dynamic/private', () => ({
	get env() {
		return envState;
	}
}));

const { resolveProductionSession } = await import('$lib/auth/backend-session');

const TOKEN_COOKIE = 'lms_token';
const REFRESH_COOKIE = 'lms_refresh_token';
const ENDED_COOKIE = 'lms_session_ended';

type CookieJar = Cookies & { readonly jar: ReadonlyMap<string, string> };

function createCookies(initial: Record<string, string> = {}): CookieJar {
	const jar = new Map(Object.entries(initial));
	return {
		jar,
		get: (name: string) => jar.get(name),
		set: (name: string, value: string) => void jar.set(name, value),
		delete: (name: string) => void jar.delete(name),
		getAll: () => [...jar].map(([name, value]) => ({ name, value }))
	} as unknown as CookieJar;
}

const withTokens = (extra: Record<string, string> = {}) =>
	createCookies({ [TOKEN_COOKIE]: 'token-lama', [REFRESH_COOKIE]: 'refresh-lama', ...extra });

const jsonResponse = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

const meBody = (roles: { tenant_code: string; role_code: string }[]) => ({
	data: {
		id: 'user-uuid-1',
		email: 'pengguna@flixare.com',
		full_name: 'Pengguna Uji',
		status: 'ACTIVE',
		memberships: [...new Set(roles.map((r) => r.tenant_code))],
		roles
	}
});

const REFRESH_OK = { data: { token: 'token-baru', refresh_token: 'refresh-baru' } };
const ERROR = (code: string) => ({ error: { code, message: code } });

/**
 * Stub fetch dengan antrean respons per endpoint (memungkinkan skenario 401 → refresh → 200).
 * Kontrak asli memanggil `/me` dua kali per request (verifikasi + identitas): setelah antrean
 * habis, panggilan berikutnya mengulang respons terakhir.
 */
function stubFetch(handlers: {
	me?: (() => Response | Promise<Response>)[];
	refresh?: (() => Response | Promise<Response>)[];
}) {
	const calls: string[] = [];
	const endpoint = (
		queue: (() => Response | Promise<Response>)[] | undefined,
		fallback: () => Response | Promise<Response>
	) => {
		let last = fallback;
		return (): Response | Promise<Response> => {
			const item = queue?.shift();
			if (item) last = item;
			return last();
		};
	};
	const me = endpoint(handlers.me, () => jsonResponse(401, ERROR('invalid_token')));
	const refresh = endpoint(handlers.refresh, () => jsonResponse(401, ERROR('invalid_token')));
	const fetcher = vi.fn(async (input: RequestInfo | URL) => {
		const url = String(input);
		if (url.endsWith('/auth/me')) {
			calls.push('me');
			return me();
		}
		if (url.endsWith('/auth/refresh')) {
			calls.push('refresh');
			return refresh();
		}
		throw new Error(`fetch tak terduga: ${url}`);
	});
	return { fetcher, calls };
}

const ROLE_PLATFORM = { tenant_code: 'lms_core', role_code: 'PLATFORM_OWNER' };
const ROLE_ADMIN = { tenant_code: 'test_school_mat', role_code: 'SCHOOL_ADMIN' };

beforeEach(() => {
	envState.LMS_API_INTERNAL_URL = 'http://backend.test';
});

describe('BLOCKED-02 — resolusi sesi produksi', () => {
	it('B02-01: tanpa cookie token → anonim tanpa memanggil backend', async () => {
		const { fetcher, calls } = stubFetch({});
		const session = await resolveProductionSession(fetcher, createCookies());
		expect(session).toEqual({ status: 'unresolved' });
		expect(calls).toEqual([]);
	});

	it('B02-02: token valid → terautentikasi dengan identitas dari /auth/me', async () => {
		const { fetcher } = stubFetch({ me: [() => jsonResponse(200, meBody([ROLE_ADMIN]))] });
		const session = await resolveProductionSession(fetcher, withTokens());
		expect(session.status).toBe('authenticated');
		if (session.status !== 'authenticated') return;
		expect(session.context.user).toEqual({ id: 'user-uuid-1', displayName: 'Pengguna Uji' });
		expect(session.context.memberships).toHaveLength(1);
	});

	it('B02-03: role tak dikenal → membership dibuang (tanpa fallback ke area lain)', async () => {
		const { fetcher } = stubFetch({
			me: [
				() =>
					jsonResponse(200, meBody([{ tenant_code: 'test_school_mat', role_code: 'ROLE_BARU' }]))
			]
		});
		const session = await resolveProductionSession(fetcher, withTokens());
		expect(session.status).toBe('authenticated');
		if (session.status !== 'authenticated') return;
		expect(session.context.memberships).toEqual([]);
	});

	it('B02-04: sesi dicabut → token dihapus, penanda `revoked`, anonim', async () => {
		const { fetcher } = stubFetch({ me: [() => jsonResponse(401, ERROR('session_revoked'))] });
		const cookies = withTokens({ lms_session_meta: '{"startedAt":1}' });
		const session = await resolveProductionSession(fetcher, cookies);
		expect(session).toEqual({ status: 'unresolved' });
		expect(cookies.jar.has(TOKEN_COOKIE)).toBe(false);
		expect(cookies.jar.has(REFRESH_COOKIE)).toBe(false);
		expect(cookies.jar.has('lms_session_meta')).toBe(false);
		expect(cookies.jar.get(ENDED_COOKIE)).toBe('revoked');
	});

	it('B02-05: token kedaluwarsa + refresh berhasil → sesi baru terautentikasi', async () => {
		const { fetcher, calls } = stubFetch({
			me: [
				() => jsonResponse(401, ERROR('invalid_token')),
				() => jsonResponse(200, meBody([ROLE_PLATFORM]))
			],
			refresh: [() => jsonResponse(200, REFRESH_OK)]
		});
		const cookies = withTokens();
		const session = await resolveProductionSession(fetcher, cookies);
		expect(session.status).toBe('authenticated');
		expect(cookies.jar.get(TOKEN_COOKIE)).toBe('token-baru');
		expect(calls).toEqual(['me', 'refresh', 'me']);
	});

	it('B02-06: refresh gagal → token dihapus, penanda `expired`, anonim', async () => {
		const { fetcher } = stubFetch({
			me: [() => jsonResponse(401, ERROR('invalid_token'))],
			refresh: [() => jsonResponse(401, ERROR('invalid_token'))]
		});
		const cookies = withTokens();
		const session = await resolveProductionSession(fetcher, cookies);
		expect(session).toEqual({ status: 'unresolved' });
		expect(cookies.jar.has(TOKEN_COOKIE)).toBe(false);
		expect(cookies.jar.get(ENDED_COOKIE)).toBe('expired');
	});

	it('B02-07: backend tak terjangkau → anonim tanpa menghapus cookie', async () => {
		const fetcher = vi.fn(async () => {
			throw new Error('koneksi gagal');
		});
		const cookies = withTokens();
		const session = await resolveProductionSession(fetcher, cookies);
		expect(session).toEqual({ status: 'unresolved' });
		expect(cookies.jar.get(TOKEN_COOKIE)).toBe('token-lama');
		expect(cookies.jar.get(REFRESH_COOKIE)).toBe('refresh-lama');
		expect(cookies.jar.has(ENDED_COOKIE)).toBe(false);
	});

	it('B02-08: produksi tanpa LMS_API_INTERNAL_URL → anonim, tanpa panggilan, cookie utuh', async () => {
		envState.LMS_API_INTERNAL_URL = undefined;
		const { fetcher, calls } = stubFetch({});
		const cookies = withTokens();
		const session = await resolveProductionSession(fetcher, cookies);
		expect(session).toEqual({ status: 'unresolved' });
		expect(calls).toEqual([]);
		expect(cookies.jar.get(TOKEN_COOKIE)).toBe('token-lama');
	});

	it('B02-09: membership platform → area `platform`, tenant `null`', async () => {
		const { fetcher } = stubFetch({ me: [() => jsonResponse(200, meBody([ROLE_PLATFORM]))] });
		const session = await resolveProductionSession(fetcher, withTokens());
		if (session.status !== 'authenticated') throw new Error('seharusnya terautentikasi');
		expect(session.context.memberships).toEqual([
			{ id: 'lms_core', area: 'platform', tenant: null, label: 'lms_core' }
		]);
		expect(session.context.activeMembershipId).toBeNull();
	});

	it('B02-10: membership tenant → area sesuai role, tenant = subdomain', async () => {
		const { fetcher } = stubFetch({ me: [() => jsonResponse(200, meBody([ROLE_ADMIN]))] });
		const session = await resolveProductionSession(fetcher, withTokens());
		if (session.status !== 'authenticated') throw new Error('seharusnya terautentikasi');
		expect(session.context.memberships).toEqual([
			{
				id: 'test_school_mat',
				area: 'school_admin',
				tenant: 'test_school_mat',
				label: 'test_school_mat'
			}
		]);
	});

	it('B02-11: backend menjawab 500 → anonim, cookie tidak dihapus', async () => {
		const { fetcher } = stubFetch({ me: [() => jsonResponse(500, ERROR('internal_error'))] });
		const cookies = withTokens();
		const session = await resolveProductionSession(fetcher, cookies);
		expect(session).toEqual({ status: 'unresolved' });
		expect(cookies.jar.get(TOKEN_COOKIE)).toBe('token-lama');
		expect(cookies.jar.has(ENDED_COOKIE)).toBe(false);
	});

	it('B02-12: respons valid tanpa roles → terautentikasi tanpa membership (landing akses ditolak)', async () => {
		const { fetcher } = stubFetch({ me: [() => jsonResponse(200, meBody([]))] });
		const session = await resolveProductionSession(fetcher, withTokens());
		expect(session.status).toBe('authenticated');
		if (session.status !== 'authenticated') return;
		expect(session.context.memberships).toEqual([]);
	});
});
