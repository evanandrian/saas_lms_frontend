import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_PATHS } from '$lib/utils/app-paths';
import { defaultNavigationLayout } from '$lib/features/navigation/navigation.defaults';
import {
	NAVIGATION_BADGES,
	NAVIGATION_ICON_KEYS,
	NAVIGATION_ROLES,
	splitRoute,
	toWorkspaceNav,
	validateTree,
	visibleGroups,
	type NavigationGroup
} from '$lib/features/navigation/navigation.model';

const item = (
	code: string,
	route: string,
	extra: Partial<NavigationGroup['items'][number]> = {}
): NavigationGroup['items'][number] => ({
	id: code,
	code,
	name: code,
	icon: 'house',
	route,
	target: 'same',
	hidden: false,
	badge: 'none',
	...extra
});

const group = (items: NavigationGroup['items']): NavigationGroup => ({
	id: 'g',
	code: 'grp-utama',
	name: 'Utama',
	icon: 'house',
	route: '',
	show_label: false,
	default_open: true,
	clickable: false,
	hidden: false,
	items
});

const BUILT = new Set(['/app/admin', '/app/admin/approvals', '/app/admin/principal']);

describe('splitRoute', () => {
	it('memisahkan fragmen', () => {
		expect(splitRoute('/app/admin/principal#presensi')).toEqual({
			path: '/app/admin/principal',
			hash: 'presensi'
		});
	});
	it('tanpa fragmen', () => {
		expect(splitRoute('/app/admin')).toEqual({ path: '/app/admin' });
	});
	it('fragmen kosong diabaikan', () => {
		expect(splitRoute('/app/admin#')).toEqual({ path: '/app/admin' });
	});
});

describe('toWorkspaceNav', () => {
	it('memetakan grup, badge, dot, dan rute ber-fragmen', () => {
		const [g] = toWorkspaceNav(
			[
				group([
					item('beranda', '/app/admin'),
					item('persetujuan', '/app/admin/approvals', { badge: 'approvals' }),
					item('presensi', '/app/admin/principal#presensi')
				])
			],
			{ badges: { approvals: 3 }, dots: { beranda: true }, builtPaths: BUILT }
		);
		expect(g!.showLabel).toBe(false);
		expect(g!.items.map((i) => [i.href, i.hash, i.badge, i.dot])).toEqual([
			['/app/admin', undefined, undefined, true],
			['/app/admin/approvals', undefined, 3, false],
			['/app/admin/principal', 'presensi', undefined, false]
		]);
	});

	it('rute belum dibangun → tanpa href (nonaktif)', () => {
		const [g] = toWorkspaceNav([group([item('mapel-tp', '/app/admin/subjects')])], {
			badges: {},
			builtPaths: BUILT
		});
		expect(g!.items[0]!.href).toBeUndefined();
		expect(g!.items[0]!.externalHref).toBeUndefined();
	});

	it('badge none tidak menampilkan angka', () => {
		const [g] = toWorkspaceNav([group([item('beranda', '/app/admin')])], {
			badges: { none: 5 },
			builtPaths: BUILT
		});
		expect(g!.items[0]!.badge).toBeUndefined();
	});

	it('tautan luar dan tab baru', () => {
		const [g] = toWorkspaceNav(
			[group([item('docs', 'https://docs.flixare.id', { target: 'new' })])],
			{ badges: {}, builtPaths: BUILT }
		);
		expect(g!.items[0]).toMatchObject({
			externalHref: 'https://docs.flixare.id',
			newTab: true
		});
	});
});

describe('katalog badge dan ikon', () => {
	it('badge approvals tersedia', () => {
		expect(NAVIGATION_BADGES).toContain('approvals');
	});
	it('13 ikon baru identik dengan allowedIcons backend', () => {
		const added = [
			'book-marked',
			'network',
			'scale',
			'user-check',
			'trophy',
			'user-plus',
			'stamp',
			'history',
			'chart-column',
			'message-circle',
			'table',
			'calendar-days',
			'notebook-pen'
		];
		for (const key of added) expect(NAVIGATION_ICON_KEYS).toContain(key);
		expect(NAVIGATION_ICON_KEYS).toHaveLength(33 + added.length);
	});
});

// Vektor identik dengan backend `TestRoutePatternFragments` (internal/platform/navigation/defaults_test.go).
describe('validateTree rute ber-fragmen', () => {
	const routeError = (route: string) =>
		validateTree([
			{
				uid: 'g',
				name: 'Utama',
				route: '',
				clickable: false,
				items: [{ uid: 'a', name: 'Presensi', route }]
			}
		])['a']?.route?.key;

	it.each([
		'/app/admin',
		'/app/admin/principal#presensi',
		'/app/teacher/homeroom#buku-penghubung',
		'https://help.flixare.id#a'
	])('menerima %s', (route) => {
		expect(routeError(route)).toBeUndefined();
	});

	it.each([
		'/app/admin#',
		'/app/admin#Presensi',
		'/app#a#b',
		'/app/admin#ok/x',
		'#presensi',
		'/App'
	])('menolak %s', (route) => {
		expect(routeError(route)).toBe('route_invalid');
	});
});

describe('defaultNavigationLayout (cermin defaults.go)', () => {
	it('school_admin: 6 grup, 22 item, 6 tersembunyi', () => {
		const layout = defaultNavigationLayout('school_admin');
		expect(layout.groups.map((g) => g.code)).toEqual([
			'grp-utama',
			'grp-akademik',
			'grp-pengguna',
			'grp-kegiatan',
			'grp-keuangan',
			'grp-sistem'
		]);
		const items = layout.groups.flatMap((g) => g.items);
		expect(items).toHaveLength(22);
		expect(items.filter((i) => i.hidden).map((i) => i.code)).toEqual([
			'presensi-guru',
			'pengumuman',
			'pendaftaran',
			'spp-iuran',
			'kwitansi',
			'identitas-rapor'
		]);
		expect(items.every((i) => i.route.startsWith('/app/admin'))).toBe(true);
		expect(items.find((i) => i.code === 'persetujuan')?.badge).toBe('approvals');
	});

	it('sidebar cadangan menyembunyikan menu fase berikut', () => {
		const groups = visibleGroups(defaultNavigationLayout('school_admin').groups);
		expect(groups.flatMap((g) => g.items)).toHaveLength(16);
		expect(groups.map((g) => g.code)).not.toContain('grp-keuangan');
	});

	it('menu fase 2 ber-href karena rutenya sudah dibangun', () => {
		const built = new Set(Object.values(APP_PATHS));
		const groups = toWorkspaceNav(visibleGroups(defaultNavigationLayout('school_admin').groups), {
			badges: {},
			builtPaths: built
		});
		const hrefs = groups.flatMap((g) => g.items).map((i) => i.href);
		for (const r of [
			'/app/admin/subjects',
			'/app/admin/assignments',
			'/app/admin/assessments',
			'/app/admin/extracurriculars'
		])
			expect(hrefs).toContain(r);
	});

	it('principal & homeroom tersedia', () => {
		expect(defaultNavigationLayout('principal').groups[0]!.items).toHaveLength(10);
		expect(defaultNavigationLayout('homeroom').groups[0]!.items).toHaveLength(11);
	});
});

describe('editor Menu & navigasi', () => {
	it('7 area berurutan seperti backend Roles', () => {
		expect(NAVIGATION_ROLES.map((r) => r.key)).toEqual([
			'platform',
			'school_admin',
			'principal',
			'teacher',
			'homeroom',
			'student',
			'guardian'
		]);
	});

	it('label area & badge tersedia di semua locale', () => {
		for (const locale of ['id', 'en']) {
			const messages = JSON.parse(readFileSync(`src/lib/i18n/${locale}.json`, 'utf8'));
			for (const { key } of NAVIGATION_ROLES) expect(messages.navigation.roles[key]).toBeTruthy();
			for (const badge of NAVIGATION_BADGES) expect(messages.navigation.badges[badge]).toBeTruthy();
		}
	});
});
