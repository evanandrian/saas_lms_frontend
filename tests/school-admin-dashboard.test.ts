import { describe, expect, it } from 'vitest';
import { storageUsage } from '$lib/features/school-admin/school-admin.model';

const MB = 1024 * 1024;
const GB = 1024 * MB;

describe('storageUsage', () => {
	it('menampilkan pemakaian terhadap kuota paket', () => {
		expect(storageUsage({ storage_bytes: 512 * MB, storage_quota_bytes: 20 * GB }, 'id')).toEqual({
			used: '512',
			quota: '20',
			pct: 3
		});
	});

	it('kuota tidak diketahui → tanpa kuota & persentase', () => {
		expect(storageUsage({ storage_bytes: 1.5 * MB, storage_quota_bytes: null }, 'id')).toEqual({
			used: '1,5',
			quota: null,
			pct: null
		});
	});

	it('kuota 0 → tanpa pembagian dengan nol', () => {
		expect(storageUsage({ storage_bytes: 10 * MB, storage_quota_bytes: 0 }, 'id')).toEqual({
			used: '10',
			quota: null,
			pct: null
		});
	});
});
