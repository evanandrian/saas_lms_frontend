import { describe, expect, it } from 'vitest';
import {
	assessmentsBody,
	exampleSample,
	normalizeDecimals,
	normalizeWeight,
	reasonRequired,
	reasonValid,
	weightExample
} from '$lib/features/school-admin/school-admin.model';

describe('weightExample', () => {
	it('contoh hitung = Σ skor × bobot, dibulatkan half-up sesuai desimal', () => {
		const out = weightExample(
			[
				{ code: 'FORMATIF', weight: 0 },
				{ code: 'SUMATIF_LM', weight: 50 },
				{ code: 'STS', weight: 20 },
				{ code: 'SAS', weight: 30 }
			],
			{ SUMATIF_LM: 78, STS: 72, SAS: 80 },
			0
		);
		expect(out.parts.map((p) => p.code)).toEqual(['SUMATIF_LM', 'STS', 'SAS']);
		expect(out.total).toBe(77); // 39 + 14.4 + 24 = 77.4 → 77
	});
	it('half-up: 84.5 → 85 (0 desimal), 84.45 → 84.5 (1 desimal)', () => {
		expect(weightExample([{ code: 'A', weight: 100 }], { A: 84.5 }, 0).total).toBe(85);
		expect(weightExample([{ code: 'A', weight: 100 }], { A: 84.45 }, 1).total).toBe(84.5);
	});
	it('exampleSample menurunkan skor ilustrasi deterministik per kode', () => {
		expect(exampleSample(['A', 'B', 'C'])).toEqual({ A: 78, B: 72, C: 80 });
	});
});

describe('assessmentsBody', () => {
	it('mengirim alasan ter-trim, desimal, dan item lengkap dengan agregasi', () => {
		const item = {
			code: 'SAS',
			name: 'SAS',
			category: 'summative',
			is_exam: true,
			weight: 100,
			aggregation: 'latest'
		} as const;
		expect(assessmentsBody([item], 1, '  revisi kurikulum  ')).toEqual({
			reason: 'revisi kurikulum',
			decimal_places: 1,
			items: [item]
		});
	});
	it('alasan kosong tidak dikirim; agregasi kosong menjadi average', () => {
		const body = assessmentsBody(
			[{ code: 'SAS', name: 'SAS', category: 'summative', is_exam: false, weight: 100 }],
			2,
			'   '
		);
		expect(body.reason).toBeUndefined();
		expect(body.decimal_places).toBe(2);
		expect(body.items?.[0]?.aggregation).toBe('average');
	});
});

describe('reasonRequired / reasonValid (R9)', () => {
	it('wajib hanya bila kebijakan aktif punya total bobot > 0', () => {
		expect(reasonRequired([])).toBe(false);
		expect(reasonRequired([{ weight: 0 }, { weight: 0 }])).toBe(false);
		expect(reasonRequired([{ weight: 0 }, { weight: 100 }])).toBe(true);
	});
	it('valid: tidak wajib → selalu valid; wajib → minimal 5 karakter ter-trim', () => {
		expect(reasonValid(false, '')).toBe(true);
		expect(reasonValid(true, '  abcd ')).toBe(false);
		expect(reasonValid(true, ' abcde ')).toBe(true);
	});
});

describe('normalisasi input number', () => {
	it('normalizeWeight menerima number|string|null tanpa melempar', () => {
		expect(normalizeWeight(null)).toBe(0);
		expect(normalizeWeight(undefined)).toBe(0);
		expect(normalizeWeight('')).toBe(0);
		expect(normalizeWeight('30')).toBe(30);
		expect(normalizeWeight(45)).toBe(45);
		expect(normalizeWeight(250)).toBe(100);
		expect(normalizeWeight(-3)).toBe(0);
	});
	it('normalizeDecimals membatasi ke 0/1/2', () => {
		expect(normalizeDecimals('1')).toBe(1);
		expect(normalizeDecimals(2)).toBe(2);
		expect(normalizeDecimals(7)).toBe(0);
		expect(normalizeDecimals(null)).toBe(0);
	});
});
