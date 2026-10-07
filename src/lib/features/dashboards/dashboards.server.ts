import { redirect, type Cookies, type RequestEvent } from '@sveltejs/kit';
import type { BackendContext } from '$lib/api/backend-call';
import { clientMeta } from '$lib/auth/finish-login';
import { DASHBOARD_VIEW_PARAM } from '$lib/utils/app-paths';
import { loadContext } from './dashboards.api';
import { isDashboardView, type DashboardArea, type DashboardView } from './dashboards.model';

/** Tampilan terakhir yang dipilih lewat toggle peran, per area (preferensi UI, bukan otorisasi). */
const VIEW_COOKIE_PREFIX = 'lms_dashboard_view_';
const VIEW_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export function dashboardsContext(event: RequestEvent): BackendContext {
	return {
		fetch: event.fetch,
		cookies: event.cookies,
		userAgent: event.request.headers.get('user-agent') ?? '',
		clientAddress: clientMeta(event).address
	};
}

/** Konteks peran untuk layout area; `null` bila backend/sesi belum tersedia (toggle tidak tampil). */
export async function loadDashboardContext(event: RequestEvent, area: DashboardArea) {
	const result = await loadContext(dashboardsContext(event), area);
	return result.ok ? result.data : null;
}

export function rememberView(cookies: Cookies, area: DashboardArea, view: DashboardView) {
	cookies.set(`${VIEW_COOKIE_PREFIX}${area}`, view, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: VIEW_COOKIE_MAX_AGE_SECONDS
	});
}

/** Tampilan beranda: pilihan terakhir bila masih dimiliki peran, selain itu default backend. */
export function landingView(
	cookies: Cookies,
	area: DashboardArea,
	context: { views: readonly DashboardView[]; default_view: DashboardView }
): DashboardView {
	const remembered = cookies.get(`${VIEW_COOKIE_PREFIX}${area}`);
	return isDashboardView(remembered) && context.views.includes(remembered)
		? remembered
		: context.default_view;
}

/**
 * Beranda area dengan toggle peran: pilihan eksplisit `?view=` disimpan; tanpa itu, pengguna diarahkan
 * ke tampilan terakhir/default bila berbeda dari beranda yang dibuka. Mengembalikan path tujuan atau
 * `null` bila tetap di halaman ini.
 */
export function homeRedirect(
	event: RequestEvent,
	area: DashboardArea,
	context: { views: readonly DashboardView[]; default_view: DashboardView } | null,
	thisView: DashboardView,
	viewPaths: Readonly<Partial<Record<DashboardView, string>>>
): string | null {
	if (!context?.views.includes(thisView)) return null;
	if (event.url.searchParams.get(DASHBOARD_VIEW_PARAM) === thisView) {
		rememberView(event.cookies, area, thisView);
		return null;
	}
	const view = landingView(event.cookies, area, context);
	if (view === thisView) {
		rememberView(event.cookies, area, thisView);
		return null;
	}
	return viewPaths[view] ?? null;
}

/**
 * Data layout area: konteks peran (backend), tampilan aktif untuk sidebar/identitas, dan daftar
 * tampilan toggle. Tampilan aktif = beranda yang sedang dibuka, selain itu pilihan terakhir.
 * Tanpa konteks backend, saat dev dipakai tampilan persona contoh.
 */
export async function loadAreaViews(
	event: RequestEvent,
	area: DashboardArea,
	homePaths: Readonly<Partial<Record<DashboardView, string>>>,
	devViews: readonly DashboardView[] | null
) {
	const context = await loadDashboardContext(event, area);
	const views = context?.views ?? devViews ?? [];
	const fallback = context?.default_view ?? views[0] ?? null;
	const onHome = (Object.entries(homePaths) as [DashboardView, string][]).find(
		([, path]) => path === event.url.pathname
	)?.[0];
	const remembered = event.cookies.get(`${VIEW_COOKIE_PREFIX}${area}`);
	const activeView =
		onHome && views.includes(onHome)
			? onHome
			: isDashboardView(remembered) && views.includes(remembered)
				? remembered
				: fallback;
	return { dashboardContext: context, views, activeView };
}

/** Beranda tampilan tambahan (kepala sekolah, wali kelas): hanya untuk peran yang memilikinya. */
export function enterView(
	event: RequestEvent,
	area: DashboardArea,
	views: readonly DashboardView[],
	view: DashboardView,
	areaHome: string
) {
	if (!views.includes(view)) redirect(303, areaHome);
	rememberView(event.cookies, area, view);
}
