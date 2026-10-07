<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import SampleBadge from '$lib/features/dashboards/components/SampleBadge.svelte';
	import { greetingParts, semesterKey } from '$lib/features/dashboards/dashboards.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { formatLongDate, greetingPeriod } from '$lib/utils/clock';
	import { createDashboardClock } from '$lib/utils/dashboard-clock.svelte';
	import { initialsOf } from '$lib/utils/initials';
	import type { LucideIcon } from '@lucide/svelte';
	import Award from '@lucide/svelte/icons/award';
	import BellRing from '@lucide/svelte/icons/bell-ring';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import Download from '@lucide/svelte/icons/download';
	import Eye from '@lucide/svelte/icons/eye';
	import FileCheck from '@lucide/svelte/icons/file-check';
	import FileText from '@lucide/svelte/icons/file-text';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import Info from '@lucide/svelte/icons/info';
	import Lock from '@lucide/svelte/icons/lock';
	import Plane from '@lucide/svelte/icons/plane';
	import Send from '@lucide/svelte/icons/send';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import UserPen from '@lucide/svelte/icons/user-pen';
	import Users from '@lucide/svelte/icons/users';
	import {
		principalSample as sample,
		type ClassSample,
		type KpiKey,
		type KpiPeriod,
		type NoteTone
	} from './principal.sample';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const uid = $props.id();
	const TOAST_SECONDS = 5;
	const GRADE_KEYS = ['X', 'XI', 'XII'] as const;
	type GradeFilter = 'all' | (typeof GRADE_KEYS)[number];
	type Metric = 'att' | 'nil' | 'tug';
	type TeacherSort = 'pending' | 'act' | 'name';
	type RiskFilter = 'all' | 'nil' | 'abs';
	/** Ambang referensi: kehadiran kelas < 90% atau nilai < KKM = perlu perhatian. */
	const ATTENDANCE_ALERT = 90;
	/** Rentang sumbu batang kehadiran (88–100%) dan tren kelompok (80–100%) sesuai referensi. */
	const TREND_FLOOR = 88;
	const TREND_SPAN = 12;
	const GROUP_FLOOR = 80;
	const GROUP_SCALE = 5;
	const SEAT_SEGMENTS = 40;
	/** Status aktivitas guru (referensi): tidak login ≥ 5 hari = tidak aktif; ≥ 15 lembar = perhatian. */
	const INACTIVE_DAYS = 5;
	const PENDING_ALERT = 15;
	const LOW_ACTIVITY_MATERIALS = 2;
	const RISK_ABSENCE_DAYS = 3;

	const KPI_ICONS: Record<KpiKey, LucideIcon> = {
		student_attendance: Users,
		teacher_attendance: Briefcase,
		average_score: Award,
		at_risk: TriangleAlert
	};
	const NOTE_CLASSES: Record<NoteTone, string> = {
		warning: 'text-lms-warning-text',
		muted: 'text-lms-muted',
		success: 'text-lms-success-text'
	};

	const clock = createDashboardClock(() => null);
	let period = $state<KpiPeriod>('today');
	let attMode = $state<'students' | 'teachers'>('students');
	let bar = $state(sample.trend.students.length - 1);
	let grade = $state<GradeFilter>('all');
	let subjectIndex = $state(0);
	let metric = $state<Metric>('att');
	let classKey = $state(sample.defaultClass);
	let teacherSort = $state<TeacherSort>('pending');
	let reminded = $state<string[]>([]);
	let riskFilter = $state<RiskFilter>('all');
	let riskOpen = $state(0);
	let asked = $state<string[]>([]);
	let agendaTab = $state<'agenda' | 'announcements'>('agenda');
	let toast = $state<{ message: string; icon: LucideIcon; until: number } | null>(null);

	const live = $derived(data.live);
	const dateLocale = $derived(i18n.locale === 'en' ? 'en-US' : 'id-ID');
	const fmt = (value: number | string) =>
		String(value).replace('.', i18n.locale === 'en' ? '.' : ',');
	const visibleToast = $derived(toast && clock.elapsed < toast.until ? toast : null);

	function notify(message: string, icon: LucideIcon = Check, simulated = true) {
		toast = {
			message: simulated ? `${message} ${i18n.t('dashboard.sample.simulation_note')}` : message,
			icon,
			until: clock.elapsed + TOAST_SECONDS
		};
	}

	// Sapaan & periode dari backend; data contoh hanya bila backend belum menjawab.
	const greetingName = $derived.by(() => {
		if (!live) return 'Bu Sri';
		const { name, honorific } = greetingParts(live.viewer);
		return honorific ? i18n.t(`dashboard.honorific.${honorific}`, { name }) : name;
	});
	const academicYear = $derived(live ? live.period.academic_year : '2026/2027');
	const semester = $derived(live ? semesterKey(live.period.semester) : 'odd');
	const eyebrow = $derived(
		[
			formatLongDate(sample.date, dateLocale),
			academicYear && i18n.t('dashboard.principal.academic_year', { year: academicYear }),
			semester && i18n.t(`dashboard.semester.${semester}`)
		]
			.filter(Boolean)
			.join(' · ')
	);
	// Pengajuan perubahan data (nama/NIP) admin sekolah: live dari Kotak Persetujuan.
	const dataChanges = $derived(live ? live.pending_approvals : sample.pendingDataChanges);
	const pendingTotal = $derived(
		dataChanges + sample.pendingReportCards + sample.pendingTeacherLeave
	);
	const decisions = $derived([
		{
			icon: FileText,
			label: i18n.t('dashboard.principal.decide_reports'),
			detail: i18n.t('dashboard.principal.decide_reports_detail'),
			count: sample.pendingReportCards,
			sample: true
		},
		{
			icon: Plane,
			label: i18n.t('dashboard.principal.decide_leave'),
			detail: i18n.t('dashboard.principal.decide_leave_detail'),
			count: sample.pendingTeacherLeave,
			sample: true
		},
		{
			icon: UserPen,
			label: i18n.t('dashboard.principal.decide_data'),
			detail: i18n.t('dashboard.principal.decide_data_detail'),
			count: dataChanges,
			sample: !live
		}
	]);

	const reportsApproved = sample.reportsApproved;
	const kpis = $derived([
		...sample.kpis[period].map((kpi) => ({
			icon: KPI_ICONS[kpi.key],
			label: i18n.t(`dashboard.principal.kpi_${kpi.key}`),
			value: kpi.value,
			note: kpi.note,
			tone: kpi.tone
		})),
		{
			icon: FileCheck,
			label: i18n.t('dashboard.principal.kpi_reports'),
			value: `${reportsApproved}/${sample.reportClassTotal}`,
			note: i18n.t('dashboard.principal.kpi_reports_note', { count: sample.reportRequests.length }),
			tone: 'muted' as NoteTone
		}
	]);

	const trend = $derived(sample.trend[attMode]);
	const groups = $derived(sample.attendanceGroups[attMode]);

	const gradeAverage = (scores: readonly number[]) =>
		grade === 'all'
			? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
			: (scores[GRADE_KEYS.indexOf(grade)] ?? 0);
	const selectedSubject = $derived(sample.subjects[subjectIndex] ?? sample.subjects[0]);
	const weakestGrade = $derived.by(() => {
		if (!selectedSubject) return null;
		const lowest = Math.min(...selectedSubject.byGrade);
		return lowest < sample.kkm
			? (GRADE_KEYS[selectedSubject.byGrade.indexOf(lowest)] ?? null)
			: null;
	});

	const metricValue = (item: ClassSample) =>
		metric === 'att' ? item.attendance : metric === 'nil' ? item.score : item.tasks;
	const metricUnit = $derived(metric === 'nil' ? '' : '%');
	const classPool = $derived(
		sample.classes.filter((item) => grade === 'all' || item.grade === grade)
	);
	const classRanking = $derived(
		[...classPool].sort((a, b) => (metricValue(b) ?? -1) - (metricValue(a) ?? -1))
	);
	const classAverage = $derived.by(() => {
		const values = classPool.map(metricValue).filter((value): value is number => value !== null);
		return values.reduce((sum, value) => sum + value, 0) / values.length;
	});
	const axisLow = $derived(metric === 'nil' ? 60 : 70);
	const barPosition = (value: number) =>
		`${Math.max(4, ((value - axisLow) / (100 - axisLow)) * 100)}%`;
	const isBad = (value: number | null) =>
		value === null || (metric === 'nil' ? value < sample.kkm : value < ATTENDANCE_ALERT);
	const schoolAverage = (key: 'attendance' | 'score') => {
		const values = sample.classes
			.map((item) => item[key])
			.filter((value): value is number => value !== null);
		return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
	};
	const selectedClass = $derived(
		sample.classes.find((item) => item.key === classKey) ?? sample.classes[0]
	);
	const classStatus = (item: ClassSample) =>
		item.attendance === null
			? 'unfilled'
			: item.score < sample.kkm || item.attendance < ATTENDANCE_ALERT
				? 'attention'
				: 'good';
	const attendanceAverage = schoolAverage('attendance');
	const scoreAverage = schoolAverage('score');
	const signed = (value: number) => (value >= 0 ? `+${value}` : String(value));

	const seatsUsed = $derived(
		live?.subscription ? live.subscription.seats_used : sample.subscription.seatsUsed
	);
	const seatCount = $derived(
		live?.subscription ? live.subscription.seat_count : sample.subscription.seatCount
	);
	const filledSegments = $derived(
		seatCount ? Math.round((Math.min(seatsUsed, seatCount) / seatCount) * SEAT_SEGMENTS) : 0
	);
	const subscriptionChip = $derived.by(() => {
		if (!live?.subscription) {
			return i18n.t('dashboard.principal.trial_day', {
				day: sample.subscription.trialDay,
				total: sample.subscription.trialDays
			});
		}
		return i18n.t(`dashboard.principal.subscription_status_${live.subscription.status}`);
	});
	// Trial/lewat tempo = peringatan, aktif = sukses, dibatalkan/berakhir = bahaya.
	const subscriptionTone = $derived.by(() => {
		const status = live?.subscription?.status ?? 'trial';
		if (status === 'active') return 'lms-tone-success';
		return status === 'trial' || status === 'past_due' ? 'lms-tone-warning' : 'lms-tone-danger';
	});
	const subscriptionStatus = $derived.by(() => {
		const subscription = live?.subscription;
		if (!subscription)
			return i18n.t('dashboard.principal.trial_until', { date: sample.subscription.trialEnds });
		const end =
			subscription.status === 'trial' ? subscription.trial_ends_at : subscription.period_end;
		const label = i18n.t(`dashboard.principal.subscription_status_${subscription.status}`);
		return end
			? `${label} · ${i18n.t('dashboard.principal.ends_on', {
					date: new Date(end).toLocaleDateString(dateLocale, {
						weekday: 'short',
						day: 'numeric',
						month: 'short',
						year: 'numeric'
					})
				})}`
			: label;
	});

	const teacherStatus = (teacher: (typeof sample.teachers)[number]) =>
		teacher.daysSinceLogin >= INACTIVE_DAYS
			? 'inactive'
			: teacher.pending >= PENDING_ALERT ||
				  (teacher.daysSinceLogin === 1 && teacher.materials < LOW_ACTIVITY_MATERIALS)
				? 'attention'
				: 'active';
	const teachers = $derived(
		[...sample.teachers].sort((a, b) =>
			teacherSort === 'pending'
				? b.pending - a.pending
				: teacherSort === 'act'
					? a.materials - b.materials
					: a.name.localeCompare(b.name)
		)
	);
	const STATUS_CLASSES = {
		active: 'lms-tone-success',
		attention: 'lms-tone-warning',
		inactive: 'lms-tone-danger'
	} as const;

	const risks = $derived(
		sample.risks.filter(
			(risk) =>
				riskFilter === 'all' ||
				(riskFilter === 'nil' ? risk.average < sample.kkm : risk.absentDays >= RISK_ABSENCE_DAYS)
		)
	);

	function remind(name: string) {
		reminded = [...reminded, name];
		notify(i18n.t('dashboard.principal.toast_reminded', { name }), BellRing);
	}

	function ask(risk: (typeof sample.risks)[number]) {
		if (asked.includes(risk.name)) return;
		asked = [...asked, risk.name];
		notify(
			i18n.t('dashboard.principal.toast_asked', { name: risk.name, homeroom: risk.homeroom }),
			Send
		);
	}
</script>

{#snippet segmented<T extends string>(
	options: readonly { key: T; label: string }[],
	current: T,
	onpick: (key: T) => void,
	label: string
)}
	<div class="bg-lms-background flex gap-0.5 rounded-[10px] p-0.75" role="group" aria-label={label}>
		{#each options as option (option.key)}
			<button
				type="button"
				aria-pressed={option.key === current}
				class={[
					'lms-focus-ring h-8 rounded-lg px-3 text-xs font-semibold whitespace-nowrap',
					option.key === current
						? 'bg-lms-surface text-lms-foreground shadow-[0_1px_3px_rgba(15,24,56,.16)]'
						: 'text-lms-muted'
				]}
				onclick={() => onpick(option.key)}>{option.label}</button
			>
		{/each}
	</div>
{/snippet}

{#snippet chips<T extends string>(
	options: readonly { key: T; label: string }[],
	current: T,
	onpick: (key: T) => void,
	label: string
)}
	<div class="flex flex-wrap gap-1.5" role="group" aria-label={label}>
		{#each options as option (option.key)}
			<button
				type="button"
				aria-pressed={option.key === current}
				class={[
					'lms-focus-ring h-8 rounded-full border-[1.5px] px-3 text-xs font-semibold',
					option.key === current
						? 'border-lms-interactive bg-lms-interactive-subtle'
						: 'border-lms-input-border bg-lms-surface'
				]}
				onclick={() => onpick(option.key)}>{option.label}</button
			>
		{/each}
	</div>
{/snippet}

{#snippet sectionHead(title: string, subtitle?: string, sampleSection = true)}
	<div class="min-w-0">
		<h2 class="flex flex-wrap items-center gap-2 text-base font-bold">
			{title}
			{#if sampleSection}<SampleBadge />{/if}
		</h2>
		{#if subtitle}<p class="text-lms-muted text-[0.8125rem]">{subtitle}</p>{/if}
	</div>
{/snippet}

<!-- Struktur, interaksi & data contoh mengikuti FLIXARE App v3.html layar 05b Dashboard Kepala Sekolah. -->
<div class="flex min-w-0 flex-col gap-5">
	<HeroBanner
		{eyebrow}
		title={i18n.t(`dashboard.greeting.${greetingPeriod(clock.nowSeconds)}`, { name: greetingName })}
		description={`${i18n.t('dashboard.principal.hero_attendance', { value: sample.attendanceToday })} ${
			pendingTotal
				? i18n.t('dashboard.principal.hero_pending', { count: pendingTotal })
				: i18n.t('dashboard.principal.hero_no_pending')
		}`}
	>
		{#snippet actions()}
			<p
				class="bg-lms-on-hero/8 border-lms-on-hero/16 text-lms-on-hero-muted flex w-fit basis-full items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs"
			>
				<Icon icon={Eye} size="sm" />{i18n.t('dashboard.principal.view_mode')}
			</p>
			<a
				href={resolve(APP_PATHS.SCHOOL_ADMIN_APPROVALS)}
				class="btn btn-base bg-lms-on-hero text-lms-brand-deep-neutral hover:bg-lms-on-hero/90 lms-focus-ring gap-2"
			>
				<Icon icon={InboxIcon} size="sm" />{i18n.t('dashboard.principal.open_approvals')}
			</a>
			<Button
				variant="on-hero-outline"
				onclick={() =>
					notify(
						i18n.t('dashboard.principal.toast_download', { month: sample.monthlyReport }),
						Download
					)}
			>
				<Icon icon={Download} size="sm" />{i18n.t('dashboard.principal.download_report')}
			</Button>
		{/snippet}
		{#snippet aside()}
			<section class="lms-hero-raised flex flex-col gap-1.5 p-5" aria-labelledby="{uid}-decide">
				<h2
					id="{uid}-decide"
					class="text-lms-on-hero-muted mb-1.5 text-[11px] font-bold tracking-[0.16em] uppercase"
				>
					{i18n.t('dashboard.principal.needs_decision')}
				</h2>
				{#each decisions as decision (decision.label)}
					<a
						href={resolve(APP_PATHS.SCHOOL_ADMIN_APPROVALS)}
						class="border-lms-on-hero/12 text-lms-on-hero lms-focus-ring flex items-center gap-3 border-t py-2.5"
					>
						<span
							class="bg-lms-on-hero/10 flex size-8.5 flex-none items-center justify-center rounded-lg"
						>
							<Icon icon={decision.icon} size="sm" />
						</span>
						<span class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="text-sm font-semibold">{decision.label}</span>
							<span class="text-lms-on-hero-muted flex flex-wrap items-center gap-1.5 text-xs">
								{decision.detail}
								{#if decision.sample}<SampleBadge tone="on-hero" />{/if}
							</span>
						</span>
						<span class="text-[1.375rem] font-bold tabular-nums">{decision.count}</span>
					</a>
				{/each}
			</section>
		{/snippet}
	</HeroBanner>

	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 class="flex items-center gap-2 text-lg font-bold">
			{i18n.t('dashboard.principal.school_summary')}<SampleBadge />
		</h2>
		{@render segmented(
			[
				{ key: 'today', label: i18n.t('dashboard.principal.period_today') },
				{ key: 'week', label: i18n.t('dashboard.principal.period_week') },
				{ key: 'month', label: i18n.t('dashboard.principal.period_month') }
			],
			period,
			(key) => (period = key),
			i18n.t('dashboard.principal.school_summary')
		)}
	</div>
	<ul class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11.875rem),1fr))] gap-3">
		{#each kpis as kpi (kpi.label)}
			<li class="lms-card flex flex-col gap-1.5 rounded-xl! p-4 shadow-none!">
				<span class="text-lms-muted flex items-center gap-1.5 text-xs font-semibold">
					<span class="text-lms-interactive"><Icon icon={kpi.icon} size="sm" /></span>{kpi.label}
				</span>
				<span class="text-[1.75rem] font-bold tracking-tight tabular-nums">{kpi.value}</span>
				<span class={['text-xs', NOTE_CLASSES[kpi.tone]]}>{kpi.note}</span>
			</li>
		{/each}
	</ul>

	<div
		id="presensi"
		class="grid scroll-mt-21 grid-cols-[repeat(auto-fit,minmax(min(100%,21.25rem),1fr))] gap-4"
	>
		<section class="lms-card flex flex-col gap-4 rounded-xl! p-5 shadow-none!">
			<div class="flex flex-wrap items-start justify-between gap-3">
				{@render sectionHead(
					i18n.t('dashboard.principal.attendance_trend'),
					i18n.t('dashboard.principal.attendance_trend_hint')
				)}
				{@render segmented(
					[
						{ key: 'students', label: i18n.t('dashboard.principal.mode_students') },
						{ key: 'teachers', label: i18n.t('dashboard.principal.mode_teachers') }
					],
					attMode,
					(key) => (attMode = key),
					i18n.t('dashboard.principal.attendance_trend')
				)}
			</div>
			<div class="flex h-37.5 items-end gap-2.5 pt-5">
				{#each trend as point, index (point.day)}
					{@const active = index === bar}
					<button
						type="button"
						class="lms-focus-ring flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
						aria-label="{point.day}: {fmt(point.value)}%"
						aria-pressed={active}
						onclick={() => (bar = index)}
						onmouseenter={() => (bar = index)}
					>
						<span class={['text-xs font-bold tabular-nums', !active && 'opacity-0']}
							>{fmt(point.value)}%</span
						>
						<span
							class={[
								'w-full max-w-11 rounded-t-md rounded-b-xs transition-[height,background-color] duration-400',
								active ? 'bg-lms-interactive' : 'bg-lms-interactive/35'
							]}
							style:height="{Math.round(((point.value - TREND_FLOOR) / TREND_SPAN) * 100)}px"
						></span>
						<span class={['text-lms-muted text-[11px]', active && 'font-bold']}>{point.day}</span>
					</button>
				{/each}
			</div>
			<ul class="border-lms-border flex flex-col gap-2.5 border-t pt-3">
				{#each groups as group (group.label)}
					<li class="flex items-center gap-3 text-[0.8125rem]">
						<span class="text-lms-muted w-14">{group.label}</span>
						<span class="bg-lms-background h-2 flex-1 overflow-hidden rounded-full">
							<span
								class="bg-lms-interactive block h-full rounded-full transition-[width] duration-400"
								style:width="{(group.value - GROUP_FLOOR) * GROUP_SCALE}%"
							></span>
						</span>
						<span class="w-13 text-right font-semibold tabular-nums">{fmt(group.value)}%</span>
					</li>
				{/each}
			</ul>
		</section>
		<section class="lms-card flex flex-col gap-3 rounded-xl! p-5 shadow-none!">
			<div class="flex items-baseline justify-between gap-2">
				{@render sectionHead(i18n.t('dashboard.principal.absent_teachers'))}
				<span class="text-lms-muted text-[0.8125rem] whitespace-nowrap">
					{i18n.t('dashboard.principal.present_of', {
						present: sample.teachersPresent,
						total: sample.teachersTotal
					})}
				</span>
			</div>
			<ul>
				{#each sample.absentTeachers as teacher (teacher.name)}
					<li class="border-lms-border flex items-center gap-3 border-t py-2.5">
						<span
							class="bg-lms-background flex size-8.5 flex-none items-center justify-center rounded-full text-[11px] font-bold"
							>{initialsOf(teacher.name)}</span
						>
						<span class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="text-sm font-semibold">{teacher.name}</span>
							<span class="text-lms-muted text-xs">{teacher.detail}</span>
						</span>
						<span
							class={[
								'rounded-full px-2.5 py-0.75 text-[11px] font-bold',
								teacher.status === 'duty' ? 'lms-tone-info' : 'lms-tone-warning'
							]}>{i18n.t(`dashboard.principal.absence_${teacher.status}`)}</span
						>
					</li>
				{/each}
			</ul>
			<p
				class="bg-lms-background text-lms-muted mt-auto flex gap-2 rounded-[10px] p-3 text-xs leading-4.5"
			>
				<span class="mt-0.5"><Icon icon={Info} size="sm" /></span>{sample.absenceNote}
			</p>
		</section>
	</div>

	<section
		id="laporan"
		class="lms-card flex scroll-mt-21 flex-col gap-4 rounded-xl! p-5 shadow-none!"
	>
		<div class="flex flex-wrap items-start justify-between gap-3">
			{@render sectionHead(
				i18n.t('dashboard.principal.subject_scores'),
				i18n.t('dashboard.principal.subject_scores_hint', { kkm: sample.kkm })
			)}
			{@render chips(
				[
					{ key: 'all', label: i18n.t('dashboard.principal.grade_all') },
					...GRADE_KEYS.map((key) => ({
						key,
						label: i18n.t('dashboard.principal.grade', { grade: key })
					}))
				],
				grade,
				(key) => (grade = key),
				i18n.t('dashboard.principal.grade_filter')
			)}
		</div>
		<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] items-start gap-5">
			<div class="flex flex-col gap-1.5">
				{#each sample.subjects as subject, index (subject.name)}
					{@const value = gradeAverage(subject.byGrade)}
					{@const active = index === subjectIndex}
					<button
						type="button"
						aria-pressed={active}
						class={[
							'lms-focus-ring grid grid-cols-[7.5rem_minmax(0,1fr)_2.75rem] items-center gap-3 rounded-lg px-2.5 py-2 text-left',
							active && 'bg-lms-background'
						]}
						onclick={() => (subjectIndex = index)}
					>
						<span class={['text-[0.8125rem]', active ? 'font-bold' : 'font-medium']}
							>{subject.name}</span
						>
						<span class="bg-lms-background relative h-3.5 rounded">
							<span
								class={[
									'absolute inset-y-0 left-0 rounded transition-[width] duration-400',
									value < sample.kkm ? 'bg-lms-scale-mid' : 'bg-lms-interactive'
								]}
								style:width="{value}%"
							></span>
							<span
								class="border-lms-muted absolute -inset-y-0.75 border-l-2 border-dashed opacity-50"
								style:left="{sample.kkm}%"
								aria-hidden="true"
							></span>
						</span>
						<span class="text-right text-[0.8125rem] font-bold tabular-nums">{value}</span>
					</button>
				{/each}
			</div>
			{#if selectedSubject}
				<div class="bg-lms-background flex flex-col gap-3.5 rounded-xl p-4.5">
					<div>
						<span class="text-lms-muted font-mono text-[11px] tracking-[0.12em] uppercase"
							>{i18n.t('dashboard.principal.detail')}</span
						>
						<p class="text-xl font-bold">{selectedSubject.name}</p>
					</div>
					<div class="grid grid-cols-3 gap-2.5">
						{#each selectedSubject.byGrade as value, index (index)}
							<div class="lms-card flex flex-col gap-1 rounded-[10px]! p-3 shadow-none!">
								<span class="text-lms-muted text-xs"
									>{i18n.t('dashboard.principal.grade', { grade: GRADE_KEYS[index] ?? '' })}</span
								>
								<span
									class={[
										'text-[1.375rem] font-bold',
										value < sample.kkm ? 'text-lms-warning-text' : 'text-lms-foreground'
									]}>{value}</span
								>
								<span class="text-lms-muted text-[11px]">
									{i18n.t('dashboard.principal.mastery', {
										percent: Math.min(98, Math.round(50 + (value - 65) * 2.6))
									})}
								</span>
							</div>
						{/each}
					</div>
					<p class="text-[0.8125rem] leading-5">
						{weakestGrade
							? i18n.t('dashboard.principal.subject_note_low', { grade: weakestGrade })
							: i18n.t('dashboard.principal.subject_note_ok')}
					</p>
				</div>
			{/if}
		</div>
	</section>

	<section
		id="kelas"
		class="lms-card flex scroll-mt-21 flex-col gap-4 rounded-xl! p-5 shadow-none!"
	>
		<div class="flex flex-wrap items-start justify-between gap-3">
			{@render sectionHead(
				i18n.t('dashboard.principal.class_comparison'),
				i18n.t('dashboard.principal.class_comparison_hint', {
					count: classPool.length,
					average: `${fmt(classAverage.toFixed(1))}${metricUnit}`
				})
			)}
			{@render segmented(
				[
					{ key: 'att', label: i18n.t('dashboard.principal.metric_attendance') },
					{ key: 'nil', label: i18n.t('dashboard.principal.metric_score') },
					{ key: 'tug', label: i18n.t('dashboard.principal.metric_tasks') }
				],
				metric,
				(key) => (metric = key),
				i18n.t('dashboard.principal.class_comparison')
			)}
		</div>
		<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] items-start gap-5">
			<ol class="flex max-h-130 flex-col gap-0.75 overflow-y-auto pe-1">
				{#each classRanking as item, index (item.key)}
					{@const value = metricValue(item)}
					{@const active = item.key === classKey}
					<li>
						<button
							type="button"
							aria-pressed={active}
							class={[
								'lms-focus-ring grid w-full grid-cols-[1.375rem_4rem_minmax(0,1fr)_3.25rem] items-center gap-2.5 rounded-lg px-2 py-1.5 text-left',
								active && 'bg-lms-background'
							]}
							onclick={() => (classKey = item.key)}
						>
							<span class="text-lms-muted font-mono text-[11px]">{index + 1}</span>
							<span class={['text-[0.8125rem]', active ? 'font-bold' : 'font-medium']}
								>{item.key}</span
							>
							<span class="bg-lms-background relative h-3 rounded">
								<span
									class={[
										'absolute inset-y-0 left-0 rounded transition-[width] duration-400',
										isBad(value) ? 'bg-lms-scale-mid' : 'bg-lms-interactive'
									]}
									style:width={value === null ? '0%' : barPosition(value)}
								></span>
								<span
									class="border-lms-muted absolute -inset-y-0.75 border-l-2 opacity-35"
									style:left={barPosition(classAverage)}
									aria-hidden="true"
								></span>
							</span>
							<span
								class={[
									'text-right text-[0.8125rem] font-bold tabular-nums',
									value === null && 'text-lms-danger-text'
								]}
								>{value === null
									? i18n.t('dashboard.principal.not_filled_short')
									: `${value}${metricUnit}`}</span
							>
						</button>
					</li>
				{/each}
			</ol>
			{#if selectedClass}
				{@const status = classStatus(selectedClass)}
				<div class="border-lms-border sticky top-21 flex flex-col gap-3.5 rounded-xl border p-4.5">
					<div class="flex items-start justify-between gap-2.5">
						<div>
							<span class="text-lms-muted font-mono text-[11px] tracking-[0.12em] uppercase"
								>{i18n.t('dashboard.principal.class')}</span
							>
							<p class="text-2xl font-bold">{selectedClass.key}</p>
							<p class="text-lms-muted text-[0.8125rem]">
								{i18n.t('dashboard.principal.class_meta', {
									homeroom: selectedClass.homeroom,
									count: selectedClass.students
								})}
							</p>
						</div>
						<span
							class={[
								'rounded-full px-2.5 py-0.75 text-[11px] font-bold whitespace-nowrap uppercase',
								status === 'unfilled'
									? 'lms-tone-danger'
									: status === 'attention'
										? 'lms-tone-warning'
										: 'lms-tone-success'
							]}>{i18n.t(`dashboard.principal.class_status_${status}`)}</span
						>
					</div>
					{#snippet stat(
						label: string,
						value: string,
						delta: string,
						tone: 'good' | 'bad' | 'muted'
					)}
						<div class="bg-lms-background flex flex-col gap-0.75 rounded-[10px] p-3">
							<span class="text-lms-muted text-xs">{label}</span>
							<span class="text-xl font-bold tabular-nums">{value}</span>
							<span
								class={[
									'text-[11px]',
									tone === 'good'
										? 'text-lms-success-text'
										: tone === 'bad'
											? 'text-lms-warning-text'
											: 'text-lms-muted'
								]}>{delta}</span
							>
						</div>
					{/snippet}
					<div class="grid grid-cols-2 gap-2.5">
						{@render stat(
							i18n.t('dashboard.principal.stat_attendance'),
							selectedClass.attendance === null ? '—' : `${selectedClass.attendance}%`,
							selectedClass.attendance === null
								? i18n.t('dashboard.principal.not_filled')
								: i18n.t('dashboard.principal.from_average', {
										value: signed(selectedClass.attendance - attendanceAverage)
									}),
							selectedClass.attendance !== null && selectedClass.attendance >= attendanceAverage
								? 'good'
								: 'bad'
						)}
						{@render stat(
							i18n.t('dashboard.principal.stat_score'),
							String(selectedClass.score),
							i18n.t('dashboard.principal.from_average', {
								value: signed(selectedClass.score - scoreAverage)
							}),
							selectedClass.score >= scoreAverage ? 'good' : 'bad'
						)}
						{@render stat(
							i18n.t('dashboard.principal.stat_tasks'),
							`${selectedClass.tasks}%`,
							i18n.t('dashboard.principal.last_7_days'),
							'muted'
						)}
						{@render stat(
							i18n.t('dashboard.principal.stat_at_risk'),
							String(
								Math.max(
									0,
									Math.round(
										(80 - selectedClass.score) / 2 + (95 - (selectedClass.attendance ?? 90)) / 2
									)
								)
							),
							i18n.t('dashboard.principal.of_students', { count: selectedClass.students }),
							'muted'
						)}
					</div>
					<p class="text-lms-muted flex items-center gap-1.5 text-xs">
						<Icon icon={Lock} size="sm" />{i18n.t('dashboard.principal.class_read_only')}
					</p>
				</div>
			{/if}
		</div>
	</section>

	<div
		id="rapor"
		class="grid scroll-mt-21 grid-cols-[repeat(auto-fit,minmax(min(100%,21.25rem),1fr))] gap-4"
	>
		<section class="lms-card flex flex-col gap-3.5 rounded-xl! p-5 shadow-none!">
			<div class="flex items-start justify-between gap-3">
				{@render sectionHead(
					i18n.t('dashboard.principal.report_approval'),
					i18n.t('dashboard.principal.report_approval_hint', {
						count: sample.reportClassTotal,
						date: sample.reportDeadline
					})
				)}
				<a
					href={resolve(APP_PATHS.SCHOOL_ADMIN_APPROVALS)}
					class="btn border-lms-input-border bg-lms-surface lms-focus-ring h-8.5 rounded-lg border px-3 text-xs font-semibold whitespace-nowrap"
					>{i18n.t('dashboard.principal.review')}</a
				>
			</div>
			<ol class="grid grid-cols-4 gap-1.5">
				{#each [{ key: 'published', count: sample.reportPipeline.published }, { key: 'edited', count: sample.reportPipeline.edited }, { key: 'submitted', count: sample.reportPipeline.submittedBeforeInbox + sample.reportRequests.length }, { key: 'approved', count: reportsApproved }] as step, index (step.key)}
					<li
						class={[
							'flex flex-col gap-1.5 rounded-lg p-2.5',
							index === 3
								? 'bg-lms-success-subtle'
								: index === 2
									? 'bg-lms-interactive-subtle'
									: 'bg-lms-background'
						]}
					>
						<span class="text-[1.375rem] font-bold tabular-nums">{step.count}</span>
						<span class="text-[11px] leading-3.75"
							>{i18n.t(`dashboard.principal.pipeline_${step.key}`)}</span
						>
					</li>
				{/each}
			</ol>
			<ul>
				{#each sample.reportRequests as request (request.className)}
					<li class="border-lms-border flex items-center gap-3 border-t py-2.5">
						<span class="text-lms-interactive"><Icon icon={FileText} /></span>
						<span class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="text-sm font-semibold"
								>{i18n.t('dashboard.principal.class_name', { name: request.className })}</span
							>
							<span class="text-lms-muted text-xs">{request.requester} · {request.detail}</span>
						</span>
						<span
							class="lms-tone-warning rounded-full px-2.5 py-0.75 text-[11px] font-bold whitespace-nowrap uppercase"
							>{i18n.t('dashboard.principal.report_pending')}</span
						>
					</li>
				{/each}
			</ul>
		</section>
		<section class="lms-card flex flex-col gap-3.5 rounded-xl! p-5 shadow-none!">
			<div class="flex items-start justify-between gap-3">
				{@render sectionHead(
					i18n.t('dashboard.principal.subscription'),
					i18n.t('dashboard.principal.subscription_hint', {
						plan: live?.subscription?.plan_name ?? sample.subscription.plan
					}),
					!live?.subscription
				)}
				<span
					class={[
						'rounded-full px-2.5 py-0.75 text-[11px] font-bold whitespace-nowrap uppercase',
						subscriptionTone
					]}>{subscriptionChip}</span
				>
			</div>
			<p class="flex items-baseline gap-1.5">
				<span class="text-4xl font-bold tracking-tight tabular-nums">{seatsUsed}</span>
				<span class="text-lms-muted text-[0.9375rem]">
					{seatCount
						? i18n.t('dashboard.principal.seats_of', { total: seatCount })
						: i18n.t('dashboard.principal.seats_used')}
				</span>
			</p>
			{#if seatCount}
				<div class="grid grid-cols-20 gap-0.75" aria-hidden="true">
					{#each Array.from({ length: SEAT_SEGMENTS }, (_, index) => index) as index (index)}
						<span
							class={[
								'h-3 rounded-xs',
								index < filledSegments ? 'bg-lms-interactive' : 'bg-lms-background'
							]}
						></span>
					{/each}
				</div>
			{/if}
			<dl class="border-lms-border flex flex-col gap-2.5 border-t pt-3 text-[0.8125rem]">
				<div class="flex justify-between gap-2">
					<dt class="text-lms-muted">{i18n.t('dashboard.principal.sub_status')}</dt>
					<dd class="text-right font-semibold">{subscriptionStatus}</dd>
				</div>
				{#each [{ key: 'sub_active_students', value: sample.subscription.activeStudents }, { key: 'sub_active_teachers', value: sample.subscription.activeTeachers }, { key: 'sub_storage', value: sample.subscription.storage }] as row (row.key)}
					<div class="flex items-center justify-between gap-2">
						<dt class="text-lms-muted flex items-center gap-1.5">
							{i18n.t(`dashboard.principal.${row.key}`)}
							{#if live?.subscription}<SampleBadge />{/if}
						</dt>
						<dd class="text-right font-semibold">{row.value}</dd>
					</div>
				{/each}
			</dl>
		</section>
	</div>

	<section
		id="guru"
		class="lms-card flex scroll-mt-21 flex-col overflow-hidden rounded-xl! shadow-none!"
	>
		<div
			class="border-lms-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"
		>
			{@render sectionHead(
				i18n.t('dashboard.principal.teacher_activity'),
				i18n.t('dashboard.principal.last_7_days')
			)}
			<div class="flex flex-wrap items-center gap-1.5">
				<span class="text-lms-muted text-xs">{i18n.t('dashboard.principal.sort_by')}</span>
				{@render segmented(
					[
						{ key: 'pending', label: i18n.t('dashboard.principal.sort_pending') },
						{ key: 'act', label: i18n.t('dashboard.principal.sort_activity') },
						{ key: 'name', label: i18n.t('dashboard.principal.sort_name') }
					],
					teacherSort,
					(key) => (teacherSort = key),
					i18n.t('dashboard.principal.sort_by')
				)}
			</div>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full min-w-190 text-[0.8125rem]">
				<thead
					class="bg-lms-background text-lms-muted font-mono text-[11px] tracking-[0.08em] uppercase"
				>
					<tr>
						<th class="px-5 py-2.5 text-left font-normal"
							>{i18n.t('dashboard.principal.col_teacher')}</th
						>
						<th class="px-3 py-2.5 text-left font-normal"
							>{i18n.t('dashboard.principal.col_classes')}</th
						>
						<th class="px-3 py-2.5 text-left font-normal"
							>{i18n.t('dashboard.principal.col_materials')}</th
						>
						<th class="px-3 py-2.5 text-left font-normal"
							>{i18n.t('dashboard.principal.col_pending')}</th
						>
						<th class="px-3 py-2.5 text-left font-normal"
							>{i18n.t('dashboard.principal.col_login')}</th
						>
						<th class="px-3 py-2.5 text-left font-normal"
							>{i18n.t('dashboard.principal.col_status')}</th
						>
						<th class="px-5 py-2.5"
							><span class="sr-only">{i18n.t('dashboard.principal.col_action')}</span></th
						>
					</tr>
				</thead>
				<tbody>
					{#each teachers as teacher (teacher.name)}
						{@const status = teacherStatus(teacher)}
						{@const wasReminded = reminded.includes(teacher.name)}
						<tr class="border-lms-border border-t">
							<td class="px-5 py-3">
								<span class="block font-semibold">{teacher.name}</span>
								<span class="text-lms-muted text-xs">{teacher.subjects}</span>
							</td>
							<td class="px-3 py-3 tabular-nums"
								>{i18n.t('dashboard.principal.classes_count', { count: teacher.classes })}</td
							>
							<td class="px-3 py-3">
								<span class="flex items-center gap-2">
									<span class="bg-lms-background h-1.5 w-11 overflow-hidden rounded-full">
										<span
											class="bg-lms-interactive block h-full"
											style:width="{Math.min(100, teacher.materials * 11)}%"
										></span>
									</span>
									<span class="tabular-nums">{teacher.materials}</span>
								</span>
							</td>
							<td
								class={[
									'px-3 py-3 font-semibold tabular-nums',
									teacher.pending >= PENDING_ALERT && 'text-lms-warning-text'
								]}
							>
								{i18n.t('dashboard.principal.sheets', { count: teacher.pending })}
							</td>
							<td class="text-lms-muted px-3 py-3">{teacher.lastLogin}</td>
							<td class="px-3 py-3">
								<span
									class={[
										'rounded-full px-2.5 py-0.75 text-[11px] font-bold whitespace-nowrap uppercase',
										STATUS_CLASSES[status]
									]}>{i18n.t(`dashboard.principal.teacher_${status}`)}</span
								>
							</td>
							<td class="px-5 py-3 text-right">
								{#if wasReminded}
									<span class="text-lms-success-text inline-flex items-center gap-1 text-xs">
										<Icon icon={Check} size="sm" />{i18n.t('dashboard.principal.sent')}
									</span>
								{:else if status !== 'active'}
									<button
										type="button"
										class="border-lms-input-border bg-lms-surface lms-focus-ring inline-flex h-7.5 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold"
										onclick={() => remind(teacher.name)}
									>
										<span class="text-lms-interactive"><Icon icon={BellRing} size="sm" /></span>
										{i18n.t('dashboard.principal.remind')}<span class="sr-only"
											>: {teacher.name}</span
										>
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,21.25rem),1fr))] gap-4">
		<section
			id="murid"
			class="lms-card flex min-w-0 scroll-mt-21 flex-col gap-3 rounded-xl! p-5 shadow-none! min-[1180px]:col-span-2"
		>
			<div class="flex flex-wrap items-start justify-between gap-3">
				{@render sectionHead(
					i18n.t('dashboard.principal.at_risk'),
					i18n.t('dashboard.principal.at_risk_hint')
				)}
				{@render chips(
					[
						{
							key: 'all',
							label: i18n.t('dashboard.principal.risk_all', { count: sample.risks.length })
						},
						{ key: 'nil', label: i18n.t('dashboard.principal.risk_score') },
						{ key: 'abs', label: i18n.t('dashboard.principal.risk_absence') }
					],
					riskFilter,
					(key) => {
						riskFilter = key;
						riskOpen = -1;
					},
					i18n.t('dashboard.principal.at_risk')
				)}
			</div>
			<ul>
				{#each risks as risk, index (risk.name)}
					{@const open = riskOpen === index}
					{@const wasAsked = asked.includes(risk.name)}
					<li class="border-lms-border border-t">
						<button
							type="button"
							class="lms-focus-ring flex w-full flex-wrap items-center gap-3 py-3 text-left"
							aria-expanded={open}
							onclick={() => (riskOpen = open ? -1 : index)}
						>
							<span class="flex min-w-0 flex-[1_1_11.25rem] flex-col gap-0.5">
								<span class="text-sm font-semibold">{risk.name}</span>
								<span class="text-lms-muted text-xs"
									>{i18n.t('dashboard.principal.risk_meta', {
										class: risk.className,
										homeroom: risk.homeroom
									})}</span
								>
							</span>
							<span class="flex flex-wrap gap-1.5">
								{#if risk.average < sample.kkm}
									<span class="lms-tone-warning rounded-full px-2.5 py-0.75 text-[11px] font-bold"
										>{i18n.t('dashboard.principal.tag_score', { value: risk.average })}</span
									>
								{/if}
								{#if risk.absentDays >= RISK_ABSENCE_DAYS}
									<span class="lms-tone-danger rounded-full px-2.5 py-0.75 text-[11px] font-bold"
										>{i18n.t('dashboard.principal.tag_absent', { count: risk.absentDays })}</span
									>
								{/if}
							</span>
							<span class="text-lms-muted"
								><Icon icon={open ? ChevronUp : ChevronDown} size="sm" /></span
							>
						</button>
						{#if open}
							<div class="flex flex-wrap items-end gap-4 pb-3.5">
								<dl class="grid flex-[1_1_16.25rem] grid-cols-3 gap-2">
									{#each [{ key: 'risk_average', value: String(risk.average) }, { key: 'risk_absent', value: i18n.t( 'dashboard.principal.days', { count: risk.absentDays } ) }, { key: 'risk_weak', value: risk.weakSubjects }] as stat (stat.key)}
										<div class="bg-lms-background flex flex-col gap-0.5 rounded-lg p-2.5">
											<dt class="text-lms-muted text-[11px]">
												{i18n.t(`dashboard.principal.${stat.key}`)}
											</dt>
											<dd class="text-[0.9375rem] font-bold">{stat.value}</dd>
										</div>
									{/each}
								</dl>
								<div class="flex flex-[1_1_13.75rem] flex-col gap-2">
									<span class="text-lms-muted text-xs">
										{wasAsked
											? i18n.t('dashboard.principal.follow_sent', { homeroom: risk.homeroom })
											: i18n.t('dashboard.principal.follow_none')}
									</span>
									<button
										type="button"
										class={[
											'lms-focus-ring flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-[0.8125rem] font-semibold',
											wasAsked ? 'lms-tone-success' : 'lms-action-primary'
										]}
										onclick={() => ask(risk)}
									>
										<Icon icon={wasAsked ? Check : Send} size="sm" />
										{wasAsked
											? i18n.t('dashboard.principal.ask_sent')
											: i18n.t('dashboard.principal.ask_follow')}
									</button>
								</div>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
		<section
			id="pengumuman"
			class="lms-card flex scroll-mt-21 flex-col gap-3 rounded-xl! p-5 shadow-none!"
		>
			<div class="flex flex-wrap items-center justify-between gap-2.5">
				{@render sectionHead(i18n.t('dashboard.principal.agenda_announcements'))}
				{@render segmented(
					[
						{ key: 'agenda', label: i18n.t('dashboard.principal.tab_agenda') },
						{ key: 'announcements', label: i18n.t('dashboard.principal.tab_announcements') }
					],
					agendaTab,
					(key) => (agendaTab = key),
					i18n.t('dashboard.principal.agenda_announcements')
				)}
			</div>
			<ul>
				{#each agendaTab === 'agenda' ? sample.agenda : sample.announcements as item (item.title)}
					<li class="border-lms-border flex items-start gap-3 border-t py-2.5">
						<span class="text-lms-interactive w-14 flex-none pt-0.5 font-mono text-xs font-semibold"
							>{item.date}</span
						>
						<span class="flex min-w-0 flex-col gap-0.5">
							<span class="text-sm font-semibold">{item.title}</span>
							<span class="text-lms-muted text-xs leading-4.5">{item.detail}</span>
						</span>
					</li>
				{/each}
			</ul>
			<p class="text-lms-muted mt-auto flex items-center gap-1.5 text-xs">
				<Icon icon={Lock} size="sm" />{i18n.t('dashboard.principal.announcements_by_admin')}
			</p>
		</section>
	</div>

	<Toast message={visibleToast?.message ?? null} icon={visibleToast?.icon} />
</div>
