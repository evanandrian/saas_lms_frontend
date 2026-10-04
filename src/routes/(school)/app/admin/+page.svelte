<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import UnavailableLink from '$lib/components/ui/UnavailableLink.svelte';
	import { useI18n } from '$lib/i18n';
	import {
		dayOfMonth,
		formatLongDate,
		formatShortDate,
		formatWeekdayLong,
		formatWeekdayShort,
		greetingPeriod
	} from '$lib/utils/clock';
	import { createDashboardClock } from '$lib/utils/dashboard-clock.svelte';
	import BellRing from '@lucide/svelte/icons/bell-ring';
	import Check from '@lucide/svelte/icons/check';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import DoorOpen from '@lucide/svelte/icons/door-open';
	import FileUp from '@lucide/svelte/icons/file-up';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import {
		SEAT_SEGMENTS,
		allRooms,
		attendanceBand,
		minutesSinceFirstPeriod,
		presentCount,
		reportStepReached,
		seatSummary,
		trialProgress,
		type AbsenceStatus,
		type AttendanceBand
	} from './school-dashboard';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const reasonId = $props.id();
	const LOCALE = 'id-ID';
	const TOAST_SECONDS = 6;

	const BAND_CLASSES: Record<AttendanceBand, string> = {
		high: 'lms-scale-high border border-transparent',
		mid: 'lms-scale-mid border border-transparent',
		low: 'lms-scale-low border border-transparent',
		unfilled: 'border-[1.5px] border-dashed border-lms-danger-text text-lms-danger-text'
	};
	const ABSENCE_CLASSES: Record<AbsenceStatus, string> = {
		sick: 'bg-lms-interactive-subtle text-lms-link',
		permit: 'preset-tonal-warning',
		absent: 'preset-tonal-error'
	};

	const clock = createDashboardClock(() => data.dashboard?.clockStartSeconds ?? null);
	// svelte-ignore state_referenced_locally
	let selectedRoomId = $state(data.dashboard?.defaultRoomId ?? '');
	let reminded = $state<string[]>([]);
	let doneFollowUps = $state<string[]>([]);
	let toast = $state<{ message: string; until: number } | null>(null);

	const dashboard = $derived(data.dashboard);
	const rooms = $derived(allRooms(dashboard?.grades ?? []));
	const filledRooms = $derived(rooms.filter((room) => room.attendancePercent !== null).length);
	const room = $derived(rooms.find((item) => item.id === selectedRoomId) ?? rooms[0] ?? null);
	const trial = $derived(
		dashboard?.trial
			? { ...dashboard.trial, ...trialProgress(dashboard.trial, dashboard.date) }
			: null
	);
	const seats = $derived(dashboard ? seatSummary(dashboard.seats) : null);
	const followUpsLeft = $derived(
		(dashboard?.followUps.length ?? 0) -
			doneFollowUps.filter((id) => dashboard?.followUps.some((item) => item.id === id)).length
	);
	const visibleToast = $derived(toast && clock.elapsed < toast.until ? toast : null);
	const legend = $derived.by((): { band: AttendanceBand; label: string }[] => {
		if (!dashboard) return [];
		const { high, mid } = dashboard.attendanceBands;
		return [
			{ band: 'high', label: i18n.t('dashboard.school.legend_high', { value: high }) },
			{ band: 'mid', label: i18n.t('dashboard.school.legend_mid', { min: mid, max: high - 1 }) },
			{ band: 'low', label: i18n.t('dashboard.school.legend_low', { value: mid }) },
			{ band: 'unfilled', label: i18n.t('dashboard.school.legend_unfilled') }
		];
	});

	function remind(roomId: string, teacher: string) {
		if (reminded.includes(roomId)) return;
		reminded = [...reminded, roomId];
		toast = {
			message: `${i18n.t('dashboard.school.toast_reminded', { name: teacher })} ${i18n.t('dashboard.teacher.simulation_note')}`,
			until: clock.elapsed + TOAST_SECONDS
		};
	}

	function toggleFollowUp(id: string) {
		doneFollowUps = doneFollowUps.includes(id)
			? doneFollowUps.filter((item) => item !== id)
			: [...doneFollowUps, id];
	}
</script>

<!-- Struktur & data contoh mengikuti FLIXARE App v3.html layar 05 (FE-07). -->
<div class="flex min-w-0 flex-col gap-5">
	{#if dashboard}
		{@const actionsDisabled = !data.canSimulate}
		{@const notAvailable = i18n.t('common.workspace.not_available_yet')}
		<p id={reasonId} class="sr-only">{i18n.t('common.state.action_unavailable')}</p>

		<HeroBanner
			eyebrow={`${formatLongDate(dashboard.date, LOCALE)} · ${dashboard.academicYearLabel} · ${dashboard.semesterLabel}`}
			title={i18n.t(`dashboard.greeting.${greetingPeriod(clock.nowSeconds)}`, {
				name: dashboard.greetingName
			})}
			description={i18n.t('dashboard.school.summary', {
				school: dashboard.schoolName,
				plan: dashboard.planName,
				classes: rooms.length,
				filled: filledRooms
			})}
		>
			{#snippet actions()}
				<Button variant="on-hero" disabled aria-describedby={reasonId}>
					<Icon icon={FileUp} size="sm" />{i18n.t('dashboard.school.import_students')}
				</Button>
				<Button variant="on-hero-outline" disabled aria-describedby={reasonId}>
					<Icon icon={UserPlus} size="sm" />{i18n.t('dashboard.school.invite_teacher')}
				</Button>
				<Button variant="on-hero-outline" disabled aria-describedby={reasonId}>
					<Icon icon={Megaphone} size="sm" />{i18n.t('dashboard.school.announcement')}
				</Button>
			{/snippet}
			{#snippet aside()}
				{#if trial}
					<section
						class="lms-hero-raised flex flex-col gap-3.5 p-5"
						aria-label={i18n.t('dashboard.school.trial')}
					>
						<p class="flex items-center justify-between gap-2">
							<span class="text-lms-on-hero-muted text-[11px] font-bold tracking-[0.16em]">
								{i18n.t('dashboard.school.trial')}
							</span>
							<span
								class="bg-lms-progress/22 text-lms-on-hero-progress rounded-full px-2.5 py-1 text-xs font-semibold"
							>
								{i18n.t('dashboard.school.trial_day', {
									day: trial.dayNumber,
									total: trial.totalDays
								})}
							</span>
						</p>
						<ol class="flex gap-2" aria-label={i18n.t('dashboard.school.trial_days_label')}>
							{#each trial.days as day, index (day)}
								{@const past = index < trial.currentIndex}
								{@const today = index === trial.currentIndex}
								<li
									class={[
										'flex min-w-0 flex-1 flex-col items-center overflow-hidden rounded-lg',
										today
											? 'bg-lms-on-hero/14 border-lms-on-hero/60 border-[1.5px]'
											: 'bg-lms-on-hero/5 border-lms-on-hero/14 border',
										past && 'opacity-55'
									]}
								>
									<span
										class={[
											'w-full py-0.75 text-center text-[10px] font-bold tracking-[0.06em]',
											today ? 'bg-lms-interactive' : 'bg-lms-on-hero/12'
										]}
									>
										{formatWeekdayShort(day, LOCALE)}
									</span>
									<span class={['pt-1 pb-1.5 text-lg font-bold', past && 'line-through']}>
										{dayOfMonth(day)}
									</span>
									{#if past || today}
										<span class="sr-only">
											({i18n.t(
												past
													? 'dashboard.school.trial_day_past'
													: 'dashboard.school.trial_day_today'
											)})</span
										>
									{/if}
								</li>
							{/each}
						</ol>
						<p class="text-lms-on-hero-muted text-[0.8125rem] leading-[1.2rem]">
							{i18n.t('dashboard.school.trial_ends', {
								weekday: formatWeekdayLong(trial.lastDay, LOCALE),
								date: formatShortDate(trial.lastDay, LOCALE),
								time: trial.endTimeLabel,
								used: trial.studentsUsed,
								limit: trial.studentLimit
							})}
						</p>
						<div class="flex flex-wrap gap-2">
							<Button variant="on-hero" disabled aria-describedby={reasonId}>
								{i18n.t('dashboard.school.pay_activate')}
							</Button>
							<Button variant="on-hero-outline" disabled aria-describedby={reasonId}>
								{i18n.t('dashboard.school.view_bill')}
							</Button>
						</div>
					</section>
				{/if}
			{/snippet}
		</HeroBanner>

		<div class="grid gap-4 xl:grid-cols-3">
			<section
				class="lms-card flex min-w-0 flex-col gap-4 rounded-xl! p-5 shadow-none! xl:col-span-2"
				aria-labelledby="{reasonId}-attendance"
			>
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 id="{reasonId}-attendance" class="text-base font-bold">
							{i18n.t('dashboard.school.attendance')}
						</h2>
						<p class="text-lms-muted text-[0.8125rem]">
							{i18n.t('dashboard.school.attendance_hint')}
						</p>
					</div>
					<ul class="text-lms-muted flex flex-wrap gap-3 text-[11px]">
						{#each legend as item (item.band)}
							<li class="flex items-center gap-1.25">
								<span class={['size-2.5 rounded-xs', BAND_CLASSES[item.band]]} aria-hidden="true"
								></span>
								{item.label}
							</li>
						{/each}
					</ul>
				</div>
				<div class="relative overflow-x-auto p-1">
					<div class="flex min-w-140 flex-col gap-2.5">
						{#each dashboard.grades as grade (grade.label)}
							<div class="flex items-stretch gap-2.5">
								<p
									class="border-lms-border text-lms-muted flex w-16 flex-none flex-col justify-center border-r-2 pr-2 text-xs"
								>
									<span class="text-lms-foreground text-sm font-bold">
										{i18n.t('dashboard.school.grade', { grade: grade.label })}
									</span>
									{i18n.t('dashboard.school.grade_classes', { count: grade.rooms.length })}
								</p>
								<div class="grid flex-1 grid-cols-7 gap-1.5">
									{#each grade.rooms as classRoom (classRoom.id)}
										{@const band = attendanceBand(
											classRoom.attendancePercent,
											dashboard.attendanceBands
										)}
										{@const selected = classRoom.id === room?.id}
										{@const value =
											classRoom.attendancePercent === null
												? i18n.t(
														reminded.includes(classRoom.id)
															? 'dashboard.school.room_reminded'
															: 'dashboard.school.room_unfilled'
													)
												: `${classRoom.attendancePercent}%`}
										<button
											type="button"
											class={[
												'lms-focus-ring flex h-15.5 flex-col items-start justify-between rounded-md px-2 py-1.75 text-left transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5',
												BAND_CLASSES[band],
												selected &&
													'ring-lms-interactive ring-offset-lms-surface -translate-y-0.5 ring-2 ring-offset-2'
											]}
											aria-pressed={selected}
											onclick={() => (selectedRoomId = classRoom.id)}
										>
											<span class="text-[11px] font-bold whitespace-nowrap">{classRoom.id}</span>
											<span class="text-[0.9375rem] font-bold tabular-nums">{value}</span>
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</section>

			{#if room}
				{@const present = presentCount(room, dashboard.studentsPerClass)}
				{@const sent = reminded.includes(room.id)}
				<section
					class="lms-card flex min-w-0 flex-col gap-3.5 rounded-xl! p-5 shadow-none!"
					aria-labelledby="{reasonId}-room"
					aria-live="polite"
				>
					<div class="flex items-start justify-between gap-3">
						<div>
							<span class="text-lms-muted font-mono text-[11px] tracking-[0.14em]">
								{i18n.t('dashboard.school.class')}
							</span>
							<h2 id="{reasonId}-room" class="text-[1.625rem] leading-tight font-bold">
								{room.id}
							</h2>
							<p class="text-lms-muted text-[0.8125rem]">
								{i18n.t('dashboard.school.homeroom', { name: room.homeroomTeacher })}
							</p>
						</div>
						<span
							class="bg-lms-interactive-subtle text-lms-interactive inline-flex size-10 items-center justify-center rounded-[10px]"
							aria-hidden="true"
						>
							<Icon icon={DoorOpen} />
						</span>
					</div>
					{#if room.attendancePercent !== null}
						<div class="flex flex-col gap-2">
							<p class="flex items-baseline gap-1.5">
								<span class="text-[2.125rem] leading-none font-bold tabular-nums">
									{present}/{dashboard.studentsPerClass}
								</span>
								<span class="text-lms-muted text-sm">
									{i18n.t('dashboard.school.students_present')}
								</span>
							</p>
							<div class="bg-lms-surface-muted h-2 overflow-hidden rounded-full" aria-hidden="true">
								<div
									class="bg-lms-interactive h-full rounded-full transition-[width] duration-400 motion-reduce:transition-none"
									style:width="{room.attendancePercent}%"
								></div>
							</div>
						</div>
						<ul>
							{#each room.absentees as absentee, index (`${absentee.name}-${index}`)}
								<li
									class="border-lms-border flex items-center justify-between border-t py-2.25 text-[0.8125rem]"
								>
									<span>{absentee.name}</span>
									<span
										class={[
											'rounded-full px-2 py-0.75 text-[11px] font-bold',
											ABSENCE_CLASSES[absentee.status]
										]}
									>
										{i18n.t(`dashboard.school.absence.${absentee.status}`)}
									</span>
								</li>
							{:else}
								<li class="text-lms-progress-text flex items-center gap-2 pt-1.5 text-[0.8125rem]">
									<Icon icon={CircleCheck} size="sm" />{i18n.t('dashboard.school.all_present')}
								</li>
							{/each}
						</ul>
					{:else}
						{@const lateMinutes = minutesSinceFirstPeriod(
							clock.nowSeconds,
							dashboard.firstPeriodStartMinutes
						)}
						<div
							class="border-lms-danger-text flex flex-col gap-2.5 rounded-[10px] border-[1.5px] border-dashed p-3.5"
						>
							<p class="text-lms-danger-text text-sm font-bold">
								{i18n.t('dashboard.school.unfilled_title')}
							</p>
							<p class="text-lms-muted text-[0.8125rem] leading-[1.2rem]">
								{lateMinutes > 0
									? i18n.t('dashboard.school.unfilled_body', { minutes: lateMinutes })
									: i18n.t('dashboard.school.unfilled_body_before')}
							</p>
							<button
								type="button"
								class={[
									'lms-focus-ring flex h-9.5 items-center justify-center gap-2 rounded-lg text-[0.8125rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
									sent ? 'bg-lms-progress/12 text-lms-progress-text' : 'lms-action-primary'
								]}
								disabled={actionsDisabled}
								aria-describedby={actionsDisabled ? reasonId : undefined}
								aria-pressed={sent}
								onclick={() => remind(room.id, room.homeroomTeacher)}
							>
								<Icon icon={sent ? Check : BellRing} size="sm" />
								{sent
									? i18n.t('dashboard.school.reminded')
									: i18n.t('dashboard.school.remind', { name: room.homeroomTeacher })}
							</button>
						</div>
					{/if}
					<div class="mt-auto">
						<UnavailableLink
							label={i18n.t('dashboard.school.open_attendance')}
							note={notAvailable}
						/>
					</div>
				</section>
			{/if}
		</div>

		<div class="grid gap-4 xl:grid-cols-3">
			<section
				class="lms-card flex min-w-0 flex-col gap-4 rounded-xl! p-5 shadow-none! xl:col-span-2"
				aria-labelledby="{reasonId}-report"
			>
				<div>
					<h2 id="{reasonId}-report" class="text-base font-bold">
						{i18n.t('dashboard.school.report', { semester: dashboard.reportCard.semesterName })}
					</h2>
					<p class="text-lms-muted text-[0.8125rem]">
						{i18n.t('dashboard.school.report_meta', {
							classes: rooms.length,
							deadline: dashboard.reportCard.approvalDeadlineLabel
						})}
					</p>
				</div>
				<ol class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8.125rem),1fr))] gap-2">
					{#each dashboard.reportCard.steps as step, index (step.label)}
						<li
							class={[
								'flex flex-col gap-2.5 rounded-lg p-3.5',
								reportStepReached(step.count, rooms.length)
									? 'bg-lms-interactive-subtle'
									: 'bg-lms-background'
							]}
						>
							<span class="text-lms-muted font-mono text-[11px]">
								{i18n.t('dashboard.school.report_step', { step: index + 1 })}
							</span>
							<span
								class={[
									'text-[1.625rem] leading-none font-bold tabular-nums',
									step.count === 0 ? 'text-lms-muted' : 'text-lms-foreground'
								]}
							>
								{step.count}<span class="text-lms-muted text-[0.8125rem] font-semibold">
									/{rooms.length}</span
								>
							</span>
							<span class="text-xs leading-[1.0625rem]">{step.label}</span>
							<span class="flex flex-wrap gap-0.5" aria-hidden="true">
								{#each rooms as reportRoom, roomIndex (reportRoom.id)}
									<span
										class={[
											'size-1.5 rounded-[1px]',
											roomIndex < step.count ? 'bg-lms-interactive' : 'bg-lms-input-border'
										]}
									></span>
								{/each}
							</span>
						</li>
					{/each}
				</ol>
				<p class="text-lms-muted flex gap-2 text-xs leading-[1.125rem]">
					<span class="text-lms-interactive mt-0.5"><Icon icon={Sparkles} size="sm" /></span>
					{i18n.t('dashboard.school.report_ai_note')}
				</p>
			</section>

			{#if seats}
				<section
					class="lms-card flex min-w-0 flex-col gap-4 rounded-xl! p-5 shadow-none!"
					aria-labelledby="{reasonId}-seats"
				>
					<div class="flex items-start justify-between gap-3">
						<div>
							<h2 id="{reasonId}-seats" class="text-base font-bold">
								{i18n.t('dashboard.school.seats')}
							</h2>
							<p class="text-lms-muted text-[0.8125rem]">
								{i18n.t('dashboard.school.seats_plan', { plan: dashboard.planName })}
							</p>
						</div>
						<UnavailableLink label={i18n.t('dashboard.school.add_seats')} note={notAvailable} />
					</div>
					<p class="flex items-baseline gap-1.5">
						<span class="text-4xl font-bold tracking-tight tabular-nums">
							{dashboard.seats.used.toLocaleString(LOCALE)}
						</span>
						<span class="text-lms-muted text-[0.9375rem]">
							{i18n.t('dashboard.school.seats_used', {
								capacity: dashboard.seats.capacity.toLocaleString(LOCALE)
							})}
						</span>
					</p>
					<div
						class="grid grid-cols-20 gap-0.75"
						role="img"
						aria-label={i18n.t('dashboard.school.seats_label', {
							used: dashboard.seats.used,
							capacity: dashboard.seats.capacity
						})}
					>
						{#each Array.from({ length: SEAT_SEGMENTS }, (_, index) => index) as segment (segment)}
							<span
								class={[
									'h-3 rounded-t-xs rounded-b-[1px]',
									segment < seats.filledSegments ? 'bg-lms-interactive' : 'bg-lms-surface-muted'
								]}
							></span>
						{/each}
					</div>
					<dl class="border-lms-border flex flex-col gap-2.5 border-t pt-3 text-[0.8125rem]">
						<div class="flex justify-between gap-2">
							<dt class="text-lms-muted">{i18n.t('dashboard.school.active_students')}</dt>
							<dd class="font-semibold tabular-nums">
								{dashboard.seats.activeStudents7d.toLocaleString(LOCALE)} · {seats.activeStudentsPercent}%
							</dd>
						</div>
						<div class="flex justify-between gap-2">
							<dt class="text-lms-muted">{i18n.t('dashboard.school.active_teachers')}</dt>
							<dd class="font-semibold tabular-nums">
								{i18n.t('dashboard.school.teachers_value', {
									active: dashboard.seats.activeTeachers7d,
									total: dashboard.seats.totalTeachers
								})}
							</dd>
						</div>
						<div class="flex justify-between gap-2">
							<dt class="text-lms-muted">{i18n.t('dashboard.school.storage')}</dt>
							<dd class="font-semibold tabular-nums">
								{dashboard.seats.storageUsedGb} / {dashboard.seats.storageCapacityGb} GB
							</dd>
						</div>
					</dl>
				</section>
			{/if}
		</div>

		<section
			class="lms-card flex min-w-0 flex-col gap-1 rounded-xl! p-5 shadow-none!"
			aria-labelledby="{reasonId}-follow-up"
		>
			<div class="mb-2 flex items-baseline justify-between">
				<h2 id="{reasonId}-follow-up" class="text-base font-bold">
					{i18n.t('dashboard.school.follow_up')}
				</h2>
				<span class="text-lms-muted text-xs">
					{i18n.t('dashboard.school.follow_up_left', { count: followUpsLeft })}
				</span>
			</div>
			<ul class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,26.25rem),1fr))] gap-x-7">
				{#each dashboard.followUps as followUp (followUp.id)}
					{@const done = doneFollowUps.includes(followUp.id)}
					<li class="border-lms-border flex items-start gap-3 border-t py-3">
						<button
							type="button"
							role="checkbox"
							aria-checked={done}
							aria-label={i18n.t('dashboard.school.mark_done', { title: followUp.title })}
							class={[
								'lms-focus-ring mt-px flex size-5 flex-none items-center justify-center rounded border-[1.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-50',
								done
									? 'bg-lms-interactive border-lms-interactive text-lms-on-interactive'
									: 'border-lms-input-border'
							]}
							disabled={actionsDisabled}
							aria-describedby={actionsDisabled ? reasonId : undefined}
							onclick={() => toggleFollowUp(followUp.id)}
						>
							<span class={done ? 'opacity-100' : 'opacity-0'}><Icon icon={Check} size="sm" /></span
							>
						</button>
						<span
							class={[
								'flex min-w-0 flex-1 flex-col gap-0.5 transition-opacity',
								done && 'opacity-50'
							]}
						>
							<span class={['text-sm font-semibold', done && 'line-through']}>{followUp.title}</span
							>
							<span class="text-lms-muted text-xs">{followUp.detail}</span>
						</span>
						<span class="mt-0.5 text-xs">
							<UnavailableLink label={followUp.actionLabel} note={notAvailable} />
						</span>
					</li>
				{/each}
			</ul>
		</section>

		<Toast message={visibleToast?.message ?? null} icon={BellRing} />
	{:else}
		<StatePanel
			headingLevel={1}
			title={i18n.t('common.state.no_data_title')}
			description={i18n.t('common.state.no_data_description')}
		/>
	{/if}
</div>
