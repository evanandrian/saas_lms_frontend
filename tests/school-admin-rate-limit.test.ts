import { describe, expect, it } from 'vitest';
import { translate } from '$lib/i18n';
import {
	RATE_LIMITED_CODE,
	credentialFailureMessage,
	retryMinutes
} from '$lib/features/school-admin/school-admin.model';

/** Pesan 429 `rate_limited` halaman aktivasi murid & undangan akun (sisa menit dari `details.retry_at`). */

const NOW = Date.parse('2026-10-12T07:00:00Z');
const idT = (key: string, params?: Readonly<Record<string, string | number>>) =>
	translate('id', key, params);
const enT = (key: string, params?: Readonly<Record<string, string | number>>) =>
	translate('en', key, params);

describe('retryMinutes', () => {
	it('membulatkan sisa waktu ke atas dalam menit', () => {
		expect(retryMinutes('2026-10-12T07:14:01Z', NOW)).toBe(15);
		expect(retryMinutes('2026-10-12T07:01:00Z', NOW)).toBe(1);
	});

	it('minimal 1 menit bila waktu sudah lewat', () => {
		expect(retryMinutes('2026-10-12T06:59:00Z', NOW)).toBe(1);
	});

	it('null bila retry_at tidak ada atau tidak valid', () => {
		expect(retryMinutes(null, NOW)).toBeNull();
		expect(retryMinutes('bukan-tanggal', NOW)).toBeNull();
	});
});

describe('credentialFailureMessage', () => {
	it('rate_limited menampilkan sisa menit di semua locale', () => {
		expect(credentialFailureMessage(idT, RATE_LIMITED_CODE, 12)).toBe(
			'Terlalu banyak percobaan. Coba lagi dalam 12 menit.'
		);
		expect(credentialFailureMessage(enT, RATE_LIMITED_CODE, 12)).toContain('12');
	});

	it('rate_limited tanpa sisa menit memakai pesan umum', () => {
		expect(credentialFailureMessage(idT, RATE_LIMITED_CODE, null)).toBe(
			'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.'
		);
	});

	it('kode lain tetap memakai pemetaan error admin sekolah', () => {
		expect(credentialFailureMessage(idT, 'invitation_invalid', null)).toBe(
			'Tautan atau kode sudah tidak berlaku.'
		);
		expect(credentialFailureMessage(idT, 'quota_students_exceeded', null)).toBe(
			'Kursi murid penuh. Tambah kursi di menu Langganan.'
		);
	});
});
