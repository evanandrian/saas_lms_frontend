import { describe, expect, it } from 'vitest';
import { guardianContact, phoneFieldNote } from '$lib/features/school-admin/school-admin.model';
import en from '$lib/i18n/en.json';
import id from '$lib/i18n/id.json';

/**
 * `phone_unavailable` (BV03-F1): telepon tersimpan yang tidak dapat didekripsi tidak boleh tampil sebagai
 * "tanpa kontak"/kosong, dan formulir menjelaskan bahwa field kosong mempertahankan nomor tersimpan.
 */
const t = (key: string) => `T(${key})`;

describe('guardianContact', () => {
	it('email dan telepon terbaca tampil apa adanya', () => {
		expect(
			guardianContact(t, { email: 'w@sekolah.test', phone: '0812', phone_unavailable: false })
		).toBe('w@sekolah.test');
		expect(guardianContact(t, { email: '', phone: '081234567890' })).toBe('081234567890');
	});

	it('tanpa email & telepon: "tanpa kontak" hanya bila memang tidak ada telepon', () => {
		expect(guardianContact(t, { email: '', phone: '' })).toBe(
			'T(school_admin.guardians.no_contact)'
		);
		expect(guardianContact(t, { email: '', phone: '', phone_unavailable: true })).toBe(
			'T(school_admin.fields.phone_unavailable)'
		);
	});

	it('email tetap diutamakan walau telepon tak terbaca', () => {
		expect(
			guardianContact(t, { email: 'w@sekolah.test', phone: '', phone_unavailable: true })
		).toBe('w@sekolah.test');
	});
});

describe('phoneFieldNote', () => {
	it('catatan khusus hanya untuk telepon tak terbaca', () => {
		expect(phoneFieldNote(t, { phone: '', phone_unavailable: true })).toBe(
			'T(school_admin.fields.phone_unavailable_note)'
		);
		expect(phoneFieldNote(t, { phone: '0812' })).toBe('T(school_admin.fields.encrypted)');
		expect(phoneFieldNote(t, null)).toBe('T(school_admin.fields.encrypted)');
	});
});

describe('i18n id/en', () => {
	it('kunci teks baru tersedia di kedua bahasa', () => {
		for (const dict of [id, en]) {
			const sa = dict.school_admin;
			expect(sa.fields.phone_unavailable).toBeTruthy();
			expect(sa.fields.phone_unavailable_note).toBeTruthy();
			expect(sa.invite_job.codes_unavailable).toBeTruthy();
		}
	});
});
