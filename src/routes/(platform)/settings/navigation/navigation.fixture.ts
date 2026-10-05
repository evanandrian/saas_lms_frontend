import type { NavigationBadge, NavigationRole } from '$lib/features/navigation/navigation.model';

/**
 * DATA CONTOH pratinjau Menu & navigasi — hanya dimuat saat `dev` (FE-04 D2).
 * Isi sama persis dengan `FLIXARE App v3.html` · MenuMaster (konstanta TENANT & SAMPLE).
 */
export const navigationPreviewFixture: {
	tenants: Record<NavigationRole, { initials: string; name: string; host: string }>;
	badgeSamples: Partial<Record<NavigationBadge, number>>;
} = {
	tenants: {
		platform: { initials: 'FX', name: 'FLIXARE Console', host: 'console.flixare.id' },
		school_admin: { initials: 'SN', name: 'SMA Nusantara', host: 'smanusantara.flixare.id' },
		teacher: { initials: 'SN', name: 'SMA Nusantara', host: 'smanusantara.flixare.id' },
		student: { initials: 'SN', name: 'SMA Nusantara', host: 'smanusantara.flixare.id' },
		guardian: { initials: 'SN', name: 'SMA Nusantara', host: 'smanusantara.flixare.id' }
	},
	badgeSamples: { apps: 5, tasks: 18, msgs: 1, due: 3 }
};
