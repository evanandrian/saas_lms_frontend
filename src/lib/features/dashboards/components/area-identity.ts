import { initialsOf } from '$lib/utils/initials';
import type { DashboardContext } from '../dashboards.model';

/** Bentuk identitas yang diterima `WorkspaceShell` (nama, detail, inisial). */
export interface AreaIdentity {
	name: string;
	detail: string;
	initials: string;
}

/**
 * Identitas topbar/sidebar dari konteks peran backend; `null` bila konteks belum tersedia (layout
 * memakai identitas contoh dev). `roleLabel` = label tampilan aktif (mis. "Kepala sekolah").
 */
export function areaIdentity(
	context: DashboardContext | null,
	roleLabel: string,
	tenantDetail: string
): { tenant: AreaIdentity; user: AreaIdentity } | null {
	if (!context) return null;
	return {
		tenant: {
			name: context.tenant_name,
			detail: tenantDetail,
			initials: initialsOf(context.tenant_name)
		},
		user: {
			name: context.viewer.full_name,
			detail: roleLabel,
			initials: initialsOf(context.viewer.full_name)
		}
	};
}
