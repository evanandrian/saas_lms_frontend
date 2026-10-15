import { describe, expect, it } from 'vitest';
import { REMIND_MESSAGE_MAX, remindBody } from '$lib/features/school-admin/school-admin.model';

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
