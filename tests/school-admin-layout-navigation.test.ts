import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavigationGroup } from '$lib/features/navigation/navigation.model';

const mocks = vi.hoisted(() => ({
	loadNavigationSidebar: vi.fn(),
	loadAreaViews: vi.fn(),
	loadPendingAnnouncements: vi.fn()
}));

vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('$lib/features/navigation/navigation.api', () => ({
	loadNavigationSidebar: mocks.loadNavigationSidebar
}));
vi.mock('$lib/features/dashboards/dashboards.server', () => ({
	loadAreaViews: mocks.loadAreaViews
}));
vi.mock('$lib/features/approvals/approvals.server', () => ({
	pendingApprovals: vi.fn().mockResolvedValue(3)
}));
vi.mock('$lib/features/workspace/workspace.server', () => ({
	loadWorkspace: vi.fn().mockResolvedValue(null)
}));
vi.mock('$lib/features/school-admin/school-admin.server', () => ({
	loadProgress: vi.fn().mockResolvedValue(null)
}));

vi.mock('$lib/features/announcements/announcements.server', () => ({
	loadPendingAnnouncements: mocks.loadPendingAnnouncements
}));

import { load } from '../src/routes/(school)/app/admin/+layout.server';
import {
	backendGroups,
	lastRequestedRole,
	layoutEvent
} from './helpers/navigation-layout-fixtures';

const { event } = layoutEvent('/app/admin');

async function runLoad() {
	return (await load(event as never)) as unknown as {
		navigation: NavigationGroup[];
		pendingApprovals: number | null;
		pendingAnnouncements: { id: string }[] | null;
	};
}

const requestedRole = () => lastRequestedRole(mocks.loadNavigationSidebar);

describe('layout admin sekolah: sidebar dinamis', () => {
	beforeEach(() => {
		mocks.loadNavigationSidebar.mockReset();
		mocks.loadAreaViews.mockReset();
		mocks.loadPendingAnnouncements.mockReset();
		mocks.loadPendingAnnouncements.mockResolvedValue(null);
	});

	it('tampilan principal memuat area principal, bukan school_admin', async () => {
		mocks.loadAreaViews.mockResolvedValue({ views: ['principal'], activeView: 'principal' });
		mocks.loadNavigationSidebar.mockResolvedValue({
			ok: true,
			layout: { groups: backendGroups }
		});
		const data = await runLoad();
		expect(requestedRole()).toBe('principal');
		expect(data.navigation).toBe(backendGroups);
	});

	it('tampilan school_admin memuat area school_admin', async () => {
		mocks.loadAreaViews.mockResolvedValue({
			views: ['principal', 'school_admin'],
			activeView: 'school_admin'
		});
		mocks.loadNavigationSidebar.mockResolvedValue({
			ok: true,
			layout: { groups: backendGroups }
		});
		await runLoad();
		expect(requestedRole()).toBe('school_admin');
	});

	it('tampilan tak dikenal (null) jatuh ke school_admin', async () => {
		mocks.loadAreaViews.mockResolvedValue({ views: [], activeView: null });
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: false, reason: 'unavailable' });
		await runLoad();
		expect(requestedRole()).toBe('school_admin');
	});

	it('API sidebar gagal: cadangan bawaan school_admin (17 item tampil) tetap dirender', async () => {
		mocks.loadAreaViews.mockResolvedValue({ views: [], activeView: 'school_admin' });
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: false, reason: 'unavailable' });
		const data = await runLoad();
		expect(data.navigation.flatMap((g) => g.items)).toHaveLength(17);
		expect(data.navigation.map((g) => g.code)).not.toContain('grp-keuangan');
	});

	it('API sidebar gagal pada tampilan principal: cadangan bawaan principal (10 item)', async () => {
		mocks.loadAreaViews.mockResolvedValue({ views: ['principal'], activeView: 'principal' });
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: false, reason: 'forbidden' });
		const data = await runLoad();
		expect(requestedRole()).toBe('principal');
		expect(data.navigation.flatMap((g) => g.items)).toHaveLength(10);
	});

	it('badge Persetujuan kepala sekolah = pengajuan akun + pengumuman menunggu', async () => {
		mocks.loadAreaViews.mockResolvedValue({
			views: ['principal', 'school_admin'],
			activeView: 'principal'
		});
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: false, reason: 'unavailable' });
		mocks.loadPendingAnnouncements.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
		const data = await runLoad();
		expect(mocks.loadPendingAnnouncements.mock.calls.at(-1)?.[1]).toBe(true);
		expect(data.pendingApprovals).toBe(5);
		// Daftarnya ikut diteruskan agar Kotak Persetujuan tidak mengambil ulang.
		expect(data.pendingAnnouncements).toEqual([{ id: 'a' }, { id: 'b' }]);
	});

	it('admin sekolah (bukan kepala sekolah) tidak memuat pengumuman menunggu', async () => {
		mocks.loadAreaViews.mockResolvedValue({ views: ['school_admin'], activeView: 'school_admin' });
		mocks.loadNavigationSidebar.mockResolvedValue({ ok: false, reason: 'unavailable' });
		const data = await runLoad();
		expect(mocks.loadPendingAnnouncements.mock.calls.at(-1)?.[1]).toBe(false);
		expect(data.pendingApprovals).toBe(3);
		expect(data.pendingAnnouncements).toBeNull();
	});
});
