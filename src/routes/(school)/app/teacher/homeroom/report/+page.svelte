<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import StatusPill from '$lib/features/school-admin/components/StatusPill.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import { PREFIX, failureMessage, percent } from '$lib/features/school-admin/school-admin.model';
	import type { SchoolClassReport } from '$lib/features/school-admin/school-admin.types';
	import { useI18n } from '$lib/i18n';
	import { formatDate, formatNumber } from '$lib/utils/format';
	import { runPageAction } from '$lib/utils/page-action';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleDashed from '@lucide/svelte/icons/circle-dashed';
	import Info from '@lucide/svelte/icons/info';
	import Lock from '@lucide/svelte/icons/lock';
	import Save from '@lucide/svelte/icons/save';
	import Send from '@lucide/svelte/icons/send';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import Users from '@lucide/svelte/icons/users';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const uid = $props.id();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`homeroom_report.${key}`, params);

	/** Cermin validasi backend (SaveReportNotes): catatan wali kelas ≤ 1000 karakter. */
	const MAX_NOTE = 1000;
	const BACKEND_ERROR_PREFIX = `${PREFIX}.errors.`;
	const REPORT_ERROR_CODES = new Set([
		'max_length',
		'subjects_not_locked',
		'notes_incomplete',
		'invalid_transition',
		'semester_required'
	]);
	const ISSUE_FIELD = /^entries\[(\d+)\]\.note$/;
	const STATUS_TONE = {
		draft: 'neutral',
		submitted: 'info',
		approved: 'success',
		locked: 'success'
	} as const;
	const TIMELINE_STEPS = ['submitted', 'approved', 'locked'] as const;
	const DATE_TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

	// Toast kegagalan: kode khusus rapor memakai namespace `homeroom_report.errors`.
	const editorT = (key: string, params?: Readonly<Record<string, string | number>>) => {
		const code = key.startsWith(BACKEND_ERROR_PREFIX) ? key.slice(BACKEND_ERROR_PREFIX.length) : '';
		return REPORT_ERROR_CODES.has(code) ? t(`errors.${code}`, params) : i18n.t(key, params);
	};
	const editor = createRecordEditor<SchoolClassReport>(editorT, (v) => hydrate(v));

	let override = $state<SchoolClassReport | null>(null);
	const view = $derived(override ?? data.view);
	const students = $derived(view?.students ?? []);
	let notes = $state<Record<string, string>>({});
	let serverErrors = $state<Record<string, string>>({});
	let confirmSubmit = $state(false);
	let busy = $state(false);

	function hydrate(v: SchoolClassReport | null) {
		notes = Object.fromEntries((v?.students ?? []).map((s) => [s.student_id, s.note]));
		serverErrors = {};
	}

	// Isian lokal mengikuti rapor yang dimuat.
	$effect(() => {
		const v = data.view;
		override = null;
		hydrate(v);
	});

	const charCount = (text: string) => [...text.trim()].length;
	const noteOf = (id: string) => notes[id] ?? '';
	const formatScore = (value: number) =>
		formatNumber(value, i18n.locale, { maximumFractionDigits: 2 });

	const canEditNotes = $derived(view?.actions.includes('notes') ?? false);
	const canSubmit = $derived(view?.actions.includes('submit') ?? false);
	const subjectNames = $derived(
		Object.fromEntries((view?.subjects ?? []).map((s) => [s.subject_id, s.subject]))
	);
	const lockedSubjects = $derived((view?.subjects ?? []).filter((s) => s.locked).length);
	const notesFilled = $derived(students.filter((s) => noteOf(s.student_id).trim() !== '').length);
	const dirty = $derived(students.some((s) => noteOf(s.student_id).trim() !== s.note.trim()));
	const errors = $derived(
		Object.fromEntries(
			students.map((s) => [
				s.student_id,
				serverErrors[s.student_id] ??
					(charCount(noteOf(s.student_id)) > MAX_NOTE
						? t('issue.note_max_length', { max: MAX_NOTE })
						: '')
			])
		) as Record<string, string>
	);
	const hasInputError = $derived(Object.values(errors).some(Boolean));
	const submitHint = $derived.by(() => {
		if (!view || view.status !== 'draft') return '';
		if (dirty) return t('hint_unsaved');
		if (!view.all_locked) return t('hint_subjects');
		if (!view.notes_complete) return t('hint_notes');
		return canSubmit ? t('hint_ready') : '';
	});
	const timeline = $derived(
		view
			? TIMELINE_STEPS.map((step) => ({
					step,
					by: view[`${step}_by`],
					at: view[`${step}_at`]
				}))
			: []
	);

	function editNote(id: string, value: string) {
		notes[id] = value;
		if (serverErrors[id]) {
			const rest = { ...serverErrors };
			delete rest[id];
			serverErrors = rest;
		}
	}

	async function run(name: string, body: unknown, ids: readonly string[] = []) {
		busy = true;
		const out = await runPageAction<SchoolClassReport>(name, body);
		busy = false;
		if (!out.ok) {
			const next: Record<string, string> = {};
			for (const issue of out.issues) {
				const match = ISSUE_FIELD.exec(issue.field);
				const id = match ? ids[Number(match[1])] : undefined;
				if (id)
					next[id] =
						issue.code === 'max_length'
							? t('issue.note_max_length', { max: MAX_NOTE })
							: t('issue.generic');
			}
			serverErrors = next;
			editor.notify(failureMessage(editorT, out), true);
			// Status rapor berubah di tempat lain (409) → muat ulang agar tampilan sesuai.
			if (out.code === 'invalid_transition') void invalidateAll();
			return null;
		}
		override = out.data;
		hydrate(out.data);
		return out.data;
	}

	async function saveNotes(): Promise<boolean> {
		if (!view || busy || !canEditNotes) return false;
		if (hasInputError) {
			editor.notify(t('fix_errors'), true);
			return false;
		}
		const entries = students.map((s) => ({
			student_id: s.student_id,
			note: noteOf(s.student_id).trim()
		}));
		const out = await run(
			'notes',
			{ entries },
			entries.map((e) => e.student_id)
		);
		if (out) editor.notify(t('notes_saved'));
		return Boolean(out);
	}

	async function submit() {
		if (!view) return;
		// Catatan yang belum tersimpan ikut disimpan dulu agar yang diajukan sesuai layar.
		if (dirty && !(await saveNotes())) return;
		const out = await run('submit', {});
		if (out) editor.notify(t('submitted_toast', { class: out.class }));
	}
</script>

<svelte:head
	><title>{view ? t('title', { class: view.class }) : t('title_plain')} · FLIXARE</title
	></svelte:head
>

{#snippet check(done: boolean, label: string, detail: string)}
	<li class="border-lms-border flex items-start gap-2.5 border-t py-2 first:border-t-0">
		<span class={['pt-0.5', done ? 'text-lms-success-text' : 'text-lms-warning-text']}
			><Icon icon={done ? CircleCheck : CircleDashed} size="sm" /></span
		>
		<span class="flex min-w-0 flex-col">
			<span class="text-[13px] font-semibold">{label}</span>
			<span class="text-lms-muted text-xs">{detail}</span>
		</span>
	</li>
{/snippet}

{#if !view}
	<div class="text-lms-foreground flex flex-col gap-4 pb-24">
		<HeroBanner eyebrow={t('eyebrow_plain')} title={t('title_plain')} help="help.homeroom_report" />
		<StatePanel
			tone={data.failure === 'forbidden' ? 'warning' : 'error'}
			title={data.failure === 'forbidden'
				? t('not_homeroom_title')
				: i18n.t(`${PREFIX}.common.load_failed`)}
			description={data.failure === 'forbidden'
				? t('not_homeroom_desc')
				: i18n.t(`${PREFIX}.failure.${data.failure}`)}
		/>
	</div>
{:else}
	<div
		class="text-lms-foreground flex min-w-0 flex-col gap-4 pb-28"
		data-screen-label="Rapor kelas"
	>
		<HeroBanner
			eyebrow={t('eyebrow', { term: view.term, year: view.year })}
			title={t('title', { class: view.class })}
			description={t(`desc_${view.status}`)}
			actionsPlacement="end"
			help="help.homeroom_report"
		>
			{#snippet actions()}
				<span
					class="bg-lms-on-hero/8 border-lms-on-hero/14 text-lms-on-hero inline-flex h-10 items-center gap-2 rounded-[10px] border px-3.5 text-sm font-semibold"
				>
					{i18n.t(`${PREFIX}.reports.status_${view.status}`)}
					<span class="text-lms-on-hero-muted font-mono text-xs"
						>{t('version', { version: view.version })}</span
					>
				</span>
			{/snippet}
		</HeroBanner>

		{#if view.status === 'draft' && view.returned_note}
			<div role="alert" class="lms-tone-warning flex items-start gap-3 rounded-xl px-4 py-3">
				<Icon icon={Undo2} />
				<span class="flex min-w-0 flex-col gap-0.5 text-[13px] leading-[19px]">
					<strong
						>{view.returned_by
							? t('returned_by', { name: view.returned_by })
							: t('returned_title')}</strong
					>
					<span class="whitespace-pre-line">{view.returned_note}</span>
				</span>
			</div>
		{/if}

		{#if view.status !== 'draft'}
			<div role="status" class="lms-tone-info flex items-start gap-3 rounded-xl px-4 py-3">
				<Icon icon={view.status === 'submitted' ? Info : Lock} />
				<span class="text-[13px] leading-[19px]">{t(`banner_${view.status}`)}</span>
			</div>
		{/if}

		<div class="grid items-start gap-4 min-[1000px]:grid-cols-[minmax(0,1fr)_340px]">
			<aside class="flex min-w-0 flex-col gap-4 min-[1000px]:order-2">
				<section
					class="bg-lms-surface border-lms-border flex flex-col gap-2 rounded-xl border p-5"
					aria-labelledby="{uid}-check"
				>
					<div class="flex items-center justify-between gap-2">
						<h2 id="{uid}-check" class="text-[0.9375rem] font-bold">{t('checklist_title')}</h2>
						<StatusPill
							tone={STATUS_TONE[view.status]}
							label={`${i18n.t(`${PREFIX}.reports.status_${view.status}`)} · ${t('version', { version: view.version })}`}
						/>
					</div>
					<ul class="flex flex-col">
						{@render check(
							view.all_locked,
							t('check_subjects'),
							t('check_subjects_detail', { locked: lockedSubjects, total: view.subjects.length })
						)}
						{@render check(
							view.notes_complete,
							t('check_notes'),
							t('check_notes_detail', { filled: notesFilled, total: students.length })
						)}
						{@render check(true, t('check_attendance'), t('check_attendance_detail'))}
					</ul>
				</section>

				<section
					class="bg-lms-surface border-lms-border flex flex-col gap-2 rounded-xl border p-5"
					aria-labelledby="{uid}-subjects"
				>
					<h2 id="{uid}-subjects" class="text-[0.9375rem] font-bold">
						{t('subjects_title', { locked: lockedSubjects, total: view.subjects.length })}
					</h2>
					{#if view.subjects.length}
						<ul class="flex flex-col">
							{#each view.subjects as subject (subject.subject_id)}
								<li
									class="border-lms-border flex items-center gap-2.5 border-t py-2 text-[13px] first:border-t-0"
								>
									<span class={subject.locked ? 'text-lms-success-text' : 'text-lms-warning-text'}
										><Icon icon={subject.locked ? Lock : CircleDashed} size="sm" /></span
									>
									<span class="flex min-w-0 flex-1 flex-col">
										<span class="truncate font-semibold">{subject.subject}</span>
										<span class="text-lms-muted truncate text-xs"
											>{subject.teacher || t('no_teacher')} · {i18n.t('grades.filled_of', {
												filled: subject.filled,
												total: students.length
											})}</span
										>
									</span>
									<StatusPill
										tone={subject.locked ? 'success' : 'warning'}
										label={subject.locked ? t('subject_locked') : t('subject_open')}
									/>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-lms-muted text-xs">{t('no_subjects')}</p>
					{/if}
				</section>

				{#if view.status !== 'draft' || view.submitted_at}
					<section
						class="bg-lms-surface border-lms-border flex flex-col gap-2 rounded-xl border p-5"
						aria-labelledby="{uid}-timeline"
					>
						<h2 id="{uid}-timeline" class="text-[0.9375rem] font-bold">{t('timeline_title')}</h2>
						<ol class="flex flex-col">
							{#each timeline as item (item.step)}
								{@render check(
									Boolean(item.at),
									t(`timeline_${item.step}`),
									item.at
										? t('timeline_by', {
												name: item.by || '—',
												date: formatDate(item.at, i18n.locale, DATE_TIME)
											})
										: t('timeline_waiting')
								)}
							{/each}
						</ol>
					</section>
				{/if}
			</aside>

			<section class="lms-card flex min-w-0 flex-col rounded-xl!" aria-labelledby="{uid}-students">
				<div
					class="border-lms-border flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
				>
					<h2 id="{uid}-students" class="text-[0.9375rem] font-bold">
						{t('students_title', { count: students.length })}
					</h2>
					<span class="text-lms-muted text-xs">{t('attendance_legend')}</span>
				</div>
				{#each students as student, index (student.student_id)}
					{@const note = noteOf(student.student_id)}
					{@const error = errors[student.student_id]}
					{@const count = charCount(note)}
					<article
						class="border-lms-border flex flex-col gap-2.5 border-b px-4 py-3.5 last:border-b-0"
					>
						<div class="flex flex-wrap items-start gap-x-3 gap-y-1.5">
							<span class="text-lms-muted pt-0.5 font-mono text-xs">{index + 1}</span>
							<span class="flex min-w-0 flex-[1_1_180px] flex-col">
								<span class="truncate text-[13px] font-semibold">{student.name}</span>
								<span class="text-lms-muted font-mono text-[11px]"
									>{i18n.t('grades.sheet.nis', { nis: student.nis })}</span
								>
							</span>
							<span class="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
								<span class="bg-lms-surface-muted rounded-full px-2 py-0.5 tabular-nums"
									>{t('average', {
										value: student.average === null ? '—' : formatScore(student.average)
									})}</span
								>
								<span
									class="bg-lms-surface-muted rounded-full px-2 py-0.5 tabular-nums"
									title={t('attendance_title')}
									>{t('attendance_short', {
										sick: student.sick,
										permit: student.permit,
										absent: student.absent
									})}</span
								>
							</span>
						</div>
						{#if student.scores.length}
							<ul
								class="flex flex-wrap gap-1.5"
								aria-label={t('scores_of', { name: student.name })}
							>
								{#each student.scores as score (score.subject_id)}
									<li
										class="border-lms-border inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]"
									>
										<span class="text-lms-muted max-w-[120px] truncate"
											>{subjectNames[score.subject_id] ?? '—'}</span
										>
										<span class="font-bold tabular-nums">{formatScore(score.score)}</span>
									</li>
								{/each}
							</ul>
						{/if}
						{#if canEditNotes}
							<label class="flex flex-col gap-1">
								<span class="text-xs font-semibold">{t('note_label')}</span>
								<textarea
									rows="2"
									maxlength={MAX_NOTE}
									placeholder={t('note_ph')}
									aria-invalid={Boolean(error)}
									class={[
										'lms-input lms-focus-ring min-h-16 w-full rounded-[10px] border-[1.5px] px-3 py-2 text-[13px] leading-5',
										error ? 'border-lms-danger-text' : 'border-lms-input-border'
									]}
									value={note}
									disabled={busy}
									oninput={(e) => editNote(student.student_id, e.currentTarget.value)}></textarea>
								<span class="flex justify-between gap-2 text-[11px]">
									<span class="text-lms-danger-text">{error}</span>
									<span
										class="tabular-nums {count > MAX_NOTE
											? 'text-lms-danger-text'
											: 'text-lms-muted'}"
										>{i18n.t('grades.sheet.char_count', { count, max: MAX_NOTE })}</span
									>
								</span>
							</label>
						{:else}
							<div class="bg-lms-surface-muted flex flex-col gap-0.5 rounded-lg px-3 py-2">
								<span class="text-lms-muted text-[11px] font-semibold">{t('note_label')}</span>
								<p class="text-[13px] leading-5 whitespace-pre-line">{student.note || '—'}</p>
							</div>
						{/if}
					</article>
				{:else}
					<p class="text-lms-muted px-4 py-9 text-center text-sm">{t('no_students')}</p>
				{/each}
			</section>
		</div>

		{#if canEditNotes || canSubmit}
			<div
				class="lms-card sticky bottom-19 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[14px]! py-3 ps-4 pe-3 shadow-[0_18px_40px_-24px_color-mix(in_oklab,var(--color-lms-brand-deep-neutral)_40%,transparent)]!"
			>
				<div class="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5" aria-live="polite">
					<span class="text-[0.8125rem] font-semibold tabular-nums"
						>{t('notes_progress', { filled: notesFilled, total: students.length })}</span
					>
					<div class="bg-lms-surface-muted h-1.5 overflow-hidden rounded-full">
						<div
							class="bg-lms-interactive h-full rounded-full transition-[width]"
							style:width="{percent(notesFilled, students.length)}%"
						></div>
					</div>
					{#if submitHint}<span class="text-lms-muted text-xs">{submitHint}</span>{/if}
				</div>
				<div class="flex flex-wrap gap-2">
					{#if canEditNotes}
						<button
							type="button"
							class="lms-action-secondary lms-focus-ring inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-sm font-bold disabled:opacity-50"
							disabled={busy || !dirty}
							onclick={saveNotes}><Icon icon={Save} size="sm" />{t('save_notes')}</button
						>
					{/if}
					<button
						type="button"
						class="lms-action-primary lms-focus-ring inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-bold disabled:opacity-50"
						disabled={busy || !canSubmit}
						onclick={() => (confirmSubmit = true)}
						><Icon icon={Send} size="sm" />{t('submit')}</button
					>
				</div>
			</div>
		{/if}
	</div>

	<ConfirmDialog
		bind:open={confirmSubmit}
		tone="primary"
		icon={Send}
		title={t('submit_title')}
		message={t('submit_message', { class: view.class })}
		details={[
			{
				icon: Users,
				label: t('submit_detail_students'),
				value: String(students.length)
			},
			{
				icon: Lock,
				label: t('submit_detail_subjects'),
				value: i18n.t('grades.filled_of', { filled: lockedSubjects, total: view.subjects.length })
			}
		]}
		confirmLabel={t('submit')}
		confirmIcon={Send}
		busyLabel={t('submitting')}
		cancelLabel={i18n.t(`${PREFIX}.common.cancel`)}
		onconfirm={submit}
	/>
{/if}

<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
