import type { AccountWorkspace } from '$lib/api/generated/lms';
import { greetingParts } from '$lib/features/dashboards/dashboards.model';
import { initialsOf } from '$lib/utils/initials';

/**
 * Model identitas workspace (client-safe). Semua nilai berasal dari `GET /api/v1/account/workspace`;
 * tidak ada identitas atau angka badge bawaan.
 */
export type { AccountWorkspace };

/** Bentuk identitas yang diterima `WorkspaceShell` (nama, detail, inisial). */
export interface ShellIdentity {
	name: string;
	detail: string;
	initials: string;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * Kartu lembaga & user untuk shell. `userDetail` = label peran/tampilan aktif (default nama peran
 * backend); `tenantDetail` default "jenis · paket" (platform: "Platform · kode").
 */
export function workspaceIdentity(
	workspace: AccountWorkspace | null,
	t: Translate,
	options: { userDetail?: string; tenantDetail?: string } = {}
): { tenant: ShellIdentity; user: ShellIdentity } | null {
	if (!workspace) return null;
	const { tenant, user } = workspace;
	const defaultTenantDetail =
		workspace.area === 'platform'
			? t('common.workspace.platform_detail', { code: tenant.code })
			: [tenant.type_name, tenant.plan_name].filter(Boolean).join(' · ');
	return {
		tenant: {
			name: tenant.name,
			detail: options.tenantDetail ?? defaultTenantDetail,
			initials: initialsOf(tenant.name)
		},
		user: {
			name: user.full_name,
			detail: options.userDetail ?? user.role_name,
			initials: initialsOf(user.full_name)
		}
	};
}

/** Sapaan dashboard ("Pak Ahmad", "Bu Sri", atau nama saja) dari profil user yang masuk. */
export function workspaceGreeting(workspace: AccountWorkspace | null, t: Translate): string {
	if (!workspace) return '';
	const { name, honorific } = greetingParts(workspace.user);
	return honorific ? t(`dashboard.honorific.${honorific}`, { name }) : name;
}

/** Angka badge menu; `undefined` bila backend tidak mengirim kode itu (sumber data belum ada). */
export const workspaceBadge = (workspace: AccountWorkspace | null, code: string) =>
	workspace?.badges[code] ?? undefined;
