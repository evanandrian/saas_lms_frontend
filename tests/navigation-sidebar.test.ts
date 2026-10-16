import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultNavigationLayout } from '$lib/features/navigation/navigation.defaults';
import { visibleGroups, type NavigationGroup } from '$lib/features/navigation/navigation.model';

const mocks = vi.hoisted(() => ({ loadNavigationSidebar: vi.fn() }));

vi.mock('$lib/features/navigation/navigation.api', () => ({
	loadNavigationSidebar: mocks.loadNavigationSidebar
}));

import { loadSidebarGroups } from '$lib/features/navigation/navigation.sidebar';

const ctx = { fetch: vi.fn(), cookies: {} } as never;

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

describe('loadSidebarGroups', () => {
	beforeEach(() => mocks.loadNavigationSidebar.mockReset());

	it('API berhasil: memakai susunan backend apa adanya untuk peran yang diminta', async () => {
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: true, layout: { groups: backendGroups } });
		const groups = await loadSidebarGroups(ctx, 'teacher');
		expect(groups).toBe(backendGroups);
		expect(mocks.loadNavigationSidebar).toHaveBeenCalledWith(ctx, 'teacher');
	});

	it('API gagal: cadangan susunan bawaan peran tanpa item tersembunyi', async () => {
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: false, reason: 'unavailable' });
		const groups = await loadSidebarGroups(ctx, 'homeroom');
		expect(groups).toEqual(visibleGroups(defaultNavigationLayout('homeroom').groups));
		expect(groups.flatMap((g) => g.items).some((i) => i.hidden)).toBe(false);
	});
});
