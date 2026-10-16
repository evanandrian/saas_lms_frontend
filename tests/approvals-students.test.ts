import { describe, expect, it } from 'vitest';
import { showAccountTable, studentsLabel } from '$lib/features/approvals/approvals.model';

describe('studentsLabel', () => {
	it('menggabungkan nama & kelas', () => {
		expect(
			studentsLabel([
				{ name: 'Rani', class_name: 'X IPA 1' },
				{ name: 'Bima', class_name: '' }
			])
		).toBe('Rani (X IPA 1), Bima');
	});
	it('kosong → string kosong', () => {
		expect(studentsLabel(undefined)).toBe('');
		expect(studentsLabel([])).toBe('');
	});
});

describe('showAccountTable', () => {
	it('tampil bila ada pengajuan akun', () => {
		expect(showAccountTable(2, 0)).toBe(true);
		expect(showAccountTable(2, 1)).toBe(true);
	});
	it('tersembunyi bila pengajuan akun kosong tetapi ada pengumuman', () => {
		expect(showAccountTable(0, 1)).toBe(false);
	});
	it('kosong total tetap tampil (empty state)', () => {
		expect(showAccountTable(0, 0)).toBe(true);
	});
});
