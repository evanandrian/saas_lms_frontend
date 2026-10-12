<script lang="ts">
	import { resolve } from '$app/paths';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import StatusPill from '$lib/features/school-admin/components/StatusPill.svelte';
	import TabBar from '$lib/features/school-admin/components/TabBar.svelte';
	import type { LearnerReportsView } from '$lib/features/school-admin/school-admin.types';
	import { useI18n } from '$lib/i18n';
	import Award from '@lucide/svelte/icons/award';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import Check from '@lucide/svelte/icons/check';
	import Download from '@lucide/svelte/icons/download';
	import FileText from '@lucide/svelte/icons/file-text';
	import MessageSquareQuote from '@lucide/svelte/icons/message-square-quote';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { LEARNER_STEPS, LearnerReportsState } from '../learner-reports.state.svelte';

	interface Props {
		view: LearnerReportsView;
		/** Route proxy unduh PDF (`?id=<reportId>`) sesuai area murid / orang tua. */
		pdfPath: '/app/student/grades/pdf' | '/app/guardian/report/pdf';
	}

	let { view, pdfPath }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`learner_reports.${key}`, params);

	// svelte-ignore state_referenced_locally
	const ui = new LearnerReportsState(view);

	const child = $derived(ui.child);
	const report = $derived(ui.report);
	const dateLocale = $derived(i18n.locale === 'en' ? 'en-GB' : 'id-ID');
	const fmtScore = (v: number) => v.toLocaleString(dateLocale, { maximumFractionDigits: 2 });
	const fmtDate = (iso: string | null) =>
		iso
			? new Date(iso).toLocaleDateString(dateLocale, {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})
			: '—';
	const pdfHref = (id: string) => `${resolve(pdfPath)}?id=${encodeURIComponent(id)}`;

	const childTabs = $derived(view.children.map((c) => ({ key: c.student_id, label: c.name })));
	const reportTabs = $derived(
		(child?.reports ?? []).map((r) => ({
			key: r.id,
			label: t('semester_tab', { term: r.term, year: r.year })
		}))
	);
	const stats = $derived(
		report
			? [
					{
						label: t('stat.average'),
						value: report.average === null ? '—' : fmtScore(report.average)
					},
					{ label: t('stat.subjects'), value: String(report.subjects.length) },
					{
						label: t('stat.below_kkm'),
						value: String(ui.belowKkm),
						warn: ui.belowKkm > 0
					},
					{ label: t('stat.absent'), value: t('days', { count: ui.absentTotal }) }
				]
			: []
	);
</script>

{#snippet stepper()}
	{#if child?.current}
		<section class="lms-card flex flex-col gap-4 rounded-xl p-5" aria-labelledby="learner-current">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div class="flex flex-col gap-0.5">
					<h2 id="learner-current" class="text-[0.9375rem] font-bold">
						{t('current.title', { term: child.current.term, year: child.current.year })}
					</h2>
					<p class="text-lms-muted text-xs">{t(`current.desc_${child.current.status}`)}</p>
				</div>
				<StatusPill
					tone={child.current.status === 'locked' ? 'success' : 'info'}
					label={t(`status.${child.current.status}`)}
				/>
			</div>
			<ol class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-2">
				{#each LEARNER_STEPS as step, i (step)}
					{@const done = i <= ui.currentStep}
					<li
						class="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[0.8125rem] {done
							? 'border-lms-progress/40 bg-lms-progress/10'
							: 'border-lms-border bg-lms-surface-muted text-lms-muted'}"
						aria-current={i === ui.currentStep ? 'step' : undefined}
					>
						<span
							class="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold {done
								? 'bg-lms-progress text-lms-on-interactive'
								: 'bg-lms-surface text-lms-muted'}"
						>
							{#if done}<Icon icon={Check} size="sm" />{:else}{i + 1}{/if}
						</span>
						<span class={done ? 'font-semibold' : ''}>{t(`step.${step}`)}</span>
					</li>
				{/each}
			</ol>
		</section>
	{/if}
{/snippet}

<div class="text-lms-foreground flex min-w-0 flex-col gap-4 pb-24" data-screen-label="Rapor">
	<HeroBanner
		eyebrow={t('eyebrow', { school: view.school })}
		title={ui.isParent ? t('title_parent') : t('title_student')}
		description={ui.isParent ? t('desc_parent') : t('desc_student')}
		actionsPlacement="end"
		help={ui.isParent ? 'help.learner_reports_guardian' : 'help.learner_reports_student'}
	>
		{#snippet actions()}
			{#if report?.has_pdf}
				<!-- eslint-disable svelte/no-navigation-without-resolve -- path PDF sudah lewat resolve(); hanya query id -->
				<a
					href={pdfHref(report.id)}
					class="bg-lms-on-hero/8 border-lms-on-hero/14 text-lms-on-hero lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] border px-4 text-sm font-bold"
					download
				>
					<Icon icon={Download} size="sm" />{t('download')}
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{/if}
		{/snippet}
	</HeroBanner>

	{#if view.children.length === 0}
		<StatePanel
			headingLevel={2}
			title={ui.isParent ? t('empty_children_title') : t('empty_student_title')}
			description={ui.isParent ? t('empty_children_desc') : t('empty_student_desc')}
		/>
	{:else}
		{#if ui.isParent && view.children.length > 1}
			<TabBar
				label={t('child_picker')}
				value={ui.childId}
				items={childTabs}
				onchange={(id) => ui.selectChild(id)}
			/>
		{/if}

		{#if child}
			<section class="lms-card flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl px-5 py-4">
				<span class="flex flex-col">
					<span class="text-base font-bold">{child.name}</span>
					<span class="text-lms-muted font-mono text-xs"
						>{child.nisn
							? t('identity_nisn', { nis: child.nis, nisn: child.nisn })
							: t('identity', { nis: child.nis })}</span
					>
				</span>
				{#if child.class}
					<span class="text-lms-muted text-sm">{t('class_of', { class: child.class })}</span>
				{/if}
			</section>
		{/if}

		{@render stepper()}

		{#if !report}
			<StatePanel headingLevel={2} title={t('no_report_title')} description={t('no_report_desc')} />
		{:else}
			{#if reportTabs.length > 1}
				<TabBar
					label={t('semester_picker')}
					value={report.id}
					items={reportTabs}
					onchange={(id) => ui.selectReport(id)}
				/>
			{/if}

			<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-3">
				{#each stats as s (s.label)}
					<div class="lms-card flex flex-col gap-1 rounded-xl px-4 py-3.5">
						<span class="text-lms-muted text-xs">{s.label}</span>
						<span class="text-2xl font-bold tabular-nums {s.warn ? 'text-lms-warning-text' : ''}"
							>{s.value}</span
						>
					</div>
				{/each}
			</div>

			<div class="flex flex-col gap-4 min-[1000px]:flex-row min-[1000px]:items-start">
				<section
					class="lms-card flex min-w-0 flex-[1_1_auto] flex-col rounded-xl"
					aria-labelledby="learner-subjects"
				>
					<div
						class="border-lms-border flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4"
					>
						<h2 id="learner-subjects" class="flex items-center gap-2 text-[0.9375rem] font-bold">
							<Icon icon={Award} size="sm" />{t('subjects_title')}
						</h2>
						<span class="text-lms-muted text-xs"
							>{t('semester_tab', { term: report.term, year: report.year })}</span
						>
					</div>
					{#each report.subjects as s (s.subject_id)}
						{@const below = s.kkm > 0 && s.score < s.kkm}
						<div
							class="border-lms-border grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 border-b px-5 py-3.5 last:border-b-0"
						>
							<span class="text-sm font-semibold">{s.subject}</span>
							<span
								class="row-span-2 flex flex-col items-end gap-1 text-right"
								aria-label={t('score_aria', { score: fmtScore(s.score) })}
							>
								<span class="text-xl font-bold tabular-nums {below ? 'text-lms-warning-text' : ''}"
									>{fmtScore(s.score)}</span
								>
								{#if s.kkm > 0}
									<span
										class="text-[11px] font-semibold {below
											? 'text-lms-warning-text'
											: 'text-lms-muted'}"
										>{below
											? t('below_kkm', { kkm: fmtScore(s.kkm) })
											: t('kkm', { kkm: fmtScore(s.kkm) })}</span
									>
								{/if}
							</span>
							<p class="text-lms-muted text-[0.8125rem] leading-relaxed">
								{s.description || t('no_description')}
							</p>
						</div>
					{:else}
						<p class="text-lms-muted px-5 py-8 text-center text-sm">{t('no_subjects')}</p>
					{/each}
				</section>

				<aside class="flex min-w-0 flex-col gap-4 min-[1000px]:w-[340px] min-[1000px]:shrink-0">
					<section
						class="lms-card flex flex-col gap-3 rounded-xl p-5"
						aria-labelledby="learner-att"
					>
						<h2 id="learner-att" class="flex items-center gap-2 text-[0.9375rem] font-bold">
							<Icon icon={CalendarCheck} size="sm" />{t('attendance_title')}
						</h2>
						<div class="grid grid-cols-3 gap-2">
							{#each [['sick', report.sick], ['permit', report.permit], ['absent', report.absent]] as const as [key, value] (key)}
								<div
									class="bg-lms-surface-muted flex flex-col items-center gap-0.5 rounded-lg py-2.5"
								>
									<span
										class="text-lg font-bold tabular-nums {key === 'absent' && value > 0
											? 'text-lms-danger-text'
											: ''}">{value}</span
									>
									<span class="text-lms-muted px-1 text-center text-[11px] leading-tight"
										>{t(`attendance.${key}`)}</span
									>
								</div>
							{/each}
						</div>
					</section>

					<section
						class="lms-card flex flex-col gap-2.5 rounded-xl p-5"
						aria-labelledby="learner-note"
					>
						<h2 id="learner-note" class="flex items-center gap-2 text-[0.9375rem] font-bold">
							<Icon icon={MessageSquareQuote} size="sm" />{t('note_title')}
						</h2>
						<p class="text-[0.8125rem] leading-relaxed whitespace-pre-line">
							{report.note || t('no_note')}
						</p>
						{#if report.homeroom}
							<span class="text-lms-muted text-xs">{t('note_by', { name: report.homeroom })}</span>
						{/if}
					</section>

					<section
						class="lms-card flex flex-col gap-3 rounded-xl p-5"
						aria-labelledby="learner-doc"
					>
						<h2 id="learner-doc" class="flex items-center gap-2 text-[0.9375rem] font-bold">
							<Icon icon={FileText} size="sm" />{t('document_title')}
						</h2>
						<dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[0.8125rem]">
							<dt class="text-lms-muted">{t('doc.class')}</dt>
							<dd class="text-right font-semibold">{report.class}</dd>
							<dt class="text-lms-muted">{t('doc.issued')}</dt>
							<dd class="text-right font-semibold">{fmtDate(report.issued_at)}</dd>
							<dt class="text-lms-muted">{t('doc.version')}</dt>
							<dd class="text-right font-semibold">{t('version', { version: report.version })}</dd>
						</dl>
						{#if report.has_pdf}
							<!-- eslint-disable svelte/no-navigation-without-resolve -- path PDF sudah lewat resolve(); hanya query id -->
							<a
								href={pdfHref(report.id)}
								class="lms-action-primary lms-focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-bold"
								download
							>
								<Icon icon={Download} size="sm" />{t('download')}
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{:else}
							<p class="text-lms-warning-text flex items-start gap-2 text-xs">
								<Icon icon={TriangleAlert} size="sm" />{t('pdf_missing')}
							</p>
						{/if}
					</section>
				</aside>
			</div>
		{/if}
	{/if}
</div>
