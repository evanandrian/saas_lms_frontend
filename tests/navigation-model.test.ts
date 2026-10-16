import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BUILT_APP_PATHS } from '$lib/utils/app-paths';
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
	// Vektor identik dengan backend `TestAllowedIconsMatchFrontendCatalog` (plan.go allowedIcons).
	it('katalog ikon identik dengan allowedIcons backend', () => {
		expect([...NAVIGATION_ICON_KEYS].sort()).toEqual(
			[
				'house',
				'layout-dashboard',
				'inbox',
				'building-2',
				'package',
				'database',
				'list-tree',
				'receipt',
				'wallet',
				'server',
				'scroll-text',
				'school',
				'users',
				'graduation-cap',
				'heart-handshake',
				'calendar-range',
				'calendar-check',
				'calendar-clock',
				'file-text',
				'credit-card',
				'settings',
				'book-open',
				'clipboard-list',
				'clipboard-check',
				'file-question',
				'chart-line',
				'message-square',
				'megaphone',
				'award',
				'folder',
				'bell',
				'star',
				'link',
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
				'notebook-pen',
				'library',
				'file-pen-line',
				'chart-no-axes-column',
				'scan-qr-code',
				'shield-alert'
			].sort()
		);
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
	it('school_admin: 6 grup, 22 item, 5 tersembunyi', () => {
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
		expect(groups.flatMap((g) => g.items)).toHaveLength(17);
		expect(groups.map((g) => g.code)).not.toContain('grp-keuangan');
	});

	it('menu fase 2 & 3 ber-href karena rutenya sudah dibangun', () => {
		const groups = toWorkspaceNav(visibleGroups(defaultNavigationLayout('school_admin').groups), {
			badges: {},
			builtPaths: BUILT_APP_PATHS
		});
		const hrefs = groups.flatMap((g) => g.items).map((i) => i.href);
		for (const r of [
			'/app/admin/subjects',
			'/app/admin/assignments',
			'/app/admin/assessments',
			'/app/admin/extracurriculars',
			'/app/admin/announcements'
		])
			expect(hrefs).toContain(r);
	});

	it('menu orang tua Pengumuman menunjuk halaman Fase 3', () => {
		const items = defaultNavigationLayout('guardian').groups.flatMap((g) => g.items);
		expect(items.find((i) => i.code === 'pengumuman')?.route).toBe('/app/guardian/announcements');
	});

	it('principal tersedia', () => {
		expect(defaultNavigationLayout('principal').groups[0]!.items).toHaveLength(10);
	});
});

type FlatItem = [group: string, code: string, hidden: boolean, badge: string, route: string];

// Vektor identik dengan backend `roleSidebarSpec` (internal/platform/navigation/defaults_test.go).
const ROLE_SIDEBAR_SPEC: Record<'teacher' | 'homeroom' | 'student' | 'guardian', FlatItem[]> = {
	teacher: [
		['grp-utama', 'beranda', false, 'none', '/app/teacher'],
		['grp-mengajar', 'kelas', true, 'none', '/app/teacher/classes'],
		['grp-mengajar', 'materi', true, 'none', '/app/teacher/materials'],
		['grp-mengajar', 'tugas', true, 'tasks', '/app/teacher/tasks'],
		['grp-mengajar', 'bank-soal', true, 'none', '/app/teacher/question-bank'],
		['grp-mengajar', 'assessment', true, 'none', '/app/teacher/assessments'],
		['grp-mengajar', 'jadwal-ujian', true, 'none', '/app/teacher/exam-schedule'],
		['grp-penilaian', 'nilai-akhir', false, 'none', '/app/teacher/grades'],
		['grp-penilaian', 'progres', true, 'none', '/app/teacher/progress'],
		['grp-penilaian', 'deskripsi-rapor', true, 'none', '/app/teacher/report-descriptions'],
		['grp-penilaian', 'analisis-capaian', true, 'none', '/app/teacher/achievement-analysis'],
		['grp-presensi', 'presensi-mapel', true, 'none', '/app/teacher/subject-attendance'],
		['grp-presensi', 'presensi-saya', true, 'none', '/app/teacher/my-attendance'],
		['grp-presensi', 'piket', true, 'none', '/app/teacher/duty'],
		['grp-komunikasi', 'pesan', true, 'none', '/app/teacher/messages'],
		['grp-akun', 'pengaturan', false, 'none', '/app/teacher/settings']
	],
	homeroom: [
		['grp-utama', 'beranda', false, 'none', '/app/teacher/homeroom'],
		['grp-utama', 'persetujuan', false, 'approvals', '/app/teacher/homeroom#persetujuan'],
		['grp-perwalian', 'murid-kelas', false, 'none', '/app/teacher/homeroom#murid'],
		['grp-perwalian', 'jadwal-kelas', false, 'none', '/app/teacher/homeroom#jadwal'],
		['grp-perwalian', 'catatan-perilaku', false, 'none', '/app/teacher/homeroom#catatan'],
		['grp-perwalian', 'buku-penghubung', false, 'none', '/app/teacher/homeroom#buku-penghubung'],
		['grp-presensi', 'presensi-kelas', false, 'none', '/app/teacher/homeroom/attendance'],
		[
			'grp-presensi',
			'presensi-per-mapel',
			true,
			'none',
			'/app/teacher/homeroom/subject-attendance'
		],
		['grp-penilaian', 'rekap-nilai', false, 'none', '/app/teacher/homeroom#rekap-nilai'],
		['grp-penilaian', 'rapor', false, 'none', '/app/teacher/homeroom/report'],
		['grp-penilaian', 'nilai-akhir', false, 'none', '/app/teacher/grades'],
		['grp-akun', 'pengaturan', false, 'none', '/app/teacher/settings']
	],
	student: [
		['grp-utama', 'beranda', false, 'none', '/app/student'],
		['grp-belajar', 'materi', false, 'none', '/app/student/materials'],
		['grp-belajar', 'tugas', false, 'due', '/app/student/tasks'],
		['grp-belajar', 'ujian', false, 'none', '/app/student/assessments'],
		['grp-hasil', 'nilai', false, 'none', '/app/student/grades'],
		['grp-hasil', 'presensi', false, 'none', '/app/student/attendance'],
		['grp-komunikasi', 'pesan', false, 'none', '/app/student/messages'],
		['grp-akun', 'pengaturan', false, 'none', '/app/student/settings']
	],
	guardian: [
		['grp-utama', 'beranda', false, 'none', '/app/guardian'],
		['grp-anak', 'nilai', true, 'none', '/app/guardian/grades'],
		['grp-anak', 'presensi', true, 'none', '/app/guardian/attendance'],
		['grp-anak', 'tugas-anak', true, 'none', '/app/guardian/tasks'],
		['grp-anak', 'rapor', false, 'none', '/app/guardian/report'],
		['grp-komunikasi', 'pengumuman', false, 'none', '/app/guardian/announcements'],
		['grp-komunikasi', 'pesan', true, 'msgs', '/app/guardian/messages'],
		['grp-komunikasi', 'notifikasi', true, 'none', '/app/guardian/notifications'],
		['grp-keuangan', 'tagihan-spp', true, 'none', '/app/guardian/billing'],
		['grp-akun', 'pengaturan', false, 'none', '/app/guardian/settings']
	]
};

const ROLE_VISIBLE_GROUPS: Record<keyof typeof ROLE_SIDEBAR_SPEC, string[]> = {
	teacher: ['grp-utama', 'grp-penilaian', 'grp-akun'],
	homeroom: ['grp-utama', 'grp-perwalian', 'grp-presensi', 'grp-penilaian', 'grp-akun'],
	student: ['grp-utama', 'grp-belajar', 'grp-hasil', 'grp-komunikasi', 'grp-akun'],
	guardian: ['grp-utama', 'grp-anak', 'grp-komunikasi', 'grp-akun']
};

const SCHOOL_ROLES = Object.keys(ROLE_SIDEBAR_SPEC) as (keyof typeof ROLE_SIDEBAR_SPEC)[];

describe('defaultNavigationLayout peran sekolah berkelompok (cermin defaults.go)', () => {
	it.each(SCHOOL_ROLES)('%s: grup, kode, tersembunyi, badge, rute identik backend', (role) => {
		const layout = defaultNavigationLayout(role);
		const flat = layout.groups.flatMap((g) =>
			g.items.map((i): FlatItem => [g.code, i.code, i.hidden, i.badge, i.route])
		);
		expect(flat).toEqual(ROLE_SIDEBAR_SPEC[role]);
		expect(layout.groups.map((g) => g.show_label)).toEqual(layout.groups.map((_, i) => i > 0));
	});

	it.each(SCHOOL_ROLES)('%s: grup yang semua menunya tersembunyi tidak tampil', (role) => {
		const groups = visibleGroups(defaultNavigationLayout(role).groups);
		expect(groups.map((g) => g.code)).toEqual(ROLE_VISIBLE_GROUPS[role]);
	});

	it.each(SCHOOL_ROLES)(
		'%s: semua menu tampil menuju halaman yang ada (0 tautan nonaktif)',
		(role) => {
			const nav = toWorkspaceNav(visibleGroups(defaultNavigationLayout(role).groups), {
				badges: {},
				builtPaths: BUILT_APP_PATHS
			});
			expect(nav.length).toBeGreaterThan(0);
			for (const navItem of nav.flatMap((g) => g.items)) expect(navItem.href).toBeDefined();
		}
	);

	it('menu tersembunyi yang ditampilkan owner tetapi halamannya belum ada → nonaktif', () => {
		const shown = defaultNavigationLayout('teacher').groups.map((g) => ({
			...g,
			items: g.items.map((i) => ({ ...i, hidden: false }))
		}));
		const items = toWorkspaceNav(shown, { badges: {}, builtPaths: BUILT_APP_PATHS }).flatMap(
			(g) => g.items
		);
		expect(items.find((i) => i.label === 'Kelas')?.href).toBeUndefined();
		expect(items.find((i) => i.label === 'Nilai akhir rapor')?.href).toBe('/app/teacher/grades');
	});

	it('badge hanya tampil bila backend mengirim angkanya', () => {
		const groups = defaultNavigationLayout('student').groups;
		const withoutCount = toWorkspaceNav(groups, { badges: {}, builtPaths: BUILT_APP_PATHS });
		const withCount = toWorkspaceNav(groups, { badges: { due: 2 }, builtPaths: BUILT_APP_PATHS });
		const tugas = (nav: typeof withCount) =>
			nav.flatMap((g) => g.items).find((i) => i.label === 'Tugas');
		expect(tugas(withoutCount)?.badge).toBeUndefined();
		expect(tugas(withCount)?.badge).toBe(2);
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
