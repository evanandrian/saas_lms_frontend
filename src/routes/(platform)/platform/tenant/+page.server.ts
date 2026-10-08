import { fail } from '@sveltejs/kit';
import { loadTenants, suspendTenant, activateTenant } from '$lib/features/tenant-management/tenant-management.api';
import type { PageServerLoad, Actions } from './$types';

const makeCtx = (e: any) => ({
	fetch: e.fetch,
	cookies: e.cookies,
	userAgent: e.request.headers.get('user-agent') || '',
	clientAddress: e.getClientAddress()
});

export const load: PageServerLoad = async (event) => {
	const res = await loadTenants(makeCtx(event));
	return {
		tenants: res.ok ? res.data : null,
		failure: res.ok ? null : res.reason
	};
};

export const actions: Actions = {
	suspend: async (event) => {
		const form = await event.request.formData();
		const body = JSON.parse(form.get('body')?.toString() || '{}');
		if (!body.tenantId) return fail(400, { reason: 'missing_id', code: 'missing_id' });
		const res = await suspendTenant(makeCtx(event), body.tenantId);
		if (!res.ok) return fail(500, { reason: res.reason, code: res.code });
		return { result: true };
	},
	activate: async (event) => {
		const form = await event.request.formData();
		const body = JSON.parse(form.get('body')?.toString() || '{}');
		if (!body.tenantId) return fail(400, { reason: 'missing_id', code: 'missing_id' });
		const res = await activateTenant(makeCtx(event), body.tenantId);
		if (!res.ok) return fail(500, { reason: res.reason, code: res.code });
		return { result: true };
	}
};
