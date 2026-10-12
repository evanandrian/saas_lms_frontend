<script lang="ts">
	import { resolve } from '$app/paths';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import StatusPill from '$lib/features/school-admin/components/StatusPill.svelte';
	import {
		GradeSheetState,
		MAX_DESCRIPTION,
		MAX_SCORE,
		MIN_SCORE,
		REPORT_TONE,
		charCount,
		gradeSheetTranslator,
		parseScore
	} from '$lib/features/school-admin/grade-sheet.state.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import { PREFIX, inputClass, percent } from '$lib/features/school-admin/school-admin.model';
	import type { SchoolGradeSheet } from '$lib/features/school-admin/school-admin.types';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { formatNumber } from '$lib/utils/format';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Lock from '@lucide/svelte/icons/lock';
	import Save from '@lucide/svelte/icons/save';
	import Users from '@lucide/svelte/icons/users';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const uid = $props.id();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`grades.${key}`, params);

	const editorT = gradeSheetTranslator(i18n.t);
	const editor = createRecordEditor<SchoolGradeSheet>(editorT, (v) => grade.hydrate(v));

	// Satu state per lembar yang dimuat: berganti `data.view` (navigasi/invalidate) → isian lokal,
	// tampilan hasil action, dan status validasi kunci mulai dari lembar baru.
	const grade = $derived(
		new GradeSheetState(data.view, { t: i18n.t, editorT, notify: editor.notify })
	);
	let confirmLock = $state(false);

	function requestLock() {
		if (grade.requestLock()) confirmLock = true;
	}
</script>

<svelte:head
	><title
		>{grade.sheet
			? t('sheet.page_title', { subject: grade.sheet.subject, class: grade.sheet.class })
			: t('sheet.title')}
		· FLIXARE</title
	></svelte:head
>

{#snippet back()}
	<a
		href={resolve(APP_PATHS.TEACHER_GRADES)}
		class="bg-lms-on-hero/8 border-lms-on-hero/14 text-lms-on-hero lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] border px-3.5 text-sm font-semibold"
		><Icon icon={ArrowLeft} size="sm" />{t('sheet.back')}</a
	>
{/snippet}

{#if !grade.sheet}
	<div class="text-lms-foreground flex flex-col gap-4 pb-24">
		<HeroBanner
			eyebrow={t('list.eyebrow')}
			title={t('sheet.title')}
			actionsPlacement="end"
			actions={back}
			help="help.teacher_grade_sheet"
		/>
		<StatePanel
			tone={data.failure === 'not_found' ? 'warning' : 'error'}
			title={data.failure === 'not_found'
				? t('sheet.not_found_title')
				: i18n.t(`${PREFIX}.common.load_failed`)}
			description={data.failure === 'not_found'
				? t('sheet.not_found_desc')
				: i18n.t(`${PREFIX}.failure.${data.failure}`)}
		/>
	</div>
{:else}
	<div
		class="text-lms-foreground flex min-w-0 flex-col gap-4 pb-28"
		data-screen-label="Lembar nilai"
	>
		<HeroBanner
			eyebrow={t('sheet.eyebrow', { class: grade.sheet.class })}
			title={grade.sheet.subject}
			description={grade.sheet.locked
				? t('sheet.desc_locked')
				: t('sheet.desc', { max: MAX_DESCRIPTION })}
			actionsPlacement="end"
			actions={back}
			help="help.teacher_grade_sheet"
		/>

		<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-3">
			<div class="lms-card flex flex-col gap-1 rounded-xl px-4 py-3">
				<span class="text-lms-muted text-xs">{t('sheet.stat_kkm')}</span>
				<span class="text-2xl font-bold tabular-nums">{grade.sheet.kkm}</span>
			</div>
			<div class="lms-card flex flex-col gap-1 rounded-xl px-4 py-3">
				<span class="text-lms-muted text-xs">{t('sheet.stat_filled')}</span>
				<span class="text-2xl font-bold tabular-nums"
					>{t('filled_of', { filled: grade.filledCount, total: grade.rows.length })}</span
				>
			</div>
			<div class="lms-card flex flex-col gap-1 rounded-xl px-4 py-3">
				<span class="text-lms-muted text-xs">{t('sheet.stat_below')}</span>
				<span
					class="text-2xl font-bold tabular-nums {grade.belowCount ? 'text-lms-warning-text' : ''}"
					>{grade.belowCount}</span
				>
			</div>
		</div>

		{#if grade.sheet.locked}
			<div
				role="status"
				class="lms-tone-info flex flex-wrap items-center gap-3 rounded-xl px-4 py-3"
			>
				<Icon icon={Lock} />
				<span class="flex-[1_1_260px] text-[13px] leading-[19px]"
					><strong>{t('sheet.locked_title')}</strong> {t('sheet.locked_desc')}</span
				>
				<StatusPill
					tone={REPORT_TONE[grade.sheet.report_status]}
					label={t('sheet.report_status', {
						status: i18n.t(`${PREFIX}.reports.status_${grade.sheet.report_status}`)
					})}
				/>
			</div>
		{/if}

		<section class="lms-card flex flex-col rounded-xl!" aria-labelledby="{uid}-students">
			<div
				class="border-lms-border flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
			>
				<h2 id="{uid}-students" class="text-[0.9375rem] font-bold">
					{t('sheet.students_title', { count: grade.rows.length })}
				</h2>
				{#if !grade.sheet.locked}
					<span class="text-lms-muted text-xs">{t('sheet.hint')}</span>
				{/if}
			</div>
			{#if !grade.rows.length}
				<p class="text-lms-muted px-4 py-9 text-center text-sm">{t('sheet.no_students')}</p>
			{:else}
				<div
					class="border-lms-border text-lms-muted hidden grid-cols-[28px_minmax(0,1.2fr)_128px_minmax(0,2fr)] gap-3 border-b px-4 py-2 text-[11px] font-bold tracking-[0.06em] uppercase md:grid"
					aria-hidden="true"
				>
					<span>#</span><span>{t('sheet.col_student')}</span><span>{t('sheet.col_score')}</span
					><span>{t('sheet.col_description')}</span>
				</div>
				<ol>
					{#each grade.rows as row, index (row.student_id)}
						{@const d = grade.draftOf(row.student_id)}
						{@const err = grade.errors[row.student_id] ?? {}}
						{@const score = grade.sheet.locked ? row.score : parseScore(d.score)}
						{@const below = typeof score === 'number' && score < grade.sheet.kkm}
						{@const count = charCount(d.description)}
						<li
							class={[
								'border-lms-border grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 gap-y-2 border-b px-4 py-3 last:border-b-0 md:grid-cols-[28px_minmax(0,1.2fr)_128px_minmax(0,2fr)] md:items-start',
								below && 'bg-lms-warning-subtle'
							]}
						>
							<span class="text-lms-muted pt-1 font-mono text-xs">{index + 1}</span>
							<span class="flex min-w-0 flex-col pt-0.5">
								<span class="truncate text-[13px] font-semibold">{row.name}</span>
								<span class="text-lms-muted font-mono text-[11px]"
									>{t('sheet.nis', { nis: row.nis })}</span
								>
							</span>
							<div class="col-start-2 flex flex-col gap-1 md:col-start-auto">
								{#if grade.sheet.locked}
									<span
										class="text-lg font-bold tabular-nums {below ? 'text-lms-warning-text' : ''}"
										>{row.score === null ? '—' : formatNumber(row.score, i18n.locale)}</span
									>
								{:else}
									<input
										type="number"
										inputmode="decimal"
										min={MIN_SCORE}
										max={MAX_SCORE}
										step="0.01"
										placeholder={t('sheet.score_ph')}
										aria-label={t('sheet.score_of', { name: row.name })}
										aria-invalid={Boolean(err.score)}
										aria-describedby="{uid}-score-{row.student_id}"
										class="{inputClass(err.score, true)} tabular-nums {below && !err.score
											? 'border-lms-warning-text!'
											: ''}"
										value={d.score}
										disabled={grade.busy}
										oninput={(e) => grade.edit(row.student_id, 'score', e.currentTarget.value)}
									/>
								{/if}
								<span id="{uid}-score-{row.student_id}" class="text-[11px]">
									{#if err.score}
										<span class="text-lms-danger-text">{err.score}</span>
									{:else if below}
										<span class="text-lms-warning-text font-semibold"
											>{t('sheet.below_kkm', { kkm: grade.sheet.kkm })}</span
										>
									{/if}
								</span>
							</div>
							<div class="col-start-2 flex flex-col gap-1 md:col-start-auto">
								{#if grade.sheet.locked}
									<p class="text-[13px] leading-5 whitespace-pre-line">{row.description || '—'}</p>
								{:else}
									<textarea
										rows="2"
										maxlength={MAX_DESCRIPTION}
										placeholder={t('sheet.description_ph')}
										aria-label={t('sheet.description_of', { name: row.name })}
										aria-invalid={Boolean(err.description)}
										aria-describedby="{uid}-desc-{row.student_id}"
										class={[
											'lms-input lms-focus-ring min-h-16 w-full rounded-[10px] border-[1.5px] px-3 py-2 text-[13px] leading-5',
											err.description ? 'border-lms-danger-text' : 'border-lms-input-border'
										]}
										value={d.description}
										disabled={grade.busy}
										oninput={(e) =>
											grade.edit(row.student_id, 'description', e.currentTarget.value)}></textarea>
									<span
										id="{uid}-desc-{row.student_id}"
										class="flex justify-between gap-2 text-[11px]"
									>
										<span class={err.description ? 'text-lms-danger-text' : 'text-lms-muted'}
											>{err.description ??
												(score === null && d.description.trim()
													? t('sheet.description_needs_score')
													: '')}</span
										>
										<span
											class="tabular-nums {count > MAX_DESCRIPTION
												? 'text-lms-danger-text'
												: 'text-lms-muted'}"
											>{t('sheet.char_count', { count, max: MAX_DESCRIPTION })}</span
										>
									</span>
								{/if}
							</div>
						</li>
					{/each}
				</ol>
			{/if}
		</section>

		{#if !grade.sheet.locked && grade.rows.length}
			<div
				class="lms-card sticky bottom-19 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[14px]! py-3 ps-4 pe-3 shadow-[0_18px_40px_-24px_color-mix(in_oklab,var(--color-lms-brand-deep-neutral)_40%,transparent)]!"
			>
				<div class="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5" aria-live="polite">
					<span class="text-[0.8125rem] font-semibold tabular-nums">
						{t('sheet.progress', { filled: grade.filledCount, total: grade.rows.length })}
						{#if grade.belowCount}<span class="text-lms-warning-text">
								· {t('sheet.below_count', { count: grade.belowCount })}</span
							>{/if}
					</span>
					<div class="bg-lms-surface-muted h-1.5 overflow-hidden rounded-full">
						<div
							class="bg-lms-interactive h-full rounded-full transition-[width]"
							style:width="{percent(grade.filledCount, grade.rows.length)}%"
						></div>
					</div>
					<span class="text-lms-muted text-xs"
						>{grade.dirty ? t('sheet.unsaved') : t('sheet.all_saved')}</span
					>
				</div>
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="lms-action-secondary lms-focus-ring inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-sm font-bold disabled:opacity-50"
						disabled={grade.busy || !grade.dirty}
						onclick={() => grade.save()}><Icon icon={Save} size="sm" />{t('sheet.save')}</button
					>
					<button
						type="button"
						class="lms-action-primary lms-focus-ring inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-bold disabled:opacity-50"
						disabled={grade.busy}
						onclick={requestLock}><Icon icon={Lock} size="sm" />{t('sheet.lock')}</button
					>
				</div>
			</div>
		{/if}
	</div>

	<ConfirmDialog
		bind:open={confirmLock}
		tone="primary"
		icon={Lock}
		title={t('sheet.lock_title')}
		message={t('sheet.lock_message', { subject: grade.sheet.subject, class: grade.sheet.class })}
		details={[
			{
				icon: Users,
				label: t('sheet.lock_detail_students'),
				value: t('filled_of', { filled: grade.completeCount, total: grade.rows.length })
			}
		]}
		confirmLabel={t('sheet.lock')}
		confirmIcon={Lock}
		busyLabel={t('sheet.locking')}
		cancelLabel={i18n.t(`${PREFIX}.common.cancel`)}
		onconfirm={() => grade.lock()}
	/>
{/if}

<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
