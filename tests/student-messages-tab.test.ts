import { describe, expect, it } from 'vitest';
import { messageTabFromUrl } from '../src/routes/(school)/app/student/messages/messages.model';

describe('tab awal halaman pesan murid', () => {
	const at = (search: string) => new URL(`https://sekolah.test/app/student/messages${search}`);

	it('tautan email `?tab=announcements` membuka tab Pengumuman', () =>
		expect(messageTabFromUrl(at('?tab=announcements'))).toBe('announcements'));
	it('kunci tab lain yang dikenal diterima', () =>
		expect(messageTabFromUrl(at('?tab=teachers'))).toBe('teachers'));
	it('tanpa parameter atau kunci tak dikenal → tab "Semua"', () => {
		expect(messageTabFromUrl(at(''))).toBe('all');
		expect(messageTabFromUrl(at('?tab=admin'))).toBe('all');
		expect(messageTabFromUrl(at('?tab=__proto__'))).toBe('all');
	});
});
