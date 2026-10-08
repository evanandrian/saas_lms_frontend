import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	UNKNOWN_HOST_REASON,
	noteUnknownHost,
	resetUnknownHostReports,
	unknownHostReportCount
} from '$lib/utils/host-observability';

/**
 * Observabilitas host di luar topologi (MEM-01..08, P1): host `unknown` & `api.<root>` dicatat
 * satu kali per hostname+pathname (dedupe mengendalikan kebisingan log); host yang sah tidak.
 */

const unknown = { kind: 'unknown' as const };
const api = { kind: 'api' as const };
const platform = { kind: 'platform' as const };
const tenant = { kind: 'tenant' as const, subdomain: 'sekolah-ujian' };
const www = { kind: 'www' as const };
const root = { kind: 'public' as const };

beforeEach(() => {
	vi.restoreAllMocks();
	vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	resetUnknownHostReports();
});

describe('MEM — observabilitas host tak dikenal', () => {
	it('MEM-01: host `unknown` dicatat dengan alasan "di luar topologi"', () => {
		const access = noteUnknownHost(unknown, 'acak.example', '/');
		expect(access).toEqual({
			reason: UNKNOWN_HOST_REASON.unknown,
			hostname: 'acak.example',
			pathname: '/'
		});
		expect(console.warn).toHaveBeenCalledOnce();
	});

	it('MEM-02: host `api` dicatat dengan alasan ingress', () => {
		const access = noteUnknownHost(api, 'api.example.com', '/api/v1/school');
		expect(access?.reason).toBe(UNKNOWN_HOST_REASON.api);
		expect(console.warn).toHaveBeenCalledOnce();
	});

	it('MEM-03: hostname & pathname ikut tercatat (untuk diagnosa)', () => {
		noteUnknownHost(unknown, 'scanner.example', '/console');
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('scanner.example/console'));
	});

	it('MEM-04: dedupe — hostname+path sama tidak dicatat dua kali', () => {
		noteUnknownHost(unknown, 'acak.example', '/');
		expect(noteUnknownHost(unknown, 'acak.example', '/')).toBeNull();
		expect(console.warn).toHaveBeenCalledOnce();
	});

	it('MEM-05: path berbeda pada hostname yang sama tetap dicatat', () => {
		noteUnknownHost(unknown, 'acak.example', '/');
		expect(noteUnknownHost(unknown, 'acak.example', '/favicon.ico')).not.toBeNull();
		expect(console.warn).toHaveBeenCalledTimes(2);
	});

	it('MEM-06: subdomain bertingkat (`a.b.<root>`) → `unknown`, dicatat', () => {
		noteUnknownHost(unknown, 'a.b.namalms.id', '/login');
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('a.b.namalms.id/login'));
	});

	it('MEM-07: host `www` (redirect) TIDAK dicatat', () => {
		expect(noteUnknownHost(www, 'www.namalms.id', '/')).toBeNull();
		expect(console.warn).not.toHaveBeenCalled();
	});

	it('MEM-08: host sah (public/platform/tenant) TIDAK dicatat', () => {
		expect(noteUnknownHost(root, 'namalms.id', '/')).toBeNull();
		expect(noteUnknownHost(platform, 'platform.namalms.id', '/console')).toBeNull();
		expect(noteUnknownHost(tenant, 'sekolah-ujian.namalms.id', '/app/admin')).toBeNull();
		expect(console.warn).not.toHaveBeenCalled();
		expect(unknownHostReportCount()).toBe(0);
	});
});
