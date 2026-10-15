import { describe, expect, it } from 'vitest';
import {
	REMIND_MESSAGE_MAX,
	defaultRecipientPick,
	remindBody,
	selectedRecipientIds
} from '$lib/features/school-admin/school-admin.model';

describe('remindBody', () => {
	it('selalu mengirim recipient_ids eksplisit (backend: kosong = wali kelas saja)', () => {
		expect(remindBody('  ', ['a', 'b'])).toEqual({ recipient_ids: ['a', 'b'] });
	});
	it('pesan dipangkas dan penerima dipertahankan', () => {
		expect(remindBody(' Mohon segera ', ['a'])).toEqual({
			message: 'Mohon segera',
			recipient_ids: ['a']
		});
	});
	it('pesan dipotong ke batas', () => {
		const body = remindBody('x'.repeat(REMIND_MESSAGE_MAX + 10), ['a']);
		expect(body.message).toHaveLength(REMIND_MESSAGE_MAX);
	});
	it('tidak mengubah array masukan', () => {
		const ids = ['a'];
		expect(remindBody('', ids).recipient_ids).not.toBe(ids);
	});
});

describe('pilihan penerima dialog pengingat (regresi bind:checked undefined)', () => {
	const recipients = [
		{ teacher_id: 't1', name: 'A', homeroom: true, has_email: true },
		{ teacher_id: 't2', name: 'B', homeroom: false, has_email: false },
		{ teacher_id: 't3', name: 'C', homeroom: false, has_email: true }
	];

	it('default: hanya penerima ber-email terpilih, nilai tidak pernah undefined', () => {
		const picked = defaultRecipientPick(recipients);
		expect(picked).toEqual({ t1: true, t2: false, t3: true });
		expect(Object.values(picked).every((v) => typeof v === 'boolean')).toBe(true);
	});
	it('pilihan belum terisi (sebelum $effect) = tidak ada yang terpilih', () => {
		expect(selectedRecipientIds(recipients, {})).toEqual([]);
	});
	it('penerima tanpa email tidak pernah terpilih walau tercentang', () => {
		expect(selectedRecipientIds(recipients, { t1: true, t2: true, t3: false })).toEqual(['t1']);
	});
	it('tanpa penerima → kosong (tombol kirim nonaktif)', () => {
		expect(selectedRecipientIds([], defaultRecipientPick([]))).toEqual([]);
	});
});
