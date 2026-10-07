/**
 * DATA CONTOH identitas per area role (FE-04 D2) — hanya dimuat saat `dev`.
 * Identitas dan role sesungguhnya berasal dari sesi (BLOCKED-02).
 */
const TENANT_NAME = 'SMA Nusantara Jakarta';
const TENANT_INITIALS = 'SN';

export const schoolIdentityFixtures = {
	admin: {
		tenant: { name: TENANT_NAME, detail: 'Sekolah · Standard', initials: TENANT_INITIALS },
		user: { name: 'Ahmad Fauzi', detail: 'Admin sekolah', initials: 'AF' },
		navBadges: {}
	},
	principal: {
		tenant: { name: TENANT_NAME, detail: 'Sekolah · Kepala sekolah', initials: TENANT_INITIALS },
		user: { name: 'Sri Wahyuni', detail: 'Kepala sekolah', initials: 'SW' },
		navBadges: {}
	},
	teacher: {
		tenant: { name: TENANT_NAME, detail: 'Sekolah · Guru', initials: TENANT_INITIALS },
		user: { name: 'Rina Pratiwi', detail: 'Guru mapel', initials: 'RP' },
		navBadges: { assignments: 18 }
	},
	homeroom: {
		tenant: { name: TENANT_NAME, detail: 'Sekolah · Wali kelas', initials: TENANT_INITIALS },
		user: { name: 'Budi Santoso', detail: 'Wali kelas XI-A', initials: 'BS' },
		navBadges: {}
	},
	student: {
		tenant: { name: TENANT_NAME, detail: 'Kelas XI-A', initials: TENANT_INITIALS },
		user: { name: 'Dimas Prasetyo', detail: 'Murid', initials: 'DP' },
		navBadges: { assignments: 3 }
	},
	guardian: {
		tenant: { name: TENANT_NAME, detail: 'Portal orang tua', initials: TENANT_INITIALS },
		user: { name: 'Sari Wulandari', detail: 'Orang tua · 2 anak', initials: 'SW' },
		navBadges: { messages: 1 }
	}
};
