/**
 * DATA CONTOH sesi ujian terbuka (FE-06) — hanya dimuat saat `dev`.
 * Format kode sesi & detail sesi kelak dari kontrak OpenAPI (BLOCKED-01); ini bukan aturan bisnis.
 */
export interface TryoutSubtest {
	readonly name: string;
	readonly minutes: number;
}

export interface TryoutSession {
	readonly code: string;
	readonly title: string;
	readonly organizer: string;
	readonly window: string;
	/** Jam tutup hari ini (waktu lokal perangkat) untuk hitung mundur tampilan. */
	readonly closesAt: { readonly hour: number; readonly minute: number };
	readonly closesLabel: string;
	readonly durationMinutes: number;
	readonly questionCount: number;
	readonly subtests: readonly TryoutSubtest[];
}

export const tryoutSessionsFixture: readonly TryoutSession[] = [
	{
		code: '7K2Q9M',
		title: 'Tryout UTBK Nasional #3',
		organizer: 'Bimbel Cerdas Prima',
		window: 'dibuka hari ini 07.00–21.00 WIB',
		closesAt: { hour: 21, minute: 0 },
		closesLabel: 'ditutup 21.00 WIB',
		durationMinutes: 120,
		questionCount: 80,
		subtests: [
			{ name: 'Penalaran Umum', minutes: 30 },
			{ name: 'Pengetahuan Kuantitatif', minutes: 30 },
			{ name: 'Literasi Bahasa Indonesia', minutes: 30 },
			{ name: 'Literasi Bahasa Inggris', minutes: 30 }
		]
	}
];
