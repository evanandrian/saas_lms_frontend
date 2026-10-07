<script lang="ts">
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import UnavailableLink from '$lib/components/ui/UnavailableLink.svelte';
	import { workspaceGreeting } from '$lib/features/workspace/workspace.model';
	import { useI18n } from '$lib/i18n';
	import { formatLongDate, greetingPeriod } from '$lib/utils/clock';
	import { createDashboardClock } from '$lib/utils/dashboard-clock.svelte';
	import { initialsOf } from '$lib/utils/initials';
	import type { LucideIcon } from '@lucide/svelte';
	import BellRing from '@lucide/svelte/icons/bell-ring';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import Send from '@lucide/svelte/icons/send';
	import {
		agendaDateLabel,
		attendanceSummary,
		formatDayMonthYear,
		formatMonthName,
		formatWeekdayDayMonth,
		scoreWord,
		type ScoreWord,
		type TimelineIcon,
		type TimelineTone
	} from './guardian-dashboard';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	// Sapaan dari profil user yang masuk (backend), bukan data contoh.
	const greeting = $derived(workspaceGreeting(data.workspace, i18n.t));
	const reasonId = $props.id();
	const LOCALE = 'id-ID';
	const TOAST_SECONDS = 6;

	const TIMELINE_ICONS: Record<TimelineIcon, LucideIcon> = {
		check: CircleCheck,
		alert: CircleAlert,
		book: BookOpen
	};
	const TIMELINE_TONES: Record<TimelineTone, string> = {
		ok: 'bg-lms-progress/28',
		warning: 'bg-warning-500/32',
		muted: 'bg-lms-on-hero/12'
	};
	const WORD_CLASSES: Record<ScoreWord, string> = {
		excellent: 'text-lms-progress-text',
		good: 'text-lms-muted',
		practice: 'text-lms-warning-text'
	};

	const clock = createDashboardClock(() => data.dashboard?.clockStartSeconds ?? null);
	let childIndex = $state(0);
	let remindedChildren = $state<string[]>([]);
	let replies = $state<Record<string, string[]>>({});
	let replyText = $state('');
	let toast = $state<{ message: string; icon: LucideIcon; until: number } | null>(null);

	const dashboard = $derived(data.dashboard);
	const child = $derived(dashboard?.children[childIndex] ?? null);
	const reminded = $derived(child ? remindedChildren.includes(child.id) : false);
	const attendance = $derived(
		child && dashboard
			? attendanceSummary(
					dashboard.attendanceMonth.year,
					dashboard.attendanceMonth.month,
					child.absences
				)
			: null
	);
	const monthName = $derived(
		dashboard
			? formatMonthName(dashboard.attendanceMonth.year, dashboard.attendanceMonth.month, LOCALE)
			: ''
	);
	const attendanceNote = $derived.by(() => {
		if (!attendance || !dashboard) return '';
		if (!attendance.groups.length) return i18n.t('dashboard.guardian.attendance_all');
		return attendance.groups
			.map((group) =>
				i18n.t('dashboard.guardian.attendance_group', {
					status: i18n.t(`dashboard.guardian.absence.${group.status}`),
					count: group.days.length,
					dates: group.days
						.map((day) =>
							formatWeekdayDayMonth(
								dashboard.attendanceMonth.year,
								dashboard.attendanceMonth.month,
								day,
								LOCALE
							)
						)
						.join('; ')
				})
			)
			.join(' ');
	});
	const childReplies = $derived(child ? (replies[child.id] ?? []) : []);
	const visibleToast = $derived(toast && clock.elapsed < toast.until ? toast : null);
	const simulationNote = $derived(i18n.t('dashboard.teacher.simulation_note'));

	function showToast(message: string, icon: LucideIcon) {
		toast = { message: `${message} ${simulationNote}`, icon, until: clock.elapsed + TOAST_SECONDS };
	}

	function selectChild(index: number) {
		childIndex = index;
		replyText = '';
	}

	function toggleReminded() {
		if (!child) return;
		const wasReminded = remindedChildren.includes(child.id);
		remindedChildren = wasReminded
			? remindedChildren.filter((id) => id !== child.id)
			: [...remindedChildren, child.id];
		if (!wasReminded) showToast(i18n.t('dashboard.guardian.toast_reminded'), Check);
	}

	function sendReply(event: SubmitEvent) {
		event.preventDefault();
		const text = replyText.trim();
		if (!text || !child) return;
		replies = { ...replies, [child.id]: [...(replies[child.id] ?? []), text] };
		replyText = '';
		showToast(i18n.t('dashboard.guardian.toast_reply'), Send);
	}
</script>

<!-- Struktur & data contoh mengikuti FLIXARE App v3.html layar 08 (FE-07). -->
<div class="flex min-w-0 flex-col gap-5">
	{#if dashboard && child}
		{@const actionsDisabled = !data.canSimulate}
		<p id={reasonId} class="sr-only">{i18n.t('common.state.action_unavailable')}</p>

		<HeroBanner
			eyebrow={`${formatLongDate(dashboard.date, LOCALE)} · ${i18n.t('dashboard.guardian.portal')}`}
			title={i18n.t(`dashboard.greeting.${greetingPeriod(clock.nowSeconds)}`, {
				name: greeting
			})}
			description={child.headline}
		>
			{#snippet actions()}
				<div
					class="flex flex-wrap gap-2"
					role="group"
					aria-label={i18n.t('dashboard.guardian.child_legend')}
				>
					{#each dashboard.children as item, index (item.id)}
						{@const selected = index === childIndex}
						<button
							type="button"
							class={[
								'lms-focus-ring flex h-11 items-center gap-2.5 rounded-full border ps-1.5 pe-3.5 transition-colors',
								selected
									? 'bg-lms-on-hero text-lms-brand-deep-neutral border-lms-on-hero'
									: 'bg-lms-on-hero/6 text-lms-on-hero border-lms-on-hero/20'
							]}
							aria-pressed={selected}
							onclick={() => selectChild(index)}
						>
							<span
								class={[
									'text-lms-on-hero flex size-8 items-center justify-center rounded-full text-xs font-bold',
									selected ? 'bg-lms-interactive' : 'bg-lms-on-hero/15'
								]}
								aria-hidden="true"
							>
								{initialsOf(item.fullName)}
							</span>
							<span class="flex flex-col items-start leading-tight">
								<span class="text-[0.8125rem] font-semibold">{item.shortName}</span>
								<span class="text-[11px] opacity-75">{item.className}</span>
							</span>
						</button>
					{/each}
				</div>
			{/snippet}
			{#snippet aside()}
				<section
					class="lms-hero-raised flex flex-col gap-3 p-5"
					aria-label={i18n.t('dashboard.guardian.today_for', { name: child.shortName })}
				>
					<p class="text-lms-on-hero-muted text-[11px] font-bold tracking-[0.16em]">
						{i18n.t('dashboard.guardian.today_for', { name: child.shortName.toUpperCase() })}
					</p>
					<ol class="flex flex-col gap-3">
						{#each child.today as item (item.time + item.title)}
							<li class="flex items-center gap-3">
								<span class="w-10.5 text-[0.8125rem] font-bold tabular-nums">{item.time}</span>
								<span
									class={[
										'flex size-7.5 flex-none items-center justify-center rounded-[9px]',
										TIMELINE_TONES[item.tone]
									]}
									aria-hidden="true"
								>
									<Icon icon={TIMELINE_ICONS[item.icon]} size="sm" />
								</span>
								<span class="flex min-w-0 flex-1 flex-col gap-px leading-tight">
									<span class="text-sm font-semibold">{item.title}</span>
									<span class="text-lms-on-hero-muted text-xs">{item.detail}</span>
								</span>
							</li>
						{/each}
					</ol>
				</section>
			{/snippet}
		</HeroBanner>

		{#if child.actionNeeded && !reminded}
			<div
				class="bg-warning-50 text-lms-warning-text dark:bg-warning-500/15 flex flex-wrap items-center gap-3.5 rounded-xl px-4.5 py-4"
				role="status"
			>
				<span class="flex-none"><Icon icon={BellRing} /></span>
				<p class="flex-[1_1_16.25rem] text-sm leading-[1.3125rem]">
					<strong>{i18n.t('dashboard.guardian.attention')}</strong>
					{child.actionNeeded}
				</p>
				<button
					type="button"
					class="lms-focus-ring h-9 rounded-lg border-[1.5px] border-current px-3.5 text-[0.8125rem] font-bold disabled:cursor-not-allowed disabled:opacity-50"
					disabled={actionsDisabled}
					aria-describedby={actionsDisabled ? reasonId : undefined}
					onclick={toggleReminded}
				>
					{i18n.t('dashboard.guardian.mark_reminded')}
				</button>
			</div>
		{:else if child.actionNeeded && reminded}
			<div
				class="bg-lms-progress/12 text-lms-progress-text flex flex-wrap items-center gap-3.5 rounded-xl px-4.5 py-4 text-sm"
				role="status"
			>
				<Icon icon={CircleCheck} />
				<span class="flex-1">
					{i18n.t('dashboard.guardian.reminded', { name: child.shortName })}
				</span>
				<button
					type="button"
					class="lms-focus-ring text-[0.8125rem] font-semibold underline"
					onclick={toggleReminded}
				>
					{i18n.t('dashboard.guardian.undo')}
				</button>
			</div>
		{:else}
			<div
				class="bg-lms-progress/12 text-lms-progress-text flex items-center gap-3.5 rounded-xl px-4.5 py-4 text-sm"
				role="status"
			>
				<Icon icon={CircleCheck} />{i18n.t('dashboard.guardian.no_action')}
			</div>
		{/if}

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			<section
				class="lms-card flex min-w-0 flex-col overflow-hidden rounded-xl! shadow-none! md:col-span-2"
				aria-labelledby="{reasonId}-notebook"
			>
				<div class="border-lms-border flex items-center justify-between gap-3 border-b px-5.5 py-4">
					<h2 id="{reasonId}-notebook" class="flex items-center gap-2.5 text-base font-bold">
						<span class="text-lms-interactive"><Icon icon={NotebookPen} /></span>
						{i18n.t('dashboard.guardian.notebook')}
					</h2>
					<span class="text-lms-muted text-xs">
						{child.homeroomTeacher} · {formatDayMonthYear(child.homeroomNote.date, LOCALE)}
					</span>
				</div>
				<div
					class="relative flex-1 bg-[repeating-linear-gradient(transparent_0_33px,var(--color-lms-border)_33px_34px)] bg-position-[0_14px] pt-3.5 pr-6 pb-4.5 pl-16"
				>
					<span class="absolute inset-y-0 left-11.5 w-[1.5px] bg-error-500/45" aria-hidden="true"
					></span>
					<p class="text-base leading-[34px]">{child.homeroomNote.text}</p>
					<p class="text-lms-muted text-right text-sm leading-[34px]">
						{i18n.t('dashboard.guardian.signature', {
							teacher: child.homeroomTeacher,
							class: child.className
						})}
					</p>
					{#each childReplies as reply, index (index)}
						<p class="text-lms-link text-base leading-[34px]">
							{reply}<span class="text-lms-muted ms-1 text-xs">
								{i18n.t('dashboard.guardian.reply_by', { name: greeting })}</span
							>
						</p>
					{/each}
				</div>
				<form
					class="border-lms-border bg-lms-background flex gap-2.5 border-t px-5.5 py-3.5"
					onsubmit={sendReply}
				>
					<label class="sr-only" for="{reasonId}-reply">
						{i18n.t('dashboard.guardian.reply_label')}
					</label>
					<input
						id="{reasonId}-reply"
						class="input lms-input lms-focus-ring h-10.5 min-w-0 flex-1 text-sm"
						placeholder={i18n.t('dashboard.guardian.reply_placeholder')}
						disabled={actionsDisabled}
						aria-describedby={actionsDisabled ? reasonId : undefined}
						bind:value={replyText}
					/>
					<button
						type="submit"
						class={[
							'lms-focus-ring flex h-10.5 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed',
							replyText.trim()
								? 'lms-action-primary'
								: 'bg-lms-input-border text-lms-on-interactive disabled:opacity-100'
						]}
						disabled={actionsDisabled || !replyText.trim()}
						aria-describedby={actionsDisabled ? reasonId : undefined}
					>
						<Icon icon={Send} size="sm" />{i18n.t('dashboard.guardian.send')}
					</button>
				</form>
			</section>

			<section
				class="lms-card flex min-w-0 flex-col gap-1 rounded-xl! p-5 shadow-none!"
				aria-labelledby="{reasonId}-grades"
			>
				<div class="mb-2 flex items-baseline justify-between">
					<h2 id="{reasonId}-grades" class="text-base font-bold">
						{i18n.t('dashboard.guardian.grades')}
					</h2>
					<UnavailableLink
						label={i18n.t('dashboard.guardian.grade_detail')}
						note={i18n.t('common.workspace.not_available_yet')}
					/>
				</div>
				<ul>
					{#each child.subjects as subject (subject.name)}
						{@const word = scoreWord(
							subject.score,
							dashboard.masteryTarget,
							dashboard.excellentThreshold
						)}
						<li class="border-lms-border flex items-center gap-3 border-t py-2.5">
							<span class="flex-1 text-sm">{subject.name}</span>
							<span class={['text-xs font-semibold', WORD_CLASSES[word]]}>
								{i18n.t(`dashboard.guardian.score_word.${word}`)}
							</span>
							<span class="w-8 text-right text-[0.9375rem] font-bold tabular-nums">
								{subject.score}
							</span>
						</li>
					{/each}
				</ul>
				<p class="text-lms-muted mt-1.5 text-xs">
					{i18n.t('dashboard.guardian.criteria', { target: dashboard.masteryTarget })}
				</p>
			</section>
		</div>

		<div class="grid gap-4 md:grid-cols-2">
			{#if attendance}
				<section
					class="lms-card flex min-w-0 flex-col gap-3 rounded-xl! p-5 shadow-none!"
					aria-labelledby="{reasonId}-attendance"
				>
					<div class="flex items-baseline justify-between">
						<h2 id="{reasonId}-attendance" class="text-base font-bold">
							{i18n.t('dashboard.guardian.attendance', { month: monthName })}
						</h2>
						<span class="text-[0.8125rem] font-semibold">
							{i18n.t('dashboard.guardian.attendance_sum', {
								present: attendance.present,
								total: attendance.total
							})}
						</span>
					</div>
					<ol class="grid grid-cols-11 gap-1">
						{#each attendance.days as day (day.day)}
							{@const label = i18n.t('dashboard.guardian.attendance_day', {
								day: day.day,
								month: monthName,
								status: day.status
									? i18n.t(`dashboard.guardian.absence.${day.status}`)
									: i18n.t('dashboard.guardian.present')
							})}
							<li
								class={['h-5.5 rounded', day.status ? 'bg-warning-500' : 'bg-lms-progress/55']}
								title={label}
							>
								<span class="sr-only">{label}</span>
							</li>
						{/each}
					</ol>
					<p class="text-lms-muted text-[0.8125rem]">{attendanceNote}</p>
				</section>
			{/if}

			<section
				class="lms-card flex min-w-0 flex-col gap-1 rounded-xl! p-5 shadow-none!"
				aria-labelledby="{reasonId}-agenda"
			>
				<h2 id="{reasonId}-agenda" class="mb-2 text-base font-bold">
					{i18n.t('dashboard.guardian.agenda')}
				</h2>
				<ul>
					{#each [...child.agenda, ...dashboard.announcements] as entry (entry.id)}
						<li class="border-lms-border flex items-start gap-3.5 border-t py-2.5">
							<span class="text-lms-link w-12 flex-none pt-0.5 text-xs font-bold">
								{agendaDateLabel(entry.date, dashboard.date, LOCALE)}
							</span>
							<span class="flex flex-col gap-0.5 leading-tight">
								<span class="text-sm font-semibold">{entry.title}</span>
								<span class="text-lms-muted text-xs">{entry.detail}</span>
							</span>
						</li>
					{/each}
				</ul>
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
