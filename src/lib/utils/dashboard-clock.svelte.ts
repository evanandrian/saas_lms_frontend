import { jakartaSecondsOfDay, SECONDS_PER_DAY } from './clock';

const TICK_MS = 1000;

/**
 * Jam dashboard yang berdetak tiap detik (FE-07).
 * `startSeconds` (detik sejak tengah malam, WIB) dipakai data contoh agar jam sama dengan referensi;
 * `null` = jam nyata WIB.
 */
export function createDashboardClock(getStartSeconds: () => number | null) {
	const startEpochMs = Date.now();
	let elapsed = $state(0);

	$effect(() => {
		const timer = setInterval(() => (elapsed += 1), TICK_MS);
		return () => clearInterval(timer);
	});

	return {
		/** Detik berlalu sejak halaman dibuka (untuk simulasi & toast). */
		get elapsed() {
			return elapsed;
		},
		/** Jam sekarang, detik sejak tengah malam WIB. */
		get nowSeconds() {
			const start = getStartSeconds();
			return start !== null
				? (start + elapsed) % SECONDS_PER_DAY
				: jakartaSecondsOfDay(startEpochMs + elapsed * TICK_MS);
		}
	};
}
