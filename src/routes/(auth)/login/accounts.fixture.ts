import type { WorkspaceArea } from '$lib/auth/access-context';

/**
 * AKUN CONTOH untuk pengenalan akun saat mengetik email (FE-06, keputusan: dev-only).
 * Hanya dimuat lewat `dev ? import(...)`; build produksi tidak menyertakan modul ini sehingga
 * pengenalan akun nonaktif sampai backend menyediakan endpoint yang aman dari user enumeration.
 * Email mengikuti seed backend lokal (`lmsctl seed users`).
 */
export interface DevAccount {
	readonly email: string;
	readonly name: string;
	readonly initials: string;
	readonly area: WorkspaceArea;
	readonly tenant: string;
}

export const devAccounts: readonly DevAccount[] = [
	{
		email: 'platform@flixare.com',
		name: 'Efan Andrian',
		initials: 'EA',
		area: 'platform',
		tenant: 'FLIXARE Console'
	},
	{
		email: 'admin@school.com',
		name: 'Ahmad Fauzi',
		initials: 'AF',
		area: 'school_admin',
		tenant: 'SMA Nusantara Jakarta'
	},
	{
		email: 'teacher@school.com',
		name: 'Rina Pratiwi',
		initials: 'RP',
		area: 'teacher',
		tenant: 'SMA Nusantara Jakarta'
	},
	{
		email: 'student@school.com',
		name: 'Dimas Prasetyo',
		initials: 'DP',
		area: 'student',
		tenant: 'SMA Nusantara Jakarta'
	},
	{
		email: 'guardian@school.com',
		name: 'Sari Wulandari',
		initials: 'SW',
		area: 'guardian',
		tenant: 'SMA Nusantara Jakarta'
	}
];
