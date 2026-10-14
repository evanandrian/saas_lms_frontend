import { describe, expect, it } from 'vitest';
import { eligibleMemberships } from '$lib/auth/dashboard-routing';
import type { SessionState } from '$lib/auth/session';
import type { HostContext } from '$lib/utils/host-context';

/**
 * Host tenant ↔ membership (SAD `tenant_domain_s`): membership berlaku bila kode tenant hasil resolusi
 * host sama dengan kode tenant membership. Subdomain (`test-school-mat`) bukan kode (`test_school_mat`).
 */
const session: SessionState = {
	status: 'authenticated',
	context: {
		user: { id: 'u1', displayName: 'Ahmad' },
		memberships: [
			{ id: 'test_school_mat', area: 'school_admin', tenant: 'test_school_mat', label: 'A' },
			{ id: 'sch_07041994', area: 'school_admin', tenant: 'sch_07041994', label: 'B' }
		],
		activeMembershipId: null
	}
};

const host = (tenantCode?: string): HostContext => ({
	kind: 'tenant',
	subdomain: 'test-school-mat',
	tenantCode
});

describe('eligibleMemberships di host tenant', () => {
	it('RH-01: memakai kode tenant hasil resolusi, bukan label subdomain', () => {
		expect(eligibleMemberships(session, host('test_school_mat')).map((m) => m.id)).toEqual([
			'test_school_mat'
		]);
	});

	it('RH-02: host belum/tidak ter-resolve → tidak ada membership (fail-closed)', () => {
		expect(eligibleMemberships(session, host())).toEqual([]);
	});

	it('RH-03: label subdomain yang kebetulan sama dengan kode tidak cukup tanpa tenantCode', () => {
		const sameLabel: HostContext = { kind: 'tenant', subdomain: 'test_school_mat' };
		expect(eligibleMemberships(session, sameLabel)).toEqual([]);
	});
});
