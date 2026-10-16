import type { RequestEvent } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavigationGroup, NavigationRole } from '$lib/features/navigation/navigation.model';

const mocks = vi.hoisted(() => ({
	loadNavigationSidebar: vi.fn(),
	loadWorkspace: vi.fn()
}));

vi.mock('$lib/features/navigation/navigation.api', () => ({
	loadNavigationSidebar: mocks.loadNavigationSidebar
}));
vi.mock('$lib/features/workspace/workspace.server', () => ({
	loadWorkspace: mocks.loadWorkspace
}));

import { load as loadStudent } from '../src/routes/(school)/app/student/+layout.server';
import { load as loadGuardian } from '../src/routes/(school)/app/guardian/+layout.server';

const backendGroups: NavigationGroup[] = [
	{
		id: 'g1',
		code: 'grp-backend',
		name: 'Dari backend',
		icon: 'house',
		route: '',
		show_label: false,
		default_open: true,
		clickable: false,
		hidden: false,
		items: []
	}
];

const depends = vi.fn();
const event = {
	depends,
	fetch: vi.fn(),
	cookies: { get: vi.fn(), set: vi.fn() }
} as unknown as RequestEvent;

const requestedRole = (): NavigationRole => mocks.loadNavigationSidebar.mock.calls.at(-1)![1];
const codes = (groups: readonly NavigationGroup[]) =>
	groups.map((g) => [g.code, g.items.map((i) => i.code)]);

const LEARNER_CASES = [
	{
		role: 'student' as const,
		label: 'murid',
		load: loadStudent,
		failedReason: 'unavailable' as const,
		fallbackTitle: 'cadangan bawaan murid (8 menu, 5 grup)',
		fallbackCodes: [
			['grp-utama', ['beranda']],
			['grp-belajar', ['materi', 'tugas', 'ujian']],
			['grp-hasil', ['nilai', 'presensi']],
			['grp-komunikasi', ['pesan']],
			['grp-akun', ['pengaturan']]
		]
	},
	{
		role: 'guardian' as const,
		label: 'orang tua',
		load: loadGuardian,
		failedReason: 'forbidden' as const,
		fallbackTitle: 'cadangan bawaan orang tua tanpa menu tersembunyi',
		fallbackCodes: [
			['grp-utama', ['beranda']],
			['grp-anak', ['rapor']],
			['grp-komunikasi', ['pengumuman']],
			['grp-akun', ['pengaturan']]
		]
	}
];

describe.each(LEARNER_CASES)('layout $label: sidebar dinamis', (c) => {
	const runLoad = async () =>
		(await c.load(event as never)) as unknown as { navigation: NavigationGroup[] };

	beforeEach(() => {
		depends.mockReset();
		mocks.loadNavigationSidebar.mockReset();
		mocks.loadWorkspace.mockReset();
		mocks.loadWorkspace.mockResolvedValue(null);
	});

	it(`memuat area menu ${c.role} dan mendaftar invalidasi app:navigation`, async () => {
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: true, layout: { groups: backendGroups } });
		const data = await runLoad();
		expect(requestedRole()).toBe(c.role);
		expect(data.navigation).toBe(backendGroups);
		expect(mocks.loadWorkspace.mock.calls.at(-1)?.[1]).toBe(c.role);
		expect(depends).toHaveBeenCalledWith('app:navigation');
	});

	it(`API sidebar gagal: ${c.fallbackTitle}`, async () => {
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: false, reason: c.failedReason });
		const data = await runLoad();
		expect(codes(data.navigation)).toEqual(c.fallbackCodes);
	});
});
