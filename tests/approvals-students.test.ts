import { describe, expect, it } from 'vitest';
import { studentsLabel } from '$lib/features/approvals/approvals.model';

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
