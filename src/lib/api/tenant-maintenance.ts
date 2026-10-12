import { error } from '@sveltejs/kit';
import type { BackendResult } from './backend-call';

/** Kode backend saat cluster database tenant sedang pemeliharaan (503, `Retry-After`). */
export const TENANT_MAINTENANCE_CODE = 'tenant_maintenance';
const HTTP_SERVICE_UNAVAILABLE = 503;

export const isTenantMaintenance = (result: BackendResult<unknown>) =>
	!result.ok && result.code === TENANT_MAINTENANCE_CODE;

/**
 * Load area sekolah: cluster tenant dalam pemeliharaan → halaman error penuh "Sedang pemeliharaan"
 * (`+error.svelte` membaca `code`), bukan StatePanel gagal per halaman.
 */
export function throwIfTenantMaintenance(result: BackendResult<unknown>) {
	if (isTenantMaintenance(result)) {
		error(HTTP_SERVICE_UNAVAILABLE, {
			message: 'Tenant database is under maintenance',
			code: TENANT_MAINTENANCE_CODE
		});
	}
}
