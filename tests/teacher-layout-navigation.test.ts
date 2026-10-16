import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultNavigationLayout } from '$lib/features/navigation/navigation.defaults';
import {
	insertNavigationItem,
	visibleGroups,
	type NavigationGroup,
	type NavigationItem,
	type NavigationRole
} from '$lib/features/navigation/navigation.model';

const mocks = vi.hoisted(() => ({
	loadNavigationSidebar: vi.fn(),
	loadAreaViews: vi.fn(),
	loadWorkspace: vi.fn()
}));

vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('$lib/features/navigation/navigation.api', () => ({
	loadNavigationSidebar: mocks.loadNavigationSidebar
}));
vi.mock('$lib/features/dashboards/dashboards.server', () => ({
	loadAreaViews: mocks.loadAreaViews
}));
vi.mock('$lib/features/workspace/workspace.server', () => ({
	loadWorkspace: mocks.loadWorkspace
}));

import { load } from '../src/routes/(school)/app/teacher/+layout.server';
import {
	PERSONAL_OWNER_ROLE,
	teacherSidebarGroups,
	teacherSidebarRole
} from '../src/routes/(school)/app/teacher/teacher-nav';
import { backendGroups, layoutEvent } from './helpers/navigation-layout-fixtures';

const { event, depends } = layoutEvent('/app/teacher');

async function runLoad() {
	return (await load(event as never)) as unknown as {
		navigation: NavigationGroup[];
		activeView: string | null;
	};
}

const requestedRole = (): NavigationRole => mocks.loadNavigationSidebar.mock.calls.at(-1)![1];
const codes = (groups: readonly NavigationGroup[]) =>
	groups.map((g) => [g.code, g.items.map((i) => i.code)]);

describe('layout guru: sidebar dinamis', () => {
	beforeEach(() => {
		depends.mockReset();
		mocks.loadNavigationSidebar.mockReset();
		mocks.loadAreaViews.mockReset();
		mocks.loadWorkspace.mockReset();
		mocks.loadWorkspace.mockResolvedValue(null);
	});

	it('tampilan guru mapel memuat area teacher dan mendaftar invalidasi app:navigation', async () => {
		mocks.loadAreaViews.mockResolvedValue({ views: ['teacher'], activeView: 'teacher' });
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: true, layout: { groups: backendGroups } });
		const data = await runLoad();
		expect(requestedRole()).toBe('teacher');
		expect(data.navigation).toBe(backendGroups);
		expect(depends).toHaveBeenCalledWith('app:navigation');
	});

	it('tampilan wali kelas memuat area homeroom', async () => {
		mocks.loadAreaViews.mockResolvedValue({
			views: ['teacher', 'homeroom'],
			activeView: 'homeroom'
		});
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: true, layout: { groups: backendGroups } });
		const data = await runLoad();
		expect(requestedRole()).toBe('homeroom');
		expect(data.activeView).toBe('homeroom');
	});

	it('tampilan tak dikenal (null) jatuh ke teacher', async () => {
		mocks.loadAreaViews.mockResolvedValue({ views: [], activeView: null });
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: false, reason: 'unavailable' });
		await runLoad();
		expect(requestedRole()).toBe('teacher');
	});

	it('API sidebar gagal: cadangan bawaan guru (3 menu tampil dalam 3 grup)', async () => {
		mocks.loadAreaViews.mockResolvedValue({ views: ['teacher'], activeView: 'teacher' });
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: false, reason: 'unavailable' });
		const data = await runLoad();
		expect(codes(data.navigation)).toEqual([
			['grp-utama', ['beranda']],
			['grp-penilaian', ['nilai-akhir']],
			['grp-akun', ['pengaturan']]
		]);
	});

	it('API sidebar gagal pada tampilan wali kelas: cadangan bawaan homeroom (11 menu tampil)', async () => {
		mocks.loadAreaViews.mockResolvedValue({
			views: ['teacher', 'homeroom'],
			activeView: 'homeroom'
		});
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: false, reason: 'forbidden' });
		const data = await runLoad();
		expect(requestedRole()).toBe('homeroom');
		expect(data.navigation.flatMap((g) => g.items)).toHaveLength(11);
	});

	it('teacherSidebarRole: hanya homeroom yang berganti area', () => {
		expect(teacherSidebarRole('homeroom')).toBe('homeroom');
		expect(teacherSidebarRole('teacher')).toBe('teacher');
		expect(teacherSidebarRole(null)).toBe('teacher');
	});
});

describe('menu Tagihan bersyarat (PERSONAL_OWNER)', () => {
	const teacherGroups = visibleGroups(defaultNavigationLayout('teacher').groups);
	const options = { homeroomView: false, billingLabel: 'Tagihan' };

	it('PERSONAL_OWNER: Tagihan di grup Akun sebelum Pengaturan', () => {
		const groups = teacherSidebarGroups(teacherGroups, {
			...options,
			roleCode: PERSONAL_OWNER_ROLE
		});
		const akun = groups.find((g) => g.code === 'grp-akun')!;
		expect(akun.items.map((i) => [i.code, i.name, i.route])).toEqual([
			['tagihan', 'Tagihan', '/app/teacher/tagihan'],
			['pengaturan', 'Pengaturan', '/app/teacher/settings']
		]);
		// Masukan tidak diubah.
		expect(teacherGroups.find((g) => g.code === 'grp-akun')!.items).toHaveLength(1);
	});

	it('guru sekolah (TEACHER) tidak melihat Tagihan', () => {
		const groups = teacherSidebarGroups(teacherGroups, { ...options, roleCode: 'TEACHER' });
		expect(groups).toBe(teacherGroups);
	});

	it('tanpa workspace (backend tak terjangkau) tidak menampilkan Tagihan', () => {
		expect(teacherSidebarGroups(teacherGroups, { ...options, roleCode: undefined })).toBe(
			teacherGroups
		);
	});

	it('tampilan wali kelas tidak menampilkan Tagihan', () => {
		const homeroom = visibleGroups(defaultNavigationLayout('homeroom').groups);
		const groups = teacherSidebarGroups(homeroom, {
			homeroomView: true,
			billingLabel: 'Tagihan',
			roleCode: PERSONAL_OWNER_ROLE
		});
		expect(groups).toBe(homeroom);
	});

	it.each([
		['kode tagihan', { code: 'tagihan', route: '/app/teacher/lain' }],
		['rute Tagihan', { code: 'tagihan-saya', route: '/app/teacher/tagihan' }]
	])('owner sudah menaruh menu dengan %s di grup lain: Tagihan tidak digandakan', (_, existing) => {
		const custom: NavigationItem = {
			id: 'custom',
			name: 'Tagihan',
			icon: 'receipt',
			target: 'same',
			hidden: false,
			badge: 'none',
			...existing
		};
		const withBilling = teacherGroups.map((g) =>
			g.code === 'grp-utama' ? { ...g, items: [...g.items, custom] } : g
		);
		const groups = teacherSidebarGroups(withBilling, {
			...options,
			roleCode: PERSONAL_OWNER_ROLE
		});
		expect(groups).toBe(withBilling);
		const billingItems = groups
			.flatMap((g) => g.items)
			.filter((i) => i.code === 'tagihan' || i.route === '/app/teacher/tagihan');
		expect(billingItems).toHaveLength(1);
	});
});

describe('insertNavigationItem', () => {
	const billing: NavigationItem = {
		id: 'x',
		code: 'tagihan',
		name: 'Tagihan',
		icon: 'receipt',
		route: '/app/teacher/tagihan',
		target: 'same',
		hidden: false,
		badge: 'none'
	};
	const group = (code: string, items: string[]): NavigationGroup => ({
		id: code,
		code,
		name: code,
		icon: 'house',
		route: '',
		show_label: true,
		default_open: true,
		clickable: false,
		hidden: false,
		items: items.map((c) => ({ ...billing, id: c, code: c, name: c, route: `/app/${c}` }))
	});

	it('grup Akun diganti owner: menu masuk grup terakhir', () => {
		const out = insertNavigationItem(
			[group('grp-utama', ['beranda']), group('grp-lain', ['x'])],
			'grp-akun',
			billing
		);
		expect(codes(out)).toEqual([
			['grp-utama', ['beranda']],
			['grp-lain', ['x', 'tagihan']]
		]);
	});

	it('susunan kosong: satu grup tanpa judul', () => {
		const out = insertNavigationItem([], 'grp-akun', billing);
		expect(out).toHaveLength(1);
		expect(out[0]!.show_label).toBe(false);
		expect(out[0]!.items.map((i) => i.code)).toEqual(['tagihan']);
	});
});
