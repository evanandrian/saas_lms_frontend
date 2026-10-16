import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SchoolPlanExtra, SchoolStudentRow } from '$lib/api/generated/lms';
import {
	EXTRA_NAME_MAX,
	EXTRA_PLACE_MAX,
	charCount,
	extraBody,
	extraClock,
	extraDay,
	extraDeleteMessage,
	extraErrors,
	extraForm,
	emptyPicks,
	gradeMembersConfirm,
	gradeMembersPayload,
	gradesWithClasses,
	membersAdded,
	inputMaxLength,
	issueMessage,
	memberCandidates,
	pickedIds,
	picksFor,
	togglePick,
	type ExtraForm
} from '$lib/features/school-admin/school-admin.model';

const t = (k: string) => k;
const base = {
	name: 'Pramuka',
	coach_id: '',
	schedule_day: '5',
	start_time: '14:00',
	end_time: '16:00',
	place: 'Lapangan',
	is_mandatory: true
};

/** Atribut penuh PUT ekskul (penggantian penuh: semua harus selalu dikirim). */
const EXTRA_KEYS = [
	'coach_id',
	'end_time',
	'is_mandatory',
	'name',
	'place',
	'schedule_day',
	'start_time'
];

describe('extraErrors', () => {
	it('valid → tanpa error', () => expect(extraErrors(base, t)).toEqual({}));
	it('hanya satu jam diisi → start_time wajib (cermin BE start_time/required)', () =>
		expect(extraErrors({ ...base, start_time: '' }, t)).toHaveProperty('start_time'));
	it('jam selesai ≤ mulai & format salah ditolak', () => {
		expect(extraErrors({ ...base, end_time: '13:00' }, t)).toHaveProperty('end_time');
		expect(extraErrors({ ...base, start_time: '7.00' }, t)).toHaveProperty('start_time');
	});
	it('nama < 2 karakter ditolak', () =>
		expect(extraErrors({ ...base, name: 'P' }, t)).toHaveProperty('name'));
	it('nama: kosong → required; pendek/panjang → pesan batas (code point, emoji = 1)', () => {
		const tp = (k: string, p?: Readonly<Record<string, string | number>>) =>
			p ? `${k}${JSON.stringify(p)}` : k;
		expect(extraErrors({ ...base, name: '  ' }, tp).name).toBe('school_admin.errors.required');
		expect(extraErrors({ ...base, name: 'P' }, tp).name).toBe(
			'school_admin.errors.min_chars{"min":2}'
		);
		expect(extraErrors({ ...base, name: 'x'.repeat(121) }, tp).name).toBe(
			'school_admin.errors.max_chars{"max":120}'
		);
		// 120 emoji = 240 unit UTF-16 tetapi 120 code point → sah (sama dengan rune di BE).
		expect(extraErrors({ ...base, name: '😀'.repeat(120) }, tp)).not.toHaveProperty('name');
		expect(extraErrors({ ...base, name: '😀'.repeat(121) }, tp)).toHaveProperty('name');
		expect(extraErrors({ ...base, place: '🏟'.repeat(120) }, tp)).not.toHaveProperty('place');
		expect(extraErrors({ ...base, place: '🏟'.repeat(121) }, tp).place).toBe(
			'school_admin.errors.max_chars{"max":120}'
		);
	});
	it('nilai input non-string (mis. angka dari select/time) tidak melempar', () => {
		const odd = { ...base, schedule_day: 5, start_time: undefined } as unknown as ExtraForm;
		expect(() => extraErrors(odd, t)).not.toThrow();
		expect(extraErrors(odd, t)).toHaveProperty('start_time');
	});
	it('tempat > 120 karakter ditolak', () =>
		expect(extraErrors({ ...base, place: 'x'.repeat(121) }, t)).toHaveProperty('place'));
});

describe('batas panjang input ekskul (maxlength UTF-16 vs code point)', () => {
	const tp = (k: string, p?: Readonly<Record<string, string | number>>) =>
		p ? `${k}${JSON.stringify(p)}` : k;
	const maxMessage = 'school_admin.errors.max_chars{"max":120}';

	it('maxlength input ≥ panjang UTF-16 nama/tempat 120 emoji (tidak memotong nilai sah)', () => {
		const name = '😀'.repeat(EXTRA_NAME_MAX);
		const place = '🏟'.repeat(EXTRA_PLACE_MAX);
		expect(name.length).toBe(240); // unit UTF-16
		expect(charCount(name)).toBe(120); // code point
		expect(inputMaxLength(EXTRA_NAME_MAX)).toBeGreaterThanOrEqual(name.length);
		expect(inputMaxLength(EXTRA_PLACE_MAX)).toBeGreaterThanOrEqual(place.length);
	});

	it('120 emoji diterima, 121 ditolak lewat validator (pesan max_chars spesifik)', () => {
		expect(extraErrors({ ...base, name: '😀'.repeat(120) }, tp)).not.toHaveProperty('name');
		expect(extraErrors({ ...base, name: '😀'.repeat(121) }, tp).name).toBe(maxMessage);
		// 121–240 karakter BMP masih bisa diketik (di bawah maxlength) → validator yang menolak.
		const ascii = 'x'.repeat(EXTRA_NAME_MAX + 1);
		expect(ascii.length).toBeLessThanOrEqual(inputMaxLength(EXTRA_NAME_MAX));
		expect(extraErrors({ ...base, name: ascii }, tp).name).toBe(maxMessage);
		expect(extraErrors({ ...base, place: ascii }, tp).place).toBe(maxMessage);
	});

	it('isu server max_chars:120 (nama/tempat) = pesan klien yang sama', () => {
		// Parameter dirender sebagai teks (seperti i18n): server "120" ≡ klien 120.
		const render = (k: string, p?: Readonly<Record<string, string | number>>) =>
			`${k}|${Object.entries(p ?? {})
				.map(([n, v]) => `${n}=${v}`)
				.join(',')}`;
		expect(issueMessage(render, 'max_chars:120')).toBe('school_admin.errors.max_chars|max=120');
		expect(issueMessage(render, 'max_chars:120')).toBe(
			extraErrors({ ...base, place: 'x'.repeat(121) }, render).place
		);
		expect(issueMessage(render, 'max_chars:120')).toBe(
			extraErrors({ ...base, name: 'x'.repeat(121) }, render).name
		);
		// Parameter kode lain tetap `{value}`.
		expect(issueMessage(tp, 'schedule_clash:Budi')).toBe(
			'school_admin.errors.schedule_clash{"value":"Budi"}'
		);
	});

	it('kode isu malformed → generic; nilai boleh mengandung titik dua', () => {
		const generic = issueMessage(t, 'kode_tak_dikenal');
		expect(generic).toBe('school_admin.errors.generic');
		expect(issueMessage(tp, 'max_chars')).toBe(generic);
		expect(issueMessage(tp, 'max_chars:')).toBe(generic);
		expect(issueMessage(tp, 'min_chars')).toBe(generic);
		expect(issueMessage(t, 'constructor')).toBe(generic);
		expect(issueMessage(tp, 'schedule_clash:Budi 07:00')).toBe(
			'school_admin.errors.schedule_clash{"value":"Budi 07:00"}'
		);
	});
});

describe('extraBody', () => {
	it('kosong → null; hari jadi angka', () => {
		expect(
			extraBody({ ...base, schedule_day: '', start_time: '', end_time: '', place: '' })
		).toEqual({
			name: 'Pramuka',
			coach_id: '',
			schedule_day: null,
			start_time: null,
			end_time: null,
			place: null,
			is_mandatory: true
		});
		expect(extraBody(base).schedule_day).toBe(5);
	});
	it('atribut yang tidak diisi tidak pernah dikirim sebagai undefined → selalu ada', () => {
		const partial = { name: 'Paskibra' } as unknown as ExtraForm;
		const body = extraBody(partial);
		expect(Object.keys(body).sort()).toEqual(EXTRA_KEYS);
		for (const key of EXTRA_KEYS) expect(body[key as keyof typeof body]).not.toBeUndefined();
		expect(body).toEqual({
			name: 'Paskibra',
			coach_id: '',
			schedule_day: null,
			start_time: null,
			end_time: null,
			place: null,
			is_mandatory: false
		});
		// Lolos JSON tanpa kehilangan kunci (undefined akan hilang saat serialisasi).
		expect(Object.keys(JSON.parse(JSON.stringify(body))).sort()).toEqual(EXTRA_KEYS);
	});
	it('hari angka (select terikat angka) dan jam ber-detik dinormalisasi', () => {
		const odd = { ...base, schedule_day: 3, start_time: '14:00:00' } as unknown as ExtraForm;
		const body = extraBody(odd);
		expect(body.schedule_day).toBe(3);
		expect(body.start_time).toBe('14:00');
	});
});

describe('extraDay / extraClock', () => {
	it('extraDay: 1..6 (angka/string) → string; lainnya → kosong', () => {
		expect(extraDay(1)).toBe('1');
		expect(extraDay('6')).toBe('6');
		expect(extraDay(0)).toBe('');
		expect(extraDay(7)).toBe('');
		expect(extraDay('abc')).toBe('');
		expect(extraDay(null)).toBe('');
		expect(extraDay(undefined)).toBe('');
	});
	it('extraClock: potong detik, trim, non-string → kosong', () => {
		expect(extraClock('14:00:00')).toBe('14:00');
		expect(extraClock(' 07:30 ')).toBe('07:30');
		expect(extraClock('7.00')).toBe('7.00');
		expect(extraClock(null)).toBe('');
		expect(extraClock(930)).toBe('');
	});
});

describe('extraForm', () => {
	it('tanpa ekskul → form kosong (tidak wajib)', () =>
		expect(extraForm(null)).toEqual({
			name: '',
			coach_id: '',
			schedule_day: '',
			start_time: '',
			end_time: '',
			place: '',
			is_mandatory: false
		}));
	it('dari ekskul backend: null → kosong, hari → string, jam dinormalisasi', () => {
		const x: SchoolPlanExtra = {
			id: 'e1',
			name: 'Pramuka',
			coach_id: null,
			coach_name: '',
			schedule_day: 5,
			start_time: '14:00:00',
			end_time: '16:00',
			place: null,
			is_mandatory: true,
			member_count: 3
		};
		expect(extraForm(x)).toEqual({
			name: 'Pramuka',
			coach_id: '',
			schedule_day: '5',
			start_time: '14:00',
			end_time: '16:00',
			place: '',
			is_mandatory: true
		});
		expect(extraBody(extraForm(x))).toEqual({
			name: 'Pramuka',
			coach_id: '',
			schedule_day: 5,
			start_time: '14:00',
			end_time: '16:00',
			place: null,
			is_mandatory: true
		});
	});
});

describe('memberCandidates', () => {
	const s = (id: string, name: string, active = true) =>
		({
			id,
			name,
			nis: id,
			class_id: 'c',
			class_name: 'X-A',
			active
		}) as unknown as SchoolStudentRow;
	it('hanya murid aktif yang belum anggota, cocok kueri', () => {
		const out = memberCandidates(
			[s('1', 'Andi'), s('2', 'Budi'), s('3', 'Cici', false)],
			[{ student_id: '2' }],
			'an'
		);
		expect(out.map((x) => x.id)).toEqual(['1']);
	});
	it('cocok NIS; kueri kosong → semua kandidat', () => {
		const list = [s('1001', 'Andi'), s('2002', 'Budi')];
		expect(memberCandidates(list, [], '200').map((x) => x.id)).toEqual(['2002']);
		expect(memberCandidates(list, [], '  ').map((x) => x.id)).toEqual(['1001', '2002']);
	});
});

describe('extraDeleteMessage', () => {
	const tp = (k: string, p?: Readonly<Record<string, string | number>>) =>
		p ? `${k}:${JSON.stringify(p)}` : k;
	it('ber-anggota → jumlah anggota tahun ini; kosong/null → pesan tanpa jumlah', () => {
		expect(extraDeleteMessage(tp, 4)).toBe(
			'school_admin.planning.extra_delete_members:{"count":4}'
		);
		expect(extraDeleteMessage(tp, 0)).toBe('school_admin.planning.extra_delete_empty');
		expect(extraDeleteMessage(tp, null)).toBe('school_admin.planning.extra_delete_empty');
	});
});

describe('pilihan anggota (pickedIds/picksFor/togglePick)', () => {
	const s = (id: string, name: string, active = true) =>
		({
			id,
			name,
			nis: id,
			class_id: 'c',
			class_name: 'X-A',
			active
		}) as unknown as SchoolStudentRow;
	const students = [s('1', 'Andi'), s('2', 'Budi'), s('3', 'Cici'), s('4', 'Dodi', false)];

	it('centang A, ganti pencarian, centang B → keduanya dikirim', () => {
		let picks = emptyPicks('e1');
		// pencarian "andi": hanya A tampil, dicentang
		expect(memberCandidates(students, [], 'andi').map((x) => x.id)).toEqual(['1']);
		picks = togglePick(picks, '1', true);
		// pencarian "budi": A tersembunyi, B dicentang
		expect(memberCandidates(students, [], 'budi').map((x) => x.id)).toEqual(['2']);
		picks = togglePick(picks, '2', true);
		expect(pickedIds(picks, students, [])).toEqual(['1', '2']);
	});
	it('anggota yang sudah ada, murid nonaktif, dan centang yang dilepas tidak dikirim', () => {
		let picks = emptyPicks('e1');
		for (const id of ['1', '2', '3', '4']) picks = togglePick(picks, id, true);
		picks = togglePick(picks, '3', false);
		expect(pickedIds(picks, students, [{ student_id: '2' }])).toEqual(['1']);
	});
	it('ganti ekskul → pilihan kosong; ekskul sama → dipertahankan', () => {
		const picks = togglePick(emptyPicks('e1'), '1', true);
		expect(picksFor(picks, 'e1')).toBe(picks);
		expect(picksFor(picks, 'e2')).toEqual(emptyPicks('e2'));
		expect(pickedIds(picksFor(picks, 'e2'), students, [])).toEqual([]);
	});
});

describe('tambah anggota per tingkat (ekskul wajib)', () => {
	const G7 = { id: 'g7', grade: 7, label: 'Kelas 7', phase: 'D' };
	const G8 = { id: 'g8', grade: 8, label: 'Kelas 8', phase: 'D' };
	const G9 = { id: 'g9', grade: 9, label: 'Kelas 9', phase: 'D' };
	const tp = (k: string, p?: Record<string, string | number>) => `${k}|${JSON.stringify(p ?? {})}`;

	it('gradeMembersPayload: tingkat terpilih (tanpa duplikat), semua murid mengabaikan tingkat, kosong → null', () => {
		expect(gradeMembersPayload({ gradeLevelIds: ['g7', 'g8', 'g7'], allStudents: false })).toEqual({
			grade_level_ids: ['g7', 'g8']
		});
		expect(gradeMembersPayload({ gradeLevelIds: ['g7'], allStudents: true })).toEqual({
			all_students: true
		});
		expect(gradeMembersPayload({ gradeLevelIds: [], allStudents: false })).toBeNull();
	});

	it('gradesWithClasses: hanya tingkat yang punya kelas tahun aktif, urutan data dipertahankan', () => {
		const classes = [
			{ id: 'c1', name: '8A', grade_id: 'g8', homeroom_id: null },
			{ id: 'c2', name: '7A', grade_id: 'g7', homeroom_id: null },
			{ id: 'c3', name: '7B', grade_id: 'g7', homeroom_id: null }
		];
		expect(gradesWithClasses([G7, G8, G9], classes)).toEqual([G7, G8]);
		expect(gradesWithClasses([G7], [])).toEqual([]);
	});

	it('gradeMembersConfirm: menyebut tingkat terpilih (urut) atau semua murid', () => {
		expect(
			gradeMembersConfirm(
				tp,
				{ gradeLevelIds: ['g8', 'g7'], allStudents: false },
				[G7, G8, G9],
				'Pramuka'
			)
		).toBe('school_admin.extras.add_grades_confirm|{"grades":"7, 8","name":"Pramuka"}');
		expect(
			gradeMembersConfirm(tp, { gradeLevelIds: ['g7'], allStudents: true }, [G7, G8], 'Pramuka')
		).toBe('school_admin.extras.add_all_confirm|{"name":"Pramuka"}');
	});

	it('membersAdded: selisih anggota sesudah − sebelum, tidak pernah negatif', () => {
		expect(membersAdded(3, 10)).toBe(7);
		expect(membersAdded(5, 5)).toBe(0);
		expect(membersAdded(5, 4)).toBe(0);
	});

	it('pesan isu not_mandatory tersedia di id & en', () => {
		for (const locale of ['id', 'en']) {
			const json = JSON.parse(readFileSync(`src/lib/i18n/${locale}.json`, 'utf8'));
			expect(json.school_admin.errors.not_mandatory).toEqual(expect.any(String));
		}
	});
});
