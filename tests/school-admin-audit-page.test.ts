import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import type { SchoolAuditEntry } from '$lib/features/school-admin/school-admin.types';
import AuditPageHost from './support/AuditPageHost.svelte';

/** FR-010: aksi audit pengumuman tampil dengan kalimat khusus, bukan kalimat umum. */
const entry = (id: string, action: string, subject: string): SchoolAuditEntry => ({
	id,
	at: '2026-10-16T08:00:00Z',
	actor_name: 'Admin',
	actor_role: 'SCHOOL_ADMIN',
	action,
	entity_type: 'announcement',
	subject,
	details: {}
});

const view = {
	items: [
		entry('1', 'announcement.approve', 'Libur Semester'),
		entry('2', 'announcement.archive', 'Rapat Orang Tua')
	],
	next_before: ''
};

const html = (locale: 'id' | 'en') =>
	render(AuditPageHost, { props: { locale, view: view as never } }).body;

describe('halaman riwayat — aksi pengumuman', () => {
	it('id: approve & archive memakai kalimat khusus', () => {
		const out = html('id');
		expect(out).toContain('Menyetujui pengumuman Libur Semester');
		expect(out).toContain('Mengarsipkan pengumuman Rapat Orang Tua');
	});

	it('en: approve & archive memakai kalimat khusus', () => {
		const out = html('en');
		expect(out).toContain('Approved announcement Libur Semester');
		expect(out).toContain('Archived announcement Rapat Orang Tua');
	});
});
