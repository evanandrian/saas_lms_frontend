import { describe, expect, it } from 'vitest';
import type {
	AnnouncementFeed,
	AnnouncementFeedItem,
	SchoolAnnouncement
} from '$lib/api/generated/lms';
import {
	BODY_MAX,
	TITLE_MAX,
	announcementBody,
	announcementErrors,
	appendFeedPage,
	appendUnique,
	approveNoteError,
	archiveReasonError,
	audienceFromKey,
	audienceKey,
	audienceText,
	cleanLine,
	cleanMultiline,
	combinedPending,
	emptyForm,
	feedView,
	formOf,
	formatAnnouncementTime,
	rejectErrors,
	statusActions,
	type AnnouncementForm
} from '$lib/features/announcements/announcements.model';
import { inputMaxLength, issueMessage } from '$lib/features/school-admin/school-admin.model';

/**
 * t palsu: kunci + parameter (nilai sebagai teks, seperti hasil interpolasi i18n) agar pesan klien bisa
 * dibandingkan dengan pesan isu server (`issueMessage`).
 */
const t = (k: string, p?: Readonly<Record<string, string | number>>) =>
	p
		? `${k}${JSON.stringify(Object.fromEntries(Object.entries(p).map(([n, v]) => [n, String(v)])))}`
		: k;
/** Spasi tak terputus (U+00A0): spasi menurut Go `unicode.IsSpace`. */
const NBSP = String.fromCodePoint(0xa0);
const valid: AnnouncementForm = {
	title: 'Libur semester',
	body: 'Sekolah libur mulai 20 Desember 2026.',
	audience: 'all',
	grade_level_id: '',
	class_id: ''
};

describe('perapian teks (cermin clean/cleanMultiline Go)', () => {
	it('satu baris: whitespace berlebih (termasuk NBSP) jadi satu spasi', () => {
		expect(cleanLine(`  Rapat \t orang${NBSP}${NBSP}tua  `)).toBe('Rapat orang tua');
		expect(cleanLine(undefined)).toBe('');
	});
	it('multi-baris: baris baru dipertahankan, CRLF/CR → LF, baris kosong tepi dibuang', () => {
		expect(cleanMultiline('  Baris   pertama  \r\n\r\n   baris    kedua\rbaris ketiga  \n\n')).toBe(
			'Baris pertama\n\nbaris kedua\nbaris ketiga'
		);
	});
});

/** Rangkai string dari code point (tanpa escape unicode di sumber). */
const cp = (...points: number[]) => String.fromCodePoint(...points);
const EM_SPACE = cp(0x2003);
const IDEOGRAPHIC_SPACE = cp(0x3000);
const NEXT_LINE = cp(0x85);
const LINE_SEPARATOR = cp(0x2028);
const BOM = cp(0xfeff);
const ZERO_WIDTH_SPACE = cp(0x200b);

/**
 * Paritas dengan backend: nilai harapan diambil dari keluaran `clean`/`cleanMultiline` Go
 * (`internal/school/schooladmin`) untuk masukan yang sama (program Go sekali pakai, bukan bagian repo).
 */
describe('paritas cleanMultiline/cleanLine dengan backend Go', () => {
	it.each([
		[
			'tag HTML dipertahankan',
			'<b>Tebal</b>\n<script>x</script>',
			'<b>Tebal</b>\n<script>x</script>'
		],
		['3 baris kosong internal dipertahankan', 'a\n\n\n\nb', 'a\n\n\n\nb'],
		['2 baris kosong internal dipertahankan', 'a\n\n\nb', 'a\n\n\nb'],
		['1 baris kosong internal dipertahankan', 'a\n\nb', 'a\n\nb'],
		['baris spasi-saja jadi kosong, tepi dibuang', '\n\n  a \n \n b  \n\n\n', 'a\n\nb'],
		[
			'whitespace Unicode (NBSP, em space, ideographic, NEL) diciutkan',
			`x${NBSP}y${EM_SPACE}z${IDEOGRAPHIC_SPACE}w${NEXT_LINE}v  u`,
			'x y z w v u'
		],
		[
			'U+2028, VT, FF, tab dianggap spasi (bukan pemisah baris)',
			`a${LINE_SEPARATOR}b\vc\fd\te`,
			'a b c d e'
		],
		[
			'BOM & zero-width space bukan spasi',
			`a${BOM}b ${ZERO_WIDTH_SPACE}c`,
			`a${BOM}b ${ZERO_WIDTH_SPACE}c`
		],
		[
			'CRLF/CR dinormalkan, baris kosong internal tetap',
			'\r\n\r\nline1\r\n\r\n\r\nline2\r',
			'line1\n\n\nline2'
		],
		[`hanya ${NBSP} lalu baris baru`, `${NBSP}\n${NBSP}`, '']
	])('cleanMultiline: %s', (_label, input, expected) =>
		expect(cleanMultiline(input)).toBe(expected)
	);
	it.each([
		['<b>Tebal</b>\n<script>x</script>', '<b>Tebal</b> <script>x</script>'],
		['a\n\n\n\nb', 'a b'],
		[`x${NBSP}y${EM_SPACE}z${IDEOGRAPHIC_SPACE}w${NEXT_LINE}v  u`, 'x y z w v u'],
		[`a${BOM}b ${ZERO_WIDTH_SPACE}c`, `a${BOM}b ${ZERO_WIDTH_SPACE}c`],
		['\r\n\r\nline1\r\n\r\n\r\nline2\r', 'line1 line2'],
		[`${NBSP}\n${NBSP}`, '']
	])('cleanLine: %j', (input, expected) => expect(cleanLine(input)).toBe(expected));
});

describe('announcementErrors (pesan = isu server)', () => {
	it('valid → tanpa error', () => expect(announcementErrors(valid, t)).toEqual({}));
	it.each([
		['judul 4', { title: 'abcd' }, 'title', 'min_chars:5'],
		['judul 81', { title: 'a'.repeat(81) }, 'title', 'max_chars:80'],
		['judul emoji 81', { title: '📣'.repeat(81) }, 'title', 'max_chars:80'],
		['isi 19', { body: 'b'.repeat(19) }, 'body', 'min_chars:20'],
		['isi 1001 emoji', { body: '🎉'.repeat(1001) }, 'body', 'max_chars:1000']
	])('%s', (_label, patch, field, issue) => {
		const errors = announcementErrors({ ...valid, ...patch }, t);
		expect(errors[field as 'title' | 'body']).toBe(issueMessage(t, issue));
	});
	it('batas sah: judul 5/80, isi 20/1000 (emoji = 1 karakter)', () => {
		for (const patch of [
			{ title: 'abcde' },
			{ title: '📣'.repeat(TITLE_MAX) },
			{ body: 'b'.repeat(20) },
			{ body: '🎉'.repeat(BODY_MAX) }
		])
			expect(announcementErrors({ ...valid, ...patch }, t)).toEqual({});
	});
	it('spasi saja / sasaran kosong → wajib diisi', () => {
		const errors = announcementErrors({ ...emptyForm(), title: '   ' }, t);
		expect(errors.title).toBe('school_admin.errors.required');
		expect(errors.audience).toBe('school_admin.errors.required');
	});
	it('sasaran tingkat/kelas tanpa pilihan → wajib', () => {
		expect(announcementErrors({ ...valid, audience: 'guardian_grade' }, t).grade_level_id).toBe(
			'school_admin.errors.required'
		);
		expect(announcementErrors({ ...valid, audience: 'class' }, t).class_id).toBe(
			'school_admin.errors.required'
		);
	});
	it('maxlength input = 2× batas code point (emoji tidak terpotong)', () =>
		expect(inputMaxLength(TITLE_MAX)).toBe(160));
});

describe('announcementBody & sasaran', () => {
	it('mengirim teks rapi dan id sasaran yang relevan saja', () => {
		expect(
			announcementBody({
				...valid,
				title: ' Rapat  ',
				audience: 'class',
				class_id: 'c1',
				grade_level_id: 'g1'
			})
		).toEqual({ title: 'Rapat', body: valid.body, audience: 'class', class_id: 'c1' });
		expect(announcementBody({ ...valid, grade_level_id: 'g1' })).toEqual({
			title: valid.title,
			body: valid.body,
			audience: 'all'
		});
	});
	it('kunci select berkelompok ↔ form', () => {
		expect(audienceKey({ audience: 'guardian_grade', grade_level_id: 'g1', class_id: '' })).toBe(
			'grade:g1'
		);
		expect(audienceFromKey('class:c9')).toEqual({
			audience: 'class',
			grade_level_id: '',
			class_id: 'c9'
		});
		expect(audienceFromKey('teacher')).toEqual({
			audience: 'teacher',
			grade_level_id: '',
			class_id: ''
		});
		expect(audienceFromKey('hacker')).toEqual({ audience: '', grade_level_id: '', class_id: '' });
	});
	it('label sasaran memakai label tingkat/kelas dari backend', () => {
		expect(audienceText(t, { audience: 'class', audience_label: 'X-A' })).toBe(
			'announcements.audience.class_of{"label":"X-A"}'
		);
		expect(audienceText(t, { audience: 'all', audience_label: '' })).toBe(
			'announcements.audience.all'
		);
	});
	it('formOf: null id → string kosong', () => {
		const a = {
			title: 'x',
			body: 'y',
			audience: 'all',
			grade_level_id: null,
			class_id: null
		} as SchoolAnnouncement;
		expect(formOf(a)).toEqual({
			title: 'x',
			body: 'y',
			audience: 'all',
			grade_level_id: '',
			class_id: ''
		});
	});
});

describe('aksi & validasi peninjau', () => {
	it('aksi per status mengikuti tabel transisi', () => {
		expect(statusActions('draft')).toEqual(['edit', 'submit', 'delete']);
		expect(statusActions('pending')).toEqual(['withdraw']);
		expect(statusActions('rejected')).toEqual(['fix']);
		expect(statusActions('published')).toEqual(['archive']);
		expect(statusActions('archived')).toEqual([]);
	});
	it('alasan arsip 4/5/200/201', () => {
		expect(archiveReasonError('abcd', t)).toBe(issueMessage(t, 'min_chars:5'));
		expect(archiveReasonError('abcde', t)).toBe('');
		expect(archiveReasonError('r'.repeat(200), t)).toBe('');
		expect(archiveReasonError('r'.repeat(201), t)).toBe(issueMessage(t, 'max_chars:200'));
	});
	it('tolak: alasan wajib, catatan wajib bila lainnya, ≤ 500', () => {
		expect(rejectErrors('', '', t).reason_code).toBe('school_admin.errors.required');
		expect(rejectErrors('other', '  ', t).note).toBe('school_admin.errors.required');
		expect(rejectErrors('content', '', t)).toEqual({});
		expect(rejectErrors('audience', 'n'.repeat(501), t).note).toBe(
			issueMessage(t, 'max_chars:500')
		);
		expect(approveNoteError('n'.repeat(501), t)).toBe(issueMessage(t, 'max_chars:500'));
		expect(approveNoteError('', t)).toBe('');
	});
});

describe('utilitas', () => {
	it('waktu terbit ditampilkan dalam WIB (23.30 UTC = esok hari 06.30 WIB)', () => {
		const text = formatAnnouncementTime('2026-10-16T23:30:00Z');
		expect(text).toContain('17');
		expect(text).toContain('06');
	});
	it('isi berisi tag HTML dipertahankan apa adanya (dirender sebagai teks, bukan HTML)', () =>
		expect(cleanMultiline('<b>Tebal</b>\n<script>x</script>')).toBe(
			'<b>Tebal</b>\n<script>x</script>'
		));
	it('badge Persetujuan = pengajuan akun + pengumuman', () => {
		expect(combinedPending(null, null)).toBeNull();
		expect(combinedPending(2, null)).toBe(2);
		expect(combinedPending(null, 3)).toBe(3);
		expect(combinedPending(2, 3)).toBe(5);
	});
	it('halaman feed berikutnya tanpa duplikat', () =>
		expect(
			appendUnique([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }]).map((x) => x.id)
		).toEqual(['a', 'b', 'c']));

	describe('feed "muat lebih banyak"', () => {
		const item = (id: string) => ({ id }) as AnnouncementFeedItem;
		const page = (ids: string[], next_cursor: string): AnnouncementFeed => ({
			items: ids.map(item),
			next_cursor
		});

		it('feedView tanpa halaman tambahan memakai item & kursor halaman pertama', () => {
			const v = feedView(page(['a', 'b'], 'c1'), null);
			expect(v.items.map((x) => x.id)).toEqual(['a', 'b']);
			expect(v.cursor).toBe('c1');
		});

		it('feedView menggabung tanpa duplikat dan memakai kursor halaman tambahan', () => {
			const v = feedView(page(['a', 'b'], 'c1'), page(['b', 'c'], ''));
			expect(v.items.map((x) => x.id)).toEqual(['a', 'b', 'c']);
			expect(v.cursor).toBe('');
		});

		it('feedView aman untuk feed null (gagal muat)', () => {
			expect(feedView(null, null)).toEqual({ items: [], cursor: '' });
		});

		it('appendFeedPage menambah halaman ke yang sudah dimuat dan membawa kursor terbaru', () => {
			const first = appendFeedPage(null, page(['a'], 'c1'));
			expect(first).toEqual(page(['a'], 'c1'));
			const second = appendFeedPage(first, page(['b'], 'c2'));
			expect(second.items.map((x) => x.id)).toEqual(['a', 'b']);
			expect(second.next_cursor).toBe('c2');
		});
	});
});
