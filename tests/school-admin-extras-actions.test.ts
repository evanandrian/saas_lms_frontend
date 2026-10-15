import type { RequestEvent } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Aksi anggota ekskul: daftar murid eksplisit & id tervalidasi sebelum diteruskan ke backend. */
vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('$env/dynamic/private', () => ({ env: { LMS_API_INTERNAL_URL: 'http://backend.test' } }));
type ApiCall = (...args: unknown[]) => Promise<typeof ok>;
const ok = { ok: true, data: { extra_id: 'x', year_id: 'y', members: [] } };
const addExtraMembers = vi.fn<ApiCall>(async () => ok);
const removeExtraMember = vi.fn<ApiCall>(async () => ok);
const fetchExtraMembers = vi.fn<ApiCall>(async () => ok);
vi.mock('$lib/features/school-admin/school-admin.api', () => ({
	addExtraMembers,
	removeExtraMember,
	fetchExtraMembers
}));

const { extrasPageActions } = await import('$lib/features/school-admin/school-admin.server');

const EXTRA = '11111111-1111-1111-1111-111111111111';
const STUDENT = '22222222-2222-2222-2222-222222222222';
const CLASS = '33333333-3333-3333-3333-333333333333';

function event(body: unknown): RequestEvent {
	const form = new FormData();
	form.set('body', JSON.stringify(body));
	return {
		fetch,
		cookies: { get: () => undefined },
		request: new Request('http://app.test/app/admin/extracurriculars', {
			method: 'POST',
			body: form
		}),
		getClientAddress: () => '127.0.0.1'
	} as unknown as RequestEvent;
}

const run = (name: string, body: unknown) =>
	(extrasPageActions[name] as (e: RequestEvent) => Promise<unknown>)(event(body));
const status = (out: unknown) => (out as { status?: number }).status;

describe('extrasPageActions', () => {
	beforeEach(() => {
		addExtraMembers.mockClear();
		removeExtraMember.mockClear();
		fetchExtraMembers.mockClear();
	});

	it('memakai aksi ekskul setup yang sama (wizard & halaman identik)', () => {
		for (const name of ['planning', 'extraSave', 'extraRemove', 'students'])
			expect(typeof extrasPageActions[name]).toBe('function');
	});

	it('tambah murid terpilih → hanya student_ids yang dikirim', async () => {
		await run('extraMembersAdd', { id: EXTRA, studentIds: [STUDENT] });
		expect(addExtraMembers.mock.calls[0]?.slice(1)).toEqual([EXTRA, { student_ids: [STUDENT] }]);
	});

	it('tambah seluruh kelas → hanya class_id yang dikirim', async () => {
		await run('extraMembersAdd', { id: EXTRA, classId: CLASS });
		expect(addExtraMembers.mock.calls[0]?.slice(1)).toEqual([EXTRA, { class_id: CLASS }]);
	});

	it('tanpa murid & kelas, id tidak valid, atau daftar bukan array → 400 tanpa panggilan', async () => {
		for (const body of [
			{ id: EXTRA },
			{ id: EXTRA, studentIds: [] },
			{ id: EXTRA, studentIds: STUDENT },
			{ id: EXTRA, studentIds: [STUDENT, 'x'] },
			{ id: EXTRA, classId: 'kelas' },
			{ id: 'bukan-uuid', studentIds: [STUDENT] }
		])
			expect(status(await run('extraMembersAdd', body))).toBe(400);
		expect(addExtraMembers).not.toHaveBeenCalled();
	});

	it('keluarkan anggota butuh id ekskul & murid valid', async () => {
		expect(status(await run('extraMemberRemove', { id: EXTRA }))).toBe(400);
		await run('extraMemberRemove', { id: EXTRA, studentId: STUDENT });
		expect(removeExtraMember.mock.calls[0]?.slice(1)).toEqual([EXTRA, STUDENT]);
	});

	it('daftar anggota butuh id valid', async () => {
		expect(status(await run('extraMembers', { id: 'x' }))).toBe(400);
		await run('extraMembers', { id: EXTRA });
		expect(fetchExtraMembers.mock.calls[0]?.slice(1)).toEqual([EXTRA]);
	});
});
