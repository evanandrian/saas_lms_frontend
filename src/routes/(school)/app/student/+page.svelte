<script lang="ts">
	import logogramColor from '$lib/assets/brand/flixare-logogram-color.png';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { greetingParts } from '$lib/features/dashboards/dashboards.model';
	import { useI18n } from '$lib/i18n';
	import {
		formatHourMinute,
		formatLongDate,
		formatMinuteSecond,
		formatWeekdayLong,
		formatWeekdayShort
	} from '$lib/utils/clock';
	import { createDashboardClock } from '$lib/utils/dashboard-clock.svelte';
	import type { LucideIcon } from '@lucide/svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Atom from '@lucide/svelte/icons/atom';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import Flame from '@lucide/svelte/icons/flame';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Languages from '@lucide/svelte/icons/languages';
	import Leaf from '@lucide/svelte/icons/leaf';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import Moon from '@lucide/svelte/icons/moon';
	import Rocket from '@lucide/svelte/icons/rocket';
	import Sigma from '@lucide/svelte/icons/sigma';
	import Zap from '@lucide/svelte/icons/zap';
	import {
		attendanceCalendar,
		dayPartOf,
		dueLabel,
		isUrgent,
		scoreBandOf,
		secondsUntilStart,
		tierOf,
		type CalendarStatus,
		type ScoreBand,
		type StreakStatus,
		type SubjectIconKey,
		type Tier
	} from './student-dashboard';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	// Nama panggilan murid dari profil (backend), bukan data contoh.
	const firstName = $derived(data.workspace ? greetingParts(data.workspace.user).name : '');
	const reasonId = $props.id();
	const LOCALE = 'id-ID';
	const TOAST_SECONDS = 6;
	/** Senin–Jumat minggu acuan (5–9 Okt 2026) untuk label kolom kalender. */
	const WEEKDAY_REFERENCE_DATES = [
		'2026-10-05',
		'2026-10-06',
		'2026-10-07',
		'2026-10-08',
		'2026-10-09'
	];
	const STICKER_ROTATIONS = ['-rotate-3', 'rotate-2', 'rotate-[2.5deg]', '-rotate-2'];

	const SUBJECT_ICONS: Record<SubjectIconKey, LucideIcon> = {
		math: Sigma,
		biology: Leaf,
		indonesian: BookOpenText,
		english: Languages,
		history: Landmark,
		physics: Atom
	};
	const TIER_COLORS: Record<Tier, { ring: string; text: string }> = {
		gold: { ring: 'var(--color-warning-500)', text: 'text-lms-warning-text' },
		silver: { ring: 'var(--color-lms-interactive)', text: 'text-lms-link' },
		bronze: { ring: 'var(--color-error-600)', text: 'text-lms-danger-text' }
	};
	const STICKER_CLASSES: Record<ScoreBand, string> = {
		high: 'bg-warning-400 text-lms-brand-deep-neutral shadow-[0_3px_0_var(--color-warning-600)]',
		mid: 'lms-scale-high shadow-[0_3px_0_var(--color-lms-progress)]',
		low: 'bg-error-100 text-lms-brand-deep-neutral shadow-[0_3px_0_var(--color-error-300)]'
	};
	const STREAK_CLASSES: Record<StreakStatus, string> = {
		done: 'bg-lms-interactive text-lms-on-interactive',
		today: 'bg-warning-500 text-lms-brand-deep-neutral',
		rest: 'border-[1.5px] border-dashed border-lms-input-border text-lms-muted'
	};
	const STREAK_ICONS: Record<StreakStatus, LucideIcon> = { done: Check, today: Flame, rest: Moon };
	const CALENDAR_CLASSES: Record<CalendarStatus, string> = {
		present: 'lms-scale-high',
		late: 'bg-warning-400 text-lms-brand-deep-neutral',
		permit: 'lms-scale-low',
		sick: 'bg-lms-interactive-muted text-lms-foreground',
		holiday: 'bg-lms-surface-muted text-lms-muted',
		upcoming: 'border border-dashed border-lms-input-border text-lms-muted'
	};
	const LEGEND_STATUSES = ['present', 'late', 'permit', 'sick'] as const;

	const clock = createDashboardClock(() => data.dashboard?.clockStartSeconds ?? null);
	// svelte-ignore state_referenced_locally
	let questDone = $state<string[]>(
		(data.dashboard?.quests ?? []).filter((quest) => quest.done).map((quest) => quest.id)
	);
	let remedialStarted = $state<string[]>([]);
	// svelte-ignore state_referenced_locally
	let openImprovement = $state<string | null>(data.dashboard?.improvements[0]?.id ?? null);
	// svelte-ignore state_referenced_locally
	let attendanceIndex = $state(data.dashboard?.defaultAttendanceMonth ?? 0);
	let toast = $state<{ message: string; icon: LucideIcon; until: number } | null>(null);

	const dashboard = $derived(data.dashboard);
	const exam = $derived(dashboard?.todayAssessments[0] ?? null);
	const toExam = $derived(exam ? secondsUntilStart(exam.startMinutes, clock.nowSeconds) : 0);
	/** XP berubah oleh simulasi: tugas yang statusnya berbeda dari data, dan remedial yang dimulai. */
	const xp = $derived.by(() => {
		if (!dashboard) return 0;
		const questDelta = dashboard.quests.reduce((sum, quest) => {
			const nowDone = questDone.includes(quest.id);
			return sum + (nowDone === quest.done ? 0 : nowDone ? quest.xp : -quest.xp);
		}, 0);
		return dashboard.level.xp + questDelta + remedialStarted.length * dashboard.remedialXp;
	});
	const calendar = $derived.by(() => {
		const month = dashboard?.attendanceMonths[attendanceIndex];
		return month && dashboard ? attendanceCalendar(month, dashboard.date) : null;
	});
	const headline = $derived(
		!dashboard
			? ''
			: exam
				? i18n.t('dashboard.student.headline', {
						name: firstName,
						count: dashboard.todayAssessments.length,
						part: i18n.t(`dashboard.student.day_part.${dayPartOf(exam.startMinutes)}`)
					})
				: i18n.t('dashboard.student.headline_none', { name: firstName })
	);
	const visibleToast = $derived(toast && clock.elapsed < toast.until ? toast : null);
	const simulationNote = $derived(i18n.t('dashboard.teacher.simulation_note'));

	const formatShortDayMonth = (isoDate: string) =>
		new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
			Date.parse(`${isoDate}T00:00:00Z`)
		);
	const formatWeekdayDate = (isoDate: string) =>
		`${formatWeekdayLong(isoDate, LOCALE)}, ${formatShortDayMonth(isoDate)}`;

	function dueText(dueDate: string, today: string) {
		const due = dueLabel(dueDate, today);
		if (due.kind === 'this_week') return formatWeekdayDate(dueDate);
		if (due.kind === 'date') return formatShortDayMonth(dueDate);
		if (due.kind === 'in_days') return i18n.t('dashboard.student.due.in_days', { days: due.days });
		return i18n.t(`dashboard.student.due.${due.kind}`);
	}

	function showToast(message: string, icon: LucideIcon) {
		toast = { message: `${message} ${simulationNote}`, icon, until: clock.elapsed + TOAST_SECONDS };
	}

	function toggleQuest(quest: { id: string; title: string; xp: number }) {
		const wasDone = questDone.includes(quest.id);
		questDone = wasDone ? questDone.filter((id) => id !== quest.id) : [...questDone, quest.id];
		if (!wasDone) {
			showToast(i18n.t('dashboard.student.toast_quest', { xp: quest.xp, title: quest.title }), Zap);
		}
	}

	function startRemedial(remedial: { id: string; title: string }) {
		if (remedialStarted.includes(remedial.id) || !dashboard) return;
		remedialStarted = [...remedialStarted, remedial.id];
		showToast(
			i18n.t('dashboard.student.toast_remedial', {
				title: remedial.title,
				name: firstName
			}),
			Rocket
		);
	}
</script>

<svelte:head>
	<title>{headline}</title>
</svelte:head>

<!-- Struktur & data contoh mengikuti FLIXARE App v3.html layar 07 (FE-07). -->
<!-- Referensi memakai line-height normal (≈1.25) di seluruh layar murid. -->
<div class="flex min-w-0 flex-col gap-5 leading-tight">
	{#if dashboard}
		{@const actionsDisabled = !data.canSimulate}
		{@const target = dashboard.masteryTarget}
		<p id={reasonId} class="sr-only">{i18n.t('common.state.action_unavailable')}</p>

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			<section
				class="bg-lms-hero text-lms-on-hero relative isolate flex min-w-0 flex-col gap-5 overflow-hidden rounded-[14px] p-7 md:col-span-2"
				aria-labelledby="{reasonId}-mission"
			>
				<img
					src={logogramColor}
					alt=""
					aria-hidden="true"
					draggable="false"
					class="pointer-events-none absolute -top-7.5 -right-10 -z-10 w-60 max-w-none opacity-10 select-none"
				/>
				<div class="flex flex-col items-start gap-2">
					<span
						class="bg-warning-400 text-lms-brand-deep-neutral rounded-full px-2.75 py-1.25 text-[11px] font-bold tracking-[0.14em]"
					>
						{i18n.t('dashboard.student.mission')}
					</span>
					<p class="text-lms-on-hero-muted mt-1 text-sm">
						{i18n.t('dashboard.student.context', {
							date: formatLongDate(dashboard.date, LOCALE),
							class: dashboard.className
						})}
					</p>
					<h1 id="{reasonId}-mission" class="text-[1.75rem] leading-9 font-bold">{headline}</h1>
				</div>
				{#if exam}
					<div class="bg-lms-hero-raised flex flex-wrap items-center gap-4.5 rounded-xl p-4.5">
						<span
							class="bg-lms-interactive flex size-13 flex-none items-center justify-center rounded-xl"
							aria-hidden="true"
						>
							<Icon icon={ClipboardCheck} size="lg" />
						</span>
						<span class="flex min-w-50 flex-1 flex-col gap-1.5">
							<span class="text-lg font-semibold">{exam.title}</span>
							<span class="text-lms-on-hero-muted text-[0.8125rem]">
								{i18n.t('dashboard.student.assessment_meta', {
									subject: exam.subject,
									time: `${formatHourMinute(exam.startMinutes * 60)}–${formatHourMinute(exam.endMinutes * 60)}`,
									count: exam.questionCount
								})}
							</span>
							<span class="mt-0.5 flex flex-wrap gap-2">
								<span
									class="bg-warning-400 text-lms-brand-deep-neutral flex items-center gap-1 rounded-full px-2.25 py-0.75 text-xs font-bold"
								>
									<Icon icon={Zap} size="sm" />{i18n.t('dashboard.student.xp', {
										xp: exam.xpReward
									})}
								</span>
								<span
									class="bg-lms-on-hero/12 rounded-full px-2.25 py-0.75 font-mono text-xs font-semibold"
								>
									{toExam > 0
										? i18n.t('dashboard.student.starts_in', { time: formatMinuteSecond(toExam) })
										: i18n.t('dashboard.student.in_progress')}
								</span>
							</span>
						</span>
						<button
							type="button"
							class="bg-lms-on-hero text-lms-brand-deep-neutral lms-focus-ring flex h-11 items-center gap-2 rounded-lg px-5 text-[0.9375rem] font-bold disabled:cursor-not-allowed disabled:opacity-50"
							disabled
							aria-describedby={reasonId}
						>
							{i18n.t('dashboard.student.start_exam')}<Icon icon={ArrowRight} size="sm" />
						</button>
					</div>
				{/if}
			</section>

			<section
				class="lms-card flex min-w-0 flex-col gap-4.5 rounded-[22px]! p-5.5 shadow-none!"
				aria-label={i18n.t('dashboard.student.level_label', { level: dashboard.level.number })}
			>
				<div class="flex items-center gap-3.5">
					<span
						class="bg-lms-interactive text-lms-on-interactive flex size-14 flex-none -rotate-4 flex-col items-center justify-center rounded-2xl leading-none"
					>
						<span class="text-[10px] font-bold tracking-widest">
							{i18n.t('dashboard.student.level_short')}
						</span>
						<span class="text-2xl font-bold">{dashboard.level.number}</span>
					</span>
					<span class="flex flex-col gap-0.5">
						<span class="text-base font-bold">{dashboard.level.name}</span>
						<span class="text-lms-muted text-[0.8125rem]">
							{i18n.t('dashboard.student.xp_to_next', {
								xp: xp.toLocaleString(LOCALE),
								target: dashboard.level.nextLevelXp.toLocaleString(LOCALE),
								next: dashboard.level.number + 1
							})}
						</span>
					</span>
				</div>
				<div class="bg-lms-surface-muted h-3.5 overflow-hidden rounded-full" aria-hidden="true">
					<div
						class="bg-lms-interactive h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(.2,.9,.3,1.2)] motion-reduce:transition-none"
						style:width="{Math.min(100, (xp / dashboard.level.nextLevelXp) * 100)}%"
					></div>
				</div>
				<div class="border-lms-input-border flex flex-col gap-2.5 border-t border-dashed pt-3.5">
					<p class="flex items-center gap-2 text-[0.9375rem] font-bold">
						<span class="text-warning-500"><Icon icon={Flame} /></span>
						{i18n.t('dashboard.student.streak', { days: dashboard.streak.days })}
					</p>
					<ol class="grid grid-cols-7 gap-1.5">
						{#each dashboard.streak.week as day (day.date)}
							<li class="flex flex-col items-center gap-1">
								<span
									class={[
										'flex size-7.5 items-center justify-center rounded-full',
										STREAK_CLASSES[day.status]
									]}
									aria-hidden="true"
								>
									<Icon icon={STREAK_ICONS[day.status]} size="sm" />
								</span>
								<span class="text-lms-muted text-[10px]">
									{formatWeekdayShort(day.date, LOCALE).charAt(0) +
										formatWeekdayShort(day.date, LOCALE).slice(1).toLowerCase()}
									<span class="sr-only">
										· {i18n.t(`dashboard.student.streak_status.${day.status}`)}</span
									>
								</span>
							</li>
						{/each}
					</ol>
				</div>
			</section>
		</div>

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			<section
				class="lms-card flex min-w-0 flex-col gap-1.5 rounded-[22px]! p-5 shadow-none!"
				aria-labelledby="{reasonId}-quests"
			>
				<div class="mb-1.5 flex items-baseline justify-between">
					<h2 id="{reasonId}-quests" class="text-base font-bold">
						{i18n.t('dashboard.student.quests')}
					</h2>
					<span class="text-lms-muted text-xs">
						{i18n.t('dashboard.student.quests_done', {
							done: questDone.length,
							total: dashboard.quests.length
						})}
					</span>
				</div>
				<ul class="flex flex-col gap-1.5">
					{#each dashboard.quests as quest (quest.id)}
						{@const done = questDone.includes(quest.id)}
						<li
							class={[
								'flex items-center gap-3 rounded-[14px] px-3 py-2.5 transition-colors',
								!done && 'bg-lms-interactive-subtle'
							]}
						>
							<button
								type="button"
								role="checkbox"
								aria-checked={done}
								aria-label={i18n.t('dashboard.student.mark_done', { title: quest.title })}
								class={[
									'border-lms-interactive lms-focus-ring flex size-7 flex-none items-center justify-center rounded-full border-2 transition-[background-color,transform] duration-250 ease-[cubic-bezier(.2,.9,.3,1.6)] disabled:cursor-not-allowed disabled:opacity-50',
									done ? 'bg-lms-interactive text-lms-on-interactive scale-108' : ''
								]}
								disabled={actionsDisabled}
								aria-describedby={actionsDisabled ? reasonId : undefined}
								onclick={() => toggleQuest(quest)}
							>
								<span class={done ? 'opacity-100' : 'opacity-0'}
									><Icon icon={Check} size="sm" /></span
								>
							</button>
							<span class="flex min-w-0 flex-1 flex-col gap-0.5">
								<span class={['text-sm font-semibold', done ? 'text-lms-muted line-through' : '']}>
									{quest.title}
								</span>
								<span class="text-lms-muted text-xs">
									{quest.subject} ·
									<span
										class={[
											'font-semibold',
											done
												? 'text-lms-progress-text'
												: isUrgent(quest.dueDate, dashboard.date)
													? 'text-lms-danger-text'
													: 'text-lms-muted'
										]}
									>
										{done
											? i18n.t('dashboard.student.due.done')
											: dueText(quest.dueDate, dashboard.date)}
									</span>
								</span>
							</span>
							<span class="text-lms-link text-xs font-bold whitespace-nowrap">
								{i18n.t('dashboard.student.xp', { xp: quest.xp })}
							</span>
						</li>
					{/each}
				</ul>
			</section>

			<section
				class="lms-card flex min-w-0 flex-col gap-3.5 rounded-[22px]! p-5 shadow-none!"
				aria-labelledby="{reasonId}-subjects"
			>
				<h2 id="{reasonId}-subjects" class="text-base font-bold">
					{i18n.t('dashboard.student.subjects')}
				</h2>
				<ul class="grid grid-cols-[repeat(auto-fit,minmax(7.375rem,1fr))] gap-2.5">
					{#each dashboard.subjects as subject (subject.id)}
						{@const tier = tierOf(subject.percent, dashboard.tierThresholds)}
						<li
							class="bg-lms-interactive-subtle border-lms-interactive/18 flex flex-col items-center gap-2 rounded-2xl border p-3.5 text-center"
						>
							<span
								class="flex size-14.5 items-center justify-center rounded-full"
								style:background="conic-gradient({TIER_COLORS[tier].ring} 0 {subject.percent}%,
								var(--color-lms-surface-muted) 0)"
								aria-hidden="true"
							>
								<span
									class={[
										'bg-lms-surface flex size-11.5 items-center justify-center rounded-full',
										TIER_COLORS[tier].text
									]}
								>
									<Icon icon={SUBJECT_ICONS[subject.icon]} />
								</span>
							</span>
							<span class="text-[0.8125rem] leading-[1.0625rem] font-bold">{subject.name}</span>
							<span class="text-lms-muted text-[11px]">
								{subject.percent}% · {i18n.t(`dashboard.student.tier.${tier}`)}
							</span>
						</li>
					{/each}
				</ul>
			</section>

			<section
				class="lms-card flex min-w-0 flex-col gap-4 rounded-[22px]! p-5 shadow-none!"
				aria-labelledby="{reasonId}-scores"
			>
				<h2 id="{reasonId}-scores" class="text-base font-bold">
					{i18n.t('dashboard.student.recent_scores')}
				</h2>
				<ul class="grid grid-cols-2 gap-3.5 p-1">
					{#each dashboard.recentScores as score, index (score.id)}
						<li
							class={[
								'flex flex-col gap-1 rounded-2xl p-3.5 transition-transform duration-200 hover:scale-104 hover:rotate-0',
								STICKER_CLASSES[scoreBandOf(score.score, dashboard.scoreBands)],
								STICKER_ROTATIONS[index % STICKER_ROTATIONS.length]
							]}
						>
							<span class="text-3xl leading-none font-bold tabular-nums">{score.score}</span>
							<span class="text-xs leading-4 font-bold">{score.title}</span>
							<span class="text-[11px]">{score.subject} · {formatShortDayMonth(score.date)}</span>
						</li>
					{/each}
				</ul>
			</section>
		</div>

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			<section
				class="lms-card flex min-w-0 flex-col gap-3 rounded-[22px]! p-5 shadow-none!"
				aria-labelledby="{reasonId}-remedial"
			>
				<div class="flex items-center justify-between gap-2">
					<h2 id="{reasonId}-remedial" class="text-base font-bold">
						{i18n.t('dashboard.student.remedial')}
					</h2>
					<span class="lms-tone-danger rounded-full px-2.5 py-1 text-[11px] font-bold">
						{i18n.t('dashboard.student.remedial_count', {
							count: dashboard.remedials.length,
							target
						})}
					</span>
				</div>
				{#each dashboard.remedials as remedial (remedial.id)}
					{@const started = remedialStarted.includes(remedial.id)}
					<div class="border-lms-border flex flex-col gap-3 rounded-2xl border p-3.5">
						<div class="flex items-center gap-3">
							<span
								class="bg-error-100 text-lms-brand-deep-neutral flex size-13 flex-none -rotate-3 flex-col items-center justify-center rounded-[14px] leading-none"
							>
								<span class="text-xl font-bold">{remedial.score}</span>
								<span class="mt-0.5 text-[10px]">
									{i18n.t('dashboard.student.score_of', { target })}
								</span>
							</span>
							<span class="flex min-w-0 flex-1 flex-col gap-0.5">
								<span class="text-sm font-bold">{remedial.title}</span>
								<span class="text-lms-muted text-xs">
									{i18n.t('dashboard.student.remedial_due', {
										subject: remedial.subject,
										date: formatWeekdayDate(remedial.dueDate)
									})}
								</span>
							</span>
						</div>
						<span class="bg-lms-surface-muted relative block h-1.5 rounded-full" aria-hidden="true">
							<span
								class="bg-warning-500 absolute inset-y-0 left-0 rounded-full"
								style:width="{remedial.score}%"
							></span>
							<span class="bg-lms-foreground absolute -inset-y-1 w-0.5" style:left="{target}%"
							></span>
						</span>
						<button
							type="button"
							class={[
								'lms-focus-ring flex h-9.5 items-center justify-center gap-2 rounded-xl text-[0.8125rem] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
								started ? 'bg-lms-progress/12 text-lms-progress-text' : 'lms-action-primary'
							]}
							disabled={actionsDisabled}
							aria-describedby={actionsDisabled ? reasonId : undefined}
							aria-pressed={started}
							onclick={() => startRemedial(remedial)}
						>
							<Icon icon={started ? CircleCheck : Rocket} size="sm" />
							{started
								? i18n.t('dashboard.student.remedial_started')
								: i18n.t('dashboard.student.remedial_start', { xp: dashboard.remedialXp })}
						</button>
					</div>
				{/each}
				{#if dashboard.bonusPractice}
					<div
						class="border-lms-interactive flex items-center gap-3 rounded-[14px] border-2 border-dashed p-3.5"
					>
						<span class="flex flex-1 flex-col gap-0.5">
							<span class="text-[0.8125rem] font-bold">{dashboard.bonusPractice.title}</span>
							<span class="text-lms-muted text-xs leading-[1.0625rem]">
								{dashboard.bonusPractice.description}
							</span>
						</span>
						<button
							type="button"
							class="lms-action-primary lms-focus-ring h-9 rounded-[10px] px-3 text-xs font-bold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
							disabled
							aria-describedby={reasonId}
						>
							{i18n.t('dashboard.student.xp', { xp: dashboard.bonusPractice.xp })}
						</button>
					</div>
				{/if}
			</section>

			<section
				class="lms-card flex min-w-0 flex-col gap-2.5 rounded-[22px]! p-5 shadow-none!"
				aria-labelledby="{reasonId}-improve"
			>
				<div>
					<h2 id="{reasonId}-improve" class="text-base font-bold">
						{i18n.t('dashboard.student.improve')}
					</h2>
					<p class="text-lms-muted mt-0.5 text-xs">
						{i18n.t('dashboard.student.improve_hint', { target })}
					</p>
				</div>
				{#each dashboard.improvements as item (item.id)}
					{@const open = openImprovement === item.id}
					{@const low = item.score < dashboard.lowScoreThreshold}
					<button
						type="button"
						class={[
							'lms-focus-ring text-lms-foreground flex w-full flex-col gap-2 rounded-[14px] border p-3 text-left transition-colors',
							open
								? 'bg-lms-interactive-subtle border-lms-interactive/30'
								: 'border-lms-border bg-transparent'
						]}
						aria-expanded={open}
						onclick={() => (openImprovement = open ? null : item.id)}
					>
						<span class="flex w-full items-center justify-between gap-2">
							<span class="flex min-w-0 flex-col">
								<span class="text-[0.8125rem] font-bold">{item.objective}</span>
								<span class="text-lms-muted text-[11px]">{item.subjectLabel}</span>
							</span>
							<span class="flex items-center gap-2">
								<span
									class={[
										'text-sm font-bold tabular-nums',
										low ? 'text-lms-warning-text' : 'text-lms-link'
									]}
								>
									{item.score}
								</span>
								<span class={['text-lms-muted transition-transform', open && 'rotate-180']}>
									<Icon icon={ChevronDown} size="sm" />
								</span>
							</span>
						</span>
						<span
							class="bg-lms-surface-muted relative block h-2 w-full rounded-full"
							aria-hidden="true"
						>
							<span
								class={[
									'absolute inset-y-0 left-0 rounded-full',
									low ? 'bg-warning-500' : 'bg-lms-interactive'
								]}
								style:width="{item.score}%"
							></span>
							<span class="bg-lms-foreground absolute -inset-y-0.75 w-0.5" style:left="{target}%"
							></span>
						</span>
						{#if open}
							<span class="text-xs leading-[1.125rem] flex gap-2">
								<span class="text-lms-interactive mt-0.5"><Icon icon={Lightbulb} size="sm" /></span>
								{item.tip}
							</span>
						{/if}
					</button>
				{/each}
			</section>

			<section
				class="lms-card flex min-w-0 flex-col gap-3.5 rounded-[22px]! p-5 shadow-none!"
				aria-labelledby="{reasonId}-attendance"
			>
				<div class="flex items-center justify-between gap-2">
					<h2 id="{reasonId}-attendance" class="text-base font-bold">
						{i18n.t('dashboard.student.attendance')}
					</h2>
					<div
						class="bg-lms-surface-muted flex gap-0.5 rounded-full p-0.75"
						role="group"
						aria-label={i18n.t('dashboard.student.attendance_month')}
					>
						{#each dashboard.attendanceMonths as month, index (month.label)}
							<button
								type="button"
								class={[
									'lms-focus-ring h-7 rounded-full px-3 text-xs font-semibold',
									index === attendanceIndex
										? 'bg-lms-surface text-lms-foreground shadow-sm'
										: 'text-lms-muted'
								]}
								aria-pressed={index === attendanceIndex}
								onclick={() => (attendanceIndex = index)}
							>
								{month.label}
							</button>
						{/each}
					</div>
				</div>
				{#if calendar}
					{@const month = dashboard.attendanceMonths[attendanceIndex]}
					<p class="flex items-baseline gap-2" aria-live="polite">
						<span class="text-[2.125rem] leading-none font-bold tabular-nums">
							{calendar.rate === null ? '—' : `${calendar.rate}%`}
						</span>
						<span class="text-lms-muted text-[0.8125rem]">
							{i18n.t('dashboard.student.attendance_days', {
								present: calendar.presentDays,
								total: calendar.schoolDays
							})}
						</span>
					</p>
					<div class="grid grid-cols-5 gap-1.25">
						{#each WEEKDAY_REFERENCE_DATES as weekday (weekday)}
							<span class="text-lms-muted text-center text-[10px] font-bold" aria-hidden="true">
								{formatWeekdayShort(weekday, LOCALE).charAt(0) +
									formatWeekdayShort(weekday, LOCALE).slice(1).toLowerCase()}
							</span>
						{/each}
						{#each Array.from({ length: calendar.leadingBlanks }, (_, index) => index) as blank (blank)}
							<span aria-hidden="true"></span>
						{/each}
						{#each calendar.days as day (day.day)}
							{@const label = `${day.day} ${month?.label ?? ''} · ${i18n.t(`dashboard.student.attendance_status.${day.status}`)}`}
							<span
								class={[
									'flex h-7.5 items-center justify-center rounded-lg text-[11px] font-semibold',
									CALENDAR_CLASSES[day.status]
								]}
								title={label}
							>
								<span aria-hidden="true">{day.day}</span>
								<span class="sr-only">{label}</span>
							</span>
						{/each}
					</div>
					<ul class="text-lms-muted flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11px]">
						{#each LEGEND_STATUSES as status (status)}
							<li class="flex items-center gap-1.5">
								<span
									class={['size-2.5 rounded-[3px]', CALENDAR_CLASSES[status]]}
									aria-hidden="true"
								></span>
								{i18n.t(`dashboard.student.attendance_status.${status}`)}
								<strong class="text-lms-foreground">{calendar.counts[status]}</strong>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>

		<Toast message={visibleToast?.message ?? null} icon={visibleToast?.icon} />
	{:else}
		<StatePanel
			headingLevel={1}
			title={i18n.t('common.state.no_data_title')}
			description={i18n.t('common.state.no_data_description')}
		/>
	{/if}
</div>
