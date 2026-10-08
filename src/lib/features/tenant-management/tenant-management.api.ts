import { callBackend, type BackendContext } from '$lib/api/backend-call';
import type { TenantResponse } from './tenant-management.model';

export const loadTenants = (ctx: BackendContext) =>
	callBackend<TenantResponse[]>(ctx, async (init) => {
		const res = await init.fetch(`${init.baseUrl}/api/v1/platform/tenants`, {
			headers: { ...init.headers, Authorization: `Bearer ${init.token}` }
		});
		let data: any = {};
		try { data = await res.json(); } catch { /* ignore */ }
		return { status: res.status, data };
	});

export const suspendTenant = (ctx: BackendContext, id: string) =>
	callBackend<void>(ctx, async (init) => {
		const res = await init.fetch(`${init.baseUrl}/api/v1/platform/tenants/${id}/suspend`, {
			method: 'POST',
			headers: { ...init.headers, Authorization: `Bearer ${init.token}` }
		});
		let data: any = {};
		try { data = await res.json(); } catch { /* ignore */ }
		return { status: res.status, data };
	});

export const activateTenant = (ctx: BackendContext, id: string) =>
	callBackend<void>(ctx, async (init) => {
		const res = await init.fetch(`${init.baseUrl}/api/v1/platform/tenants/${id}/activate`, {
			method: 'POST',
			headers: { ...init.headers, Authorization: `Bearer ${init.token}` }
		});
		let data: any = {};
		try { data = await res.json(); } catch { /* ignore */ }
		return { status: res.status, data };
	});
