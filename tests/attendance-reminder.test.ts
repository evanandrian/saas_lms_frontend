import { describe, expect, it } from 'vitest';
import en from '$lib/i18n/en.json';
import id from '$lib/i18n/id.json';
import { attendanceReminderMessage } from '$lib/features/school-admin/school-admin.model';

/**
 * Toast "Ingatkan" presensi admin sekolah: isi mengikuti hasil nyata backend (`data.reminder`),
 * bukan jumlah kelas yang belum mengisi.
 */

const t = (key: string, params?: Readonly<Record<string, string | number>>) =>
	params ? `T(${key})${JSON.stringify(params)}` : `T(${key})`;
const K = 'school_admin.attendance';

describe('attendanceReminderMessage', () => {
	it('semua kelas sasaran terjangkau → hanya jumlah wali kelas', () => {
		expect(
			attendanceReminderMessage(t, {
				notified_teachers: 3,
				skipped_no_homeroom: 0,
				skipped_no_contact: 0
			})
		).toBe(`T(${K}.reminded){"count":3}`);
	});

	it('kelas tanpa wali kelas & wali kelas tanpa email ikut dilaporkan', () => {
		expect(
			attendanceReminderMessage(t, {
				notified_teachers: 2,
				skipped_no_homeroom: 4,
				skipped_no_contact: 1
			})
		).toBe(
			`T(${K}.reminded){"count":2} T(${K}.reminded_no_homeroom){"count":4} T(${K}.reminded_no_contact){"count":1}`
		);
	});

	it('tanpa hasil (backend lama) → pesan umum tanpa angka karangan', () => {
		expect(attendanceReminderMessage(t, undefined)).toBe(`T(${K}.reminded_label)`);
	});

	it('kunci toast tersedia di id & en dengan parameter {count}', () => {
		for (const dict of [id, en]) {
			const att = dict.school_admin.attendance as Record<string, string>;
			for (const key of ['reminded', 'reminded_no_homeroom', 'reminded_no_contact']) {
				expect(att[key], key).toContain('{count}');
			}
			expect(att.reminded_label).toBeTruthy();
		}
	});
});
