import { describe, expect, it } from 'vitest';
import en from '$lib/i18n/en.json';
import id from '$lib/i18n/id.json';

/** NFR-13: setiap teks UI Pengumuman ada di id & en dengan struktur kunci dan placeholder identik. */
type Tree = { [key: string]: string | Tree };

function leaves(node: Tree, prefix = ''): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(node)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (typeof value === 'string') out[path] = value;
		else Object.assign(out, leaves(value, path));
	}
	return out;
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n Pengumuman', () => {
	const idLeaves = leaves({
		announcements: (id as unknown as Tree).announcements!,
		help: {
			school_admin_announcements: ((id as unknown as Tree).help as Tree)
				.school_admin_announcements!,
			guardian_announcements: ((id as unknown as Tree).help as Tree).guardian_announcements!
		}
	});
	const enLeaves = leaves({
		announcements: (en as unknown as Tree).announcements!,
		help: {
			school_admin_announcements: ((en as unknown as Tree).help as Tree)
				.school_admin_announcements!,
			guardian_announcements: ((en as unknown as Tree).help as Tree).guardian_announcements!
		}
	});

	it('kunci id = en', () =>
		expect(Object.keys(enLeaves).sort()).toEqual(Object.keys(idLeaves).sort()));

	it('placeholder identik dan teks tidak kosong', () => {
		for (const [key, text] of Object.entries(idLeaves)) {
			expect(text.trim(), key).not.toBe('');
			expect(placeholders(enLeaves[key] ?? ''), key).toEqual(placeholders(text));
		}
	});

	it('kode error & kategori audit baru punya pesan di kedua locale', () => {
		for (const locale of [id, en] as unknown as Tree[]) {
			const school = locale.school_admin as Tree;
			for (const code of [
				'announcement_invalid_transition',
				'announcement_self_review',
				'announcement_not_found'
			])
				expect(typeof (school.errors as Tree)[code]).toBe('string');
			expect(typeof ((school.audit as Tree).category as Tree).announcement).toBe('string');
		}
	});
});
