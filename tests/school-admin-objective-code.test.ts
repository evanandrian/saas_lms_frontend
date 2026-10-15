import { describe, expect, it } from 'vitest';
import { nextObjectiveCode } from '$lib/features/school-admin/school-admin.model';

/** Cermin BE `nextObjectiveCode` (internal/school/schooladmin/planning.go): max+1, bukan jumlah. */
describe('nextObjectiveCode', () => {
	it.each([
		[[], 'TP-10.1'],
		[['TP-10.1', 'TP-10.3'], 'TP-10.4'],
		[['TP-10.1', 'TP-11.7', 'lama'], 'TP-10.2'],
		[['TP-10.x'], 'TP-10.1'],
		[['TP-10.', 'TP-10.1.5', 'TP-10. 4', 'TP-10.-3'], 'TP-10.1'],
		[['TP-10.+5', 'TP-10.02'], 'TP-10.6']
	])('kode %j → %s', (existing, want) => {
		expect(nextObjectiveCode(10, existing)).toBe(want);
	});

	it('tingkat belum ada → awalan kosong (tampilan lama)', () => {
		expect(nextObjectiveCode('', [])).toBe('TP-.1');
	});
});
