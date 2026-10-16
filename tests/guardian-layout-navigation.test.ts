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

import { load } from '../src/routes/(school)/app/guardian/+layout.server';

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

async function runLoad() {
	return (await load(event as never)) as unknown as { navigation: NavigationGroup[] };
}

const requestedRole = (): NavigationRole => mocks.loadNavigationSidebar.mock.calls.at(-1)![1];
const codes = (groups: readonly NavigationGroup[]) =>
	groups.map((g) => [g.code, g.items.map((i) => i.code)]);

describe('layout orang tua: sidebar dinamis', () => {
	beforeEach(() => {
		mocks.loadNavigationSidebar.mockReset();
		mocks.loadWorkspace.mockReset();
		mocks.loadWorkspace.mockResolvedValue(null);
	});

	it('memuat area menu guardian dan mendaftar invalidasi app:navigation', async () => {
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: true, layout: { groups: backendGroups } });
		const data = await runLoad();
		expect(requestedRole()).toBe('guardian');
		expect(data.navigation).toBe(backendGroups);
		expect(mocks.loadWorkspace.mock.calls.at(-1)?.[1]).toBe('guardian');
		expect(depends).toHaveBeenCalledWith('app:navigation');
	});

	it('API sidebar gagal: cadangan bawaan orang tua tanpa menu tersembunyi', async () => {
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: false, reason: 'forbidden' });
		const data = await runLoad();
		expect(codes(data.navigation)).toEqual([
			['grp-utama', ['beranda']],
			['grp-anak', ['rapor']],
			['grp-komunikasi', ['pengumuman']],
			['grp-akun', ['pengaturan']]
		]);
	});
});
