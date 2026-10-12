<script lang="ts">
	import { resolve } from '$app/paths';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import ModuleShell, {
		type ModuleStat
	} from '$lib/features/school-admin/components/ModuleShell.svelte';
	import StatusPill from '$lib/features/school-admin/components/StatusPill.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import {
		PREFIX,
		percent,
		type ReportStatus
	} from '$lib/features/school-admin/school-admin.model';
	import type {
		SchoolClassReport,
		SchoolReportStudent
	} from '$lib/features/school-admin/school-admin.types';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { EMPTY_VALUE, formatDateTime, formatNumber } from '$lib/utils/format';
	import { runPageAction } from '$lib/utils/page-action';
	import type { LucideIcon } from '@lucide/svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Clock3 from '@lucide/svelte/icons/clock-3';
	import Download from '@lucide/svelte/icons/download';
	import Lock from '@lucide/svelte/icons/lock';
	import LockOpen from '@lucide/svelte/icons/lock-open';
	import Send from '@lucide/svelte/icons/send';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.reports.${key}`, params);
	const tc = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);

	/** Batas alasan pengembalian/buka kunci (cermin backend minReturnNote/maxReturnNote). */
	const REASON_MIN = 10;
	const REASON_MAX = 500;
	/** Catatan wali kelas lebih panjang dari ini diringkas dengan tombol "Selengkapnya". */
	const NOTE_PREVIEW_CHARS = 90;
	const TONE = {
		draft: 'neutral',
		submitted: 'info',
		approved: 'success',
		locked: 'success'
	} as const;
	const STAT_TONE = {
		draft: 'default',
		submitted: 'default',
		approved: 'success',
		locked: 'success'
	} as const;

	type ReasonAction = 'return' | 'unlock';

	// svelte-ignore state_referenced_locally
	let report = $state<SchoolClassReport | null>(data.view);
	const editor = createRecordEditor<SchoolClassReport>(i18n.t, (v) => (report = v));

	let approveOpen = $state(false);
	let lockOpen = $state(false);
	let reasonOpen = $state(false);
	let reasonAction = $state<ReasonAction>('return');
	let reason = $state('');
	let reasonInvalid = $state(false);
	let expanded = $state<string[]>([]);

	const status = $derived((report?.status ?? 'draft') as ReportStatus);
	const can = $derived(new Set<string>(report?.actions ?? []));
	const lockedSubjects = $derived(report?.subjects.filter((s) => s.locked).length ?? 0);
	const reasonLength = $derived([...reason.trim()].length);
	const STAMP_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

	const stats = $derived<ModuleStat[]>(
		report
			? [
					{
						label: t('review.stat_status'),
						value: t(`status_${status}`),
						tone: STAT_TONE[status]
					},
					{
						label: t('review.stat_subjects'),
						value: `${lockedSubjects}/${report.subjects.length}`,
						bar: percent(lockedSubjects, report.subjects.length),
						tone: lockedSubjects === report.subjects.length ? 'success' : 'default'
					},
					{ label: t('review.stat_students'), value: report.students.length },
					{
						label: t('review.stat_version'),
						value: t('review.version', { version: report.version })
					}
				]
			: []
	);

	const timeline = $derived(
		report
			? [
					{
						key: 'submitted',
						icon: Send,
						by: report.submitted_by,
						at: report.submitted_at
					},
					{
						key: 'approved',
						icon: CircleCheck,
						by: report.approved_by,
						at: report.approved_at
					},
					{ key: 'locked', icon: Lock, by: report.locked_by, at: report.locked_at }
				]
			: []
	);

	const formatStamp = (iso: string | null) =>
		iso ? formatDateTime(iso, i18n.locale, STAMP_FORMAT) : '';
	const formatScore = (value: number | null | undefined) =>
		value === null || value === undefined
			? EMPTY_VALUE
			: formatNumber(value, i18n.locale, { maximumFractionDigits: 1 });
	const scoreOf = (student: SchoolReportStudent, subjectId: string) =>
		student.scores.find((s) => s.subject_id === subjectId)?.score;

	const pdfHref = (classId: string, studentId?: string) =>
		`${resolve(APP_PATHS.SCHOOL_ADMIN_REPORT_PDF)}?${new URLSearchParams(
			studentId ? { class: classId, student: studentId } : { class: classId }
		)}`;

	function toggleNote(studentId: string) {
		expanded = expanded.includes(studentId)
			? expanded.filter((id) => id !== studentId)
			: [...expanded, studentId];
	}

	/** Status sudah berubah di sisi lain (invalid_transition): segarkan tampilan tanpa toast tambahan. */
	async function refresh(classId: string) {
		const out = await runPageAction<SchoolClassReport>('detail', { id: classId });
		if (out.ok) report = out.data;
	}

	async function perform(
		name: 'approve' | 'lock' | ReasonAction,
		body: Record<string, string>,
		message: (next: SchoolClassReport) => string
	): Promise<boolean> {
		if (!report) return false;
		const classId = report.class_id;
		const next = await editor.run<SchoolClassReport>(name, { id: classId, ...body });
		if (next) {
			report = next;
			editor.notify(message(next));
			return true;
		}
		if (editor.lastCode === 'invalid_transition') void refresh(classId);
		return false;
	}

	async function approve() {
		await perform('approve', {}, (next) => t('review.approved_toast', { class: next.class }));
	}
	async function lock() {
		await perform('lock', {}, (next) => t('review.locked_toast', { class: next.class }));
	}

	function openReason(action: ReasonAction) {
		reasonAction = action;
		reasonInvalid = false;
		reasonOpen = true;
	}

	async function submitReason() {
		const action = reasonAction;
		const ok = await perform(action, { reason: reason.trim() }, (next) =>
			action === 'return'
				? t('review.returned_toast', { class: next.class })
				: t('review.unlocked_toast', { class: next.class, version: next.version })
		);
		if (ok) reason = '';
	}

	function onReasonInput(event: Event & { currentTarget: HTMLTextAreaElement }) {
		reasonInvalid = false;
		const length = [...event.currentTarget.value.trim()].length;
		event.currentTarget.setCustomValidity(
			length >= REASON_MIN && length <= REASON_MAX
				? ''
				: t('review.reason_error', { min: REASON_MIN, max: REASON_MAX })
		);
	}

	function onReasonInvalid(event: Event) {
		// Pesan validasi native diganti pesan i18n di bawah field.
		event.preventDefault();
		reasonInvalid = true;
	}
</script>

<svelte:head
	><title>{report ? t('review.title', { class: report.class }) : t('title')} · FLIXARE</title
	></svelte:head
>

{#snippet actionButton(
	icon: LucideIcon,
	label: string,
	variant: 'primary' | 'secondary',
	onclick: () => void
)}
	<button
		type="button"
		class="lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-semibold disabled:opacity-50 {variant ===
		'primary'
			? 'lms-action-primary'
			: 'lms-action-secondary'}"
		disabled={editor.busy}
		{onclick}><Icon {icon} size="sm" />{label}</button
	>
{/snippet}

{#if !report}
	<div class="flex flex-col gap-4 pb-24">
		<a
			href={resolve(APP_PATHS.SCHOOL_ADMIN_REPORTS)}
			class="text-lms-link lms-focus-ring inline-flex w-fit items-center gap-1.5 text-sm font-semibold"
			><Icon icon={ArrowLeft} size="sm" />{t('review.back')}</a
		>
		<StatePanel
			headingLevel={1}
			tone="error"
			title={tc('common.load_failed')}
			description={tc(`failure.${data.failure}`)}
		/>
	</div>
{:else}
	<ModuleShell
		eyebrow={t('review.eyebrow')}
		title={t('review.title', { class: report.class })}
		description={t('review.desc', {
			term: report.term,
			year: report.year,
			homeroom: report.homeroom || t('no_homeroom')
		})}
		{stats}
		help="help.school_admin_report_class"
	>
		{#snippet actions()}
			<a
				href={resolve(APP_PATHS.SCHOOL_ADMIN_REPORTS)}
				class="bg-lms-on-hero/8 border-lms-on-hero/14 text-lms-on-hero lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] border px-4 text-[13px] font-semibold"
				><Icon icon={ArrowLeft} size="sm" />{t('review.back')}</a
			>
			{#if report && can.has('download')}
				<!-- eslint-disable svelte/no-navigation-without-resolve -- path PDF sudah lewat resolve(); hanya query kelas -->
				<a
					href={pdfHref(report.class_id)}
					data-sveltekit-reload
					class="bg-lms-on-hero text-lms-brand-deep-neutral hover:bg-lms-on-hero/90 lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-semibold"
					><Icon icon={Download} size="sm" />{t('review.download_class')}</a
				>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{/if}
		{/snippet}

		{#if report.returned_note && status === 'draft'}
			<div role="status" class="lms-tone-warning flex items-start gap-3 rounded-xl px-4 py-3">
				<Icon icon={Undo2} />
				<span class="flex min-w-0 flex-col gap-0.5 text-[13px] leading-[19px]">
					<strong>{t('review.returned_title')}</strong>
					<span class="break-words whitespace-pre-line">{report.returned_note}</span>
					{#if report.returned_by}
						<span class="text-xs opacity-80"
							>{t('review.returned_by', { name: report.returned_by })}</span
						>
					{/if}
				</span>
			</div>
		{/if}

		<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
			<section class="lms-card flex flex-col gap-3 rounded-xl p-5">
				<header class="flex flex-col gap-0.5">
					<h2 class="text-[0.9375rem] font-bold">{t('review.timeline_title')}</h2>
					<p class="text-lms-muted text-xs">{t(`review.status_hint_${status}`)}</p>
				</header>
				<ol class="flex flex-col">
					{#each timeline as step (step.key)}
						{@const done = Boolean(step.at)}
						<li class="border-lms-border flex items-center gap-3 border-t py-2.5">
							<span
								class="flex size-8 flex-none items-center justify-center rounded-lg {done
									? 'lms-tone-success'
									: 'bg-lms-surface-muted text-lms-muted'}"
							>
								<Icon icon={done ? step.icon : Clock3} size="sm" />
							</span>
							<span class="flex min-w-0 flex-col gap-px">
								<span class="text-[13px] font-semibold">{t(`review.step_${step.key}`)}</span>
								<span class="text-lms-muted truncate text-xs">
									{done
										? t('review.step_by', {
												name: step.by || t('review.someone'),
												date: formatStamp(step.at)
											})
										: t('review.step_pending')}
								</span>
							</span>
						</li>
					{/each}
				</ol>
			</section>

			<section class="lms-card flex flex-col gap-3 rounded-xl p-5">
				<header class="flex flex-col gap-0.5">
					<h2 class="text-[0.9375rem] font-bold">{t('review.subjects_title')}</h2>
					<p class="text-lms-muted text-xs">
						{t('review.subjects_desc', {
							locked: lockedSubjects,
							total: report.subjects.length
						})}
					</p>
				</header>
				<ul class="flex max-h-80 flex-col overflow-y-auto">
					{#each report.subjects as subject (subject.subject_id)}
						<li class="border-lms-border flex items-center gap-3 border-t py-2">
							<span class="flex min-w-0 flex-1 flex-col gap-px">
								<span class="truncate text-[13px] font-semibold">{subject.subject}</span>
								<span
									class="truncate text-xs {subject.teacher
										? 'text-lms-muted'
										: 'text-lms-warning-text'}"
									>{subject.teacher || t('review.no_teacher')} · {t('review.subject_filled', {
										count: subject.filled
									})}</span
								>
							</span>
							<StatusPill
								tone={subject.locked ? 'success' : 'warning'}
								label={subject.locked ? t('review.subject_locked') : t('review.subject_open')}
							/>
						</li>
					{:else}
						<li class="text-lms-muted py-6 text-center text-sm">{t('review.no_subjects')}</li>
					{/each}
				</ul>
			</section>
		</div>

		<section class="lms-card flex flex-col rounded-xl">
			<header
				class="border-lms-border flex flex-wrap items-end justify-between gap-2 border-b px-4 py-3"
			>
				<div class="flex flex-col gap-0.5">
					<h2 class="text-[0.9375rem] font-bold">{t('review.students_title')}</h2>
					<p class="text-lms-muted text-xs">
						{t('students', { count: report.students.length })}
					</p>
				</div>
				<span class="text-lms-muted text-xs">{t('review.attendance_legend')}</span>
			</header>
			{#if report.students.length}
				<div class="overflow-x-auto">
					<table class="w-full min-w-max border-collapse text-[13px]">
						<thead>
							<tr
								class="border-lms-border text-lms-muted border-b text-start font-mono text-[10px] tracking-[0.1em]"
							>
								<th class="bg-lms-surface sticky start-0 z-10 px-4 py-2 text-start font-normal"
									>{t('review.head_student')}</th
								>
								{#each report.subjects as subject (subject.subject_id)}
									<th
										class="max-w-28 truncate px-2 py-2 text-end font-normal"
										title={subject.subject}>{subject.subject}</th
									>
								{/each}
								<th class="px-2 py-2 text-end font-normal">{t('review.head_average')}</th>
								<th class="px-2 py-2 text-end font-normal" title={t('review.sick')}
									>{t('review.head_sick')}</th
								>
								<th class="px-2 py-2 text-end font-normal" title={t('review.permit')}
									>{t('review.head_permit')}</th
								>
								<th class="px-2 py-2 text-end font-normal" title={t('review.absent')}
									>{t('review.head_absent')}</th
								>
								<th class="min-w-56 px-3 py-2 text-start font-normal">{t('review.head_note')}</th>
								{#if status === 'locked'}
									<th class="px-4 py-2"><span class="sr-only">{t('review.head_pdf')}</span></th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each report.students as student (student.student_id)}
								{@const open = expanded.includes(student.student_id)}
								{@const long = student.note.length > NOTE_PREVIEW_CHARS}
								<tr class="border-lms-border border-b align-top">
									<th
										scope="row"
										class="bg-lms-surface sticky start-0 z-10 px-4 py-2.5 text-start font-normal"
									>
										<span class="flex flex-col gap-px">
											<span class="font-semibold">{student.name}</span>
											<span class="text-lms-muted font-mono text-[11px]">{student.nis}</span>
										</span>
									</th>
									{#each report.subjects as subject (subject.subject_id)}
										<td class="px-2 py-2.5 text-end tabular-nums"
											>{formatScore(scoreOf(student, subject.subject_id))}</td
										>
									{/each}
									<td class="px-2 py-2.5 text-end font-bold tabular-nums"
										>{formatScore(student.average)}</td
									>
									<td class="px-2 py-2.5 text-end tabular-nums">{student.sick}</td>
									<td class="px-2 py-2.5 text-end tabular-nums">{student.permit}</td>
									<td
										class="px-2 py-2.5 text-end tabular-nums {student.absent
											? 'text-lms-danger-text font-semibold'
											: ''}">{student.absent}</td
									>
									<td class="max-w-80 px-3 py-2.5">
										{#if student.note}
											<p
												class="text-lms-foreground/80 break-words whitespace-pre-line {open
													? ''
													: 'line-clamp-2'}"
											>
												{student.note}
											</p>
											{#if long}
												<button
													type="button"
													class="text-lms-link lms-focus-ring mt-0.5 text-xs font-semibold"
													aria-expanded={open}
													onclick={() => toggleNote(student.student_id)}
													>{open ? t('review.note_less') : t('review.note_more')}</button
												>
											{/if}
										{:else}
											<span class="text-lms-warning-text text-xs">{t('review.no_note')}</span>
										{/if}
									</td>
									{#if status === 'locked'}
										<td class="px-4 py-2.5 text-end">
											{#if student.has_pdf}
												<!-- eslint-disable svelte/no-navigation-without-resolve -- path PDF sudah lewat resolve(); hanya query kelas & murid -->
												<a
													href={pdfHref(report.class_id, student.student_id)}
													data-sveltekit-reload
													aria-label={t('review.pdf_student_label', { name: student.name })}
													class="lms-action-secondary lms-focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
													><Icon icon={Download} size="sm" />{t('review.pdf_student')}</a
												>
												<!-- eslint-enable svelte/no-navigation-without-resolve -->
											{/if}
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="text-lms-muted px-4 py-9 text-center text-sm">{t('review.no_students')}</p>
			{/if}
		</section>

		{#if can.has('approve') || can.has('return') || can.has('lock') || can.has('unlock')}
			<div
				class="lms-card sticky bottom-19 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[14px]! py-3 ps-4 pe-3 shadow-[0_18px_40px_-24px_color-mix(in_oklab,var(--color-lms-brand-deep-neutral)_40%,transparent)]!"
			>
				<span class="text-lms-muted flex items-center gap-2 text-[0.8125rem]" aria-live="polite">
					<StatusPill tone={TONE[status]} label={t(`status_${status}`)} />
					{t(`review.status_hint_${status}`)}
				</span>
				<span class="flex flex-wrap items-center gap-2">
					{#if can.has('return')}
						{@render actionButton(Undo2, t('review.return'), 'secondary', () =>
							openReason('return')
						)}
					{/if}
					{#if can.has('unlock')}
						{@render actionButton(LockOpen, t('review.unlock'), 'secondary', () =>
							openReason('unlock')
						)}
					{/if}
					{#if can.has('approve')}
						{@render actionButton(
							Check,
							t('review.approve'),
							'primary',
							() => (approveOpen = true)
						)}
					{/if}
					{#if can.has('lock')}
						{@render actionButton(Lock, t('review.lock'), 'primary', () => (lockOpen = true))}
					{/if}
				</span>
			</div>
		{/if}
	</ModuleShell>

	<ConfirmDialog
		bind:open={approveOpen}
		tone="primary"
		icon={CircleCheck}
		title={t('review.approve_title', { class: report.class })}
		message={t('review.approve_message')}
		confirmLabel={t('review.approve')}
		confirmIcon={Check}
		busyLabel={t('review.approving')}
		cancelLabel={tc('common.cancel')}
		onconfirm={approve}
	/>

	<ConfirmDialog
		bind:open={lockOpen}
		tone="primary"
		icon={Lock}
		title={t('review.lock_title', { class: report.class })}
		message={t('review.lock_message', { count: report.students.length })}
		confirmLabel={t('review.lock_confirm')}
		confirmIcon={Lock}
		busyLabel={t('review.locking')}
		cancelLabel={tc('common.cancel')}
		onconfirm={lock}
	/>

	<ConfirmDialog
		bind:open={reasonOpen}
		tone={reasonAction === 'unlock' ? 'danger' : 'primary'}
		icon={reasonAction === 'unlock' ? LockOpen : Undo2}
		title={t(`review.${reasonAction}_title`, { class: report.class })}
		message={t(`review.${reasonAction}_message`)}
		confirmLabel={t(`review.${reasonAction}`)}
		confirmIcon={reasonAction === 'unlock' ? LockOpen : Undo2}
		busyLabel={t(reasonAction === 'unlock' ? 'review.unlocking' : 'review.returning')}
		cancelLabel={tc('common.cancel')}
		onconfirm={submitReason}
	>
		{#snippet options()}
			<label class="flex flex-col gap-1.5">
				<span class="text-[13px] font-semibold">{t('review.reason_label')}</span>
				<textarea
					bind:value={reason}
					required
					maxlength={REASON_MAX}
					rows="4"
					placeholder={t('review.reason_placeholder')}
					class="bg-lms-surface lms-focus-ring w-full resize-y rounded-[10px] border-[1.5px] px-3 py-2 text-sm transition-colors {reasonInvalid
						? 'border-lms-danger-text'
						: 'border-lms-input-border'}"
					aria-invalid={reasonInvalid}
					oninput={onReasonInput}
					oninvalid={onReasonInvalid}></textarea>
				<span class="text-xs {reasonInvalid ? 'text-lms-danger-text' : 'text-lms-muted'}">
					{reasonInvalid
						? t('review.reason_error', { min: REASON_MIN, max: REASON_MAX })
						: t('review.reason_hint', { count: reasonLength, min: REASON_MIN, max: REASON_MAX })}
				</span>
			</label>
		{/snippet}
	</ConfirmDialog>

	<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
{/if}
