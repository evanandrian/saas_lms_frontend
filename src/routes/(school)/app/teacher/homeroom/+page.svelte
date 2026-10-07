<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import SampleBadge from '$lib/features/dashboards/components/SampleBadge.svelte';
	import { greetingParts } from '$lib/features/dashboards/dashboards.model';
	import { useI18n } from '$lib/i18n';
	import { formatHourMinute, formatLongDate, greetingPeriod } from '$lib/utils/clock';
	import { createDashboardClock } from '$lib/utils/dashboard-clock.svelte';
	import type { LucideIcon } from '@lucide/svelte';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import BellRing from '@lucide/svelte/icons/bell-ring';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import CalendarX from '@lucide/svelte/icons/calendar-x';
	import Check from '@lucide/svelte/icons/check';
	import CheckCheck from '@lucide/svelte/icons/check-check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleDashed from '@lucide/svelte/icons/circle-dashed';
	import Dot from '@lucide/svelte/icons/dot';
	import Filter from '@lucide/svelte/icons/filter';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import Lock from '@lucide/svelte/icons/lock';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Send from '@lucide/svelte/icons/send';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import {
		homeroomSample as sample,
		type AttendanceCode,
		type BehaviorNoteSample,
		type NoteCategory
	} from './homeroom.sample';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const uid = $props.id();
	const TOAST_SECONDS = 5;
	/** Batas keputusan pengajuan orang tua: 72 jam (3 hari kerja), sama dengan Kotak Persetujuan. */
	const SLA_HOURS = 72;
	const HOURS_PER_DAY = 24;
	/** Simulasi referensi: guru mapel memfinalkan nilai 3 detik setelah diingatkan. */
	const REMIND_FINALIZE_MS = 3000;
	/** Ambang "perlu perhatian" (referensi): rata-rata < 78, ≥ 2 mapel < KKM, atau alpa ≥ 2 hari. */
	const ATTENTION_AVERAGE = 78;
	const ATTENTION_LOW_SUBJECTS = 2;
	const ATTENTION_ABSENT = 2;
	const ATTENDANCE_WARN_PERCENT = 90;
	const NOTE_MIN_LENGTH = 10;
	const ATTENDANCE_CODES: readonly AttendanceCode[] = ['H', 'S', 'I', 'A', 'T'];
	const CODE_CLASSES: Record<AttendanceCode, string> = {
		H: 'bg-lms-progress border-lms-progress text-lms-on-interactive',
		S: 'bg-lms-interactive border-lms-interactive text-lms-on-interactive',
		I: 'bg-lms-warning-subtle border-lms-warning-text text-lms-warning-text',
		A: 'bg-lms-danger-text border-lms-danger-text text-lms-on-interactive',
		T: 'bg-lms-warning-text border-lms-warning-text text-lms-on-interactive'
	};
	const ROW_TINT: Partial<Record<AttendanceCode, string>> = {
		S: 'bg-lms-interactive-subtle',
		I: 'bg-lms-warning-subtle',
		A: 'bg-lms-danger-subtle',
		T: 'bg-lms-warning-subtle'
	};
	const NOTE_DOT: Record<NoteCategory, string> = {
		positive: 'bg-lms-progress',
		attention: 'bg-lms-scale-mid',
		counseling: 'bg-lms-interactive'
	};
	const NOTE_CATEGORIES: readonly NoteCategory[] = ['positive', 'attention', 'counseling'];

	const clock = createDashboardClock(() => null);
	const total = sample.students.length;
	let attendance = $state<Record<number, AttendanceCode>>({ ...sample.attendance });
	let savedAt = $state<string | null>(null);
	let attendanceTab = $state<'today' | 'recap'>('today');
	let lowOnly = $state(false);
	let sort = $state<'no' | 'avg'>('no');
	let threads = $state(
		sample.threads.map((thread) => ({ ...thread, messages: [...thread.messages] }))
	);
	let threadIndex = $state(0);
	let read = $state<number[]>([...sample.readThreads]);
	let reply = $state('');
	let subjectsDone = $state<number[]>([...sample.subjectsDone]);
	let reminded = $state<number[]>([]);
	let notesDone = $state(sample.homeroomNotesDone);
	let reportSubmitted = $state(false);
	let notes = $state<BehaviorNoteSample[]>([...sample.notes]);
	let noteFilter = $state<'all' | NoteCategory>('all');
	let noteStudent = $state('');
	let noteCategory = $state<NoteCategory>('attention');
	let noteText = $state('');
	let notifyParent = $state(true);
	let noteTried = $state(false);
	let scheduleDay = $state(sample.todayDay);
	let toast = $state<{ message: string; icon: LucideIcon; until: number } | null>(null);

	const live = $derived(data.live);
	const dateLocale = $derived(i18n.locale === 'en' ? 'en-US' : 'id-ID');
	const className = $derived(live?.homeroom_class?.name ?? sample.className);
	const greetingName = $derived.by(() => {
		if (!live) return 'Bu Rina';
		const { name, honorific } = greetingParts(live.viewer);
		return honorific ? i18n.t(`dashboard.honorific.${honorific}`, { name }) : name;
	});
	const visibleToast = $derived(toast && clock.elapsed < toast.until ? toast : null);

	function notify(message: string, icon: LucideIcon = CircleCheck) {
		toast = {
			message: `${message} ${i18n.t('dashboard.sample.simulation_note')}`,
			icon,
			until: clock.elapsed + TOAST_SECONDS
		};
	}

	const filled = $derived(Object.keys(attendance).length);
	const complete = $derived(filled === total);
	const countOf = (code: AttendanceCode) =>
		Object.values(attendance).filter((value) => value === code).length;
	const notPresent = $derived(total - countOf('H') - countOf('T'));
	const unread = $derived(
		threads.filter(
			(thread, index) => !read.includes(index) && thread.messages.at(-1)?.from === 'parent'
		).length
	);
	const average = (student: number) =>
		Math.round(
			sample.subjects.reduce((sum, _, subject) => sum + sample.score(student, subject), 0) /
				sample.subjects.length
		);
	const lowSubjects = (student: number) =>
		sample.subjects.filter((_, subject) => sample.score(student, subject) < sample.kkm);
	const gradeRows = $derived(
		sample.students
			.map((name, index) => ({ name, index, avg: average(index) }))
			.filter((row) => !lowOnly || lowSubjects(row.index).length > 0)
			.sort((a, b) => (sort === 'avg' ? a.avg - b.avg : a.index - b.index))
	);
	const attention = sample.students
		.map((name, index) => ({
			name,
			avg: average(index),
			low: lowSubjects(index).length,
			absent: sample.absences(index).absent
		}))
		.filter(
			(row) =>
				row.avg < ATTENTION_AVERAGE ||
				row.low >= ATTENTION_LOW_SUBJECTS ||
				row.absent >= ATTENTION_ABSENT
		);
	const reportReady = $derived(
		subjectsDone.length === sample.subjectsFull.length && notesDone === total
	);
	const reportPercent = $derived(
		Math.round(
			((subjectsDone.length + notesDone / total + 1) / (sample.subjectsFull.length + 2)) * 100
		)
	);
	const reportStatus = $derived(reportSubmitted ? 'pending' : reportReady ? 'ready' : 'drafting');
	const noteError = $derived(
		noteTried
			? !noteStudent
				? i18n.t('dashboard.homeroom.note_pick_student')
				: noteText.trim().length < NOTE_MIN_LENGTH
					? i18n.t('dashboard.homeroom.note_min', { count: NOTE_MIN_LENGTH })
					: ''
			: ''
	);
	const thread = $derived(threads[threadIndex]);
	const firstName = (name: string) => name.split(' ')[0] ?? name;

	const slaLabel = (hoursAgo: number) => {
		const left = SLA_HOURS - hoursAgo;
		if (left < 0) return { label: i18n.t('dashboard.homeroom.sla_over'), tone: 'lms-tone-danger' };
		if (left < HOURS_PER_DAY)
			return {
				label: i18n.t('dashboard.homeroom.sla_hours', { count: Math.ceil(left) }),
				tone: 'lms-tone-warning'
			};
		return {
			label: i18n.t('dashboard.homeroom.sla_days', { count: Math.floor(left / HOURS_PER_DAY) }),
			tone: 'bg-lms-background text-lms-foreground'
		};
	};

	const checklist = $derived([
		{
			done: savedAt !== null,
			label: i18n.t('dashboard.homeroom.task_attendance'),
			detail: savedAt
				? i18n.t('dashboard.homeroom.task_attendance_saved', { time: savedAt })
				: i18n.t('dashboard.homeroom.task_attendance_progress', { filled, total }),
			target: 'presensi'
		},
		{
			done: sample.parentRequests.length === 0,
			label: i18n.t('dashboard.homeroom.task_requests'),
			detail: sample.parentRequests.length
				? i18n.t('dashboard.homeroom.task_requests_waiting', {
						count: sample.parentRequests.length
					})
				: i18n.t('dashboard.homeroom.task_requests_done'),
			target: 'persetujuan'
		},
		{
			done: unread === 0,
			label: i18n.t('dashboard.homeroom.task_liaison'),
			detail: unread
				? i18n.t('dashboard.homeroom.task_liaison_unread', { count: unread })
				: i18n.t('dashboard.homeroom.task_liaison_done'),
			target: 'buku-penghubung'
		},
		{
			done: false,
			label: i18n.t('dashboard.homeroom.task_report'),
			detail: reportSubmitted
				? i18n.t('dashboard.homeroom.report_status_pending').toLowerCase()
				: i18n.t('dashboard.homeroom.task_report_progress', {
						done: subjectsDone.length,
						total: sample.subjectsFull.length
					}),
			target: 'rapor'
		}
	]);

	function markRest() {
		const next = { ...attendance };
		sample.students.forEach((_, index) => {
			next[index + 1] ??= 'H';
		});
		attendance = next;
	}

	function saveAttendance() {
		if (!complete || savedAt) return;
		savedAt = formatHourMinute(clock.nowSeconds);
		notify(
			i18n.t('dashboard.homeroom.toast_attendance', { class: className, count: notPresent }),
			CalendarCheck
		);
	}

	function pickThread(index: number) {
		threadIndex = index;
		if (!read.includes(index)) read = [...read, index];
	}

	function sendReply() {
		const text = reply.trim();
		if (!text || !thread) return;
		threads = threads.map((item, index) =>
			index === threadIndex
				? {
						...item,
						messages: [
							...item.messages,
							{ from: 'teacher', text, time: i18n.t('dashboard.homeroom.just_now') }
						]
					}
				: item
		);
		if (!read.includes(threadIndex)) read = [...read, threadIndex];
		reply = '';
		notify(i18n.t('dashboard.homeroom.toast_reply', { name: thread.parent }), Send);
	}

	function remindSubject(index: number, subject: string, teacher: string) {
		reminded = [...reminded, index];
		notify(i18n.t('dashboard.homeroom.toast_remind', { name: teacher }), BellRing);
		setTimeout(() => {
			if (!subjectsDone.includes(index)) subjectsDone = [...subjectsDone, index];
			notify(i18n.t('dashboard.homeroom.toast_finalized', { subject, name: teacher }), CircleCheck);
		}, REMIND_FINALIZE_MS);
	}

	function draftNotes() {
		notesDone = total;
		notify(i18n.t('dashboard.homeroom.toast_draft', { count: sample.draftNotesFor }), Sparkles);
	}

	function submitReport() {
		if (!reportReady || reportSubmitted) return;
		reportSubmitted = true;
		notify(i18n.t('dashboard.homeroom.toast_report', { class: className }), Send);
	}

	function noteFollowUp(name: string) {
		noteStudent = name;
		noteCategory = 'attention';
		document.getElementById('catatan')?.scrollIntoView({ behavior: 'smooth' });
	}

	function addNote() {
		if (!noteStudent || noteText.trim().length < NOTE_MIN_LENGTH) {
			noteTried = true;
			return;
		}
		notes = [
			{
				student: noteStudent,
				category: noteCategory,
				date: sample.noteDate,
				text: noteText.trim(),
				notified: notifyParent
			},
			...notes
		];
		notify(
			notifyParent
				? i18n.t('dashboard.homeroom.toast_note_notified', { name: noteStudent })
				: i18n.t('dashboard.homeroom.toast_note', { name: noteStudent }),
			NotebookPen
		);
		noteText = '';
		noteStudent = '';
		noteTried = false;
		noteFilter = 'all';
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
					'lms-focus-ring h-7.5 rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap',
					option.key === current
						? 'bg-lms-surface text-lms-foreground shadow-[0_1px_3px_rgba(15,24,56,.16)]'
						: 'text-lms-muted'
				]}
				onclick={() => onpick(option.key)}>{option.label}</button
			>
		{/each}
	</div>
{/snippet}

{#snippet heading(id: string, title: string, subtitle?: string)}
	<div class="min-w-0">
		<h2 {id} class="flex flex-wrap items-center gap-2 text-base font-bold">
			{title}<SampleBadge />
		</h2>
		{#if subtitle}<p class="text-lms-muted text-[0.8125rem]">{subtitle}</p>{/if}
	</div>
{/snippet}

<!-- Struktur, interaksi & data contoh mengikuti FLIXARE App v3.html layar 06b Dashboard Wali Kelas. -->
<div class="flex min-w-0 flex-col gap-5">
	<HeroBanner
		eyebrow={[
			formatLongDate(sample.date, dateLocale),
			i18n.t('dashboard.homeroom.eyebrow', { class: className, count: total })
		].join(' · ')}
		title={i18n.t(`dashboard.greeting.${greetingPeriod(clock.nowSeconds)}`, { name: greetingName })}
		description={`${savedAt ? i18n.t('dashboard.homeroom.hero_saved') : i18n.t('dashboard.homeroom.hero_unsaved')} ${i18n.t(
			'dashboard.homeroom.hero_rest',
			{ requests: sample.parentRequests.length, unread }
		)}`}
	>
		{#snippet actions()}
			<a
				href="#presensi"
				class="btn btn-base bg-lms-on-hero text-lms-brand-deep-neutral hover:bg-lms-on-hero/90 lms-focus-ring gap-2"
			>
				<Icon icon={CalendarCheck} size="sm" />
				{savedAt
					? i18n.t('dashboard.homeroom.view_attendance')
					: i18n.t('dashboard.homeroom.fill_attendance')}
			</a>
			<Button
				variant="on-hero-outline"
				onclick={() => notify(i18n.t('dashboard.homeroom.toast_open_approvals'), InboxIcon)}
			>
				<Icon icon={InboxIcon} size="sm" />{i18n.t('dashboard.homeroom.approvals')}
			</Button>
		{/snippet}
		{#snippet aside()}
			<section class="lms-hero-raised flex flex-col gap-1 p-5" aria-labelledby="{uid}-tasks">
				<h2
					id="{uid}-tasks"
					class="text-lms-on-hero-muted mb-1.5 flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] uppercase"
				>
					{i18n.t('dashboard.homeroom.today_tasks')}<SampleBadge tone="on-hero" />
				</h2>
				{#each checklist as task (task.target)}
					<a
						href="#{task.target}"
						class="border-lms-on-hero/12 text-lms-on-hero lms-focus-ring flex items-center gap-3 border-t py-2.5"
					>
						<span
							class={[
								'flex size-6 flex-none items-center justify-center rounded-full text-[13px]',
								task.done ? 'bg-lms-progress' : 'border-lms-on-hero/40 border-[1.5px]'
							]}
						>
							<Icon icon={task.done ? Check : Dot} size="sm" />
						</span>
						<span class="flex min-w-0 flex-1 flex-col gap-px">
							<span class={['text-sm font-semibold', task.done && 'line-through']}
								>{task.label}</span
							>
							<span class="text-lms-on-hero-muted text-xs">{task.detail}</span>
						</span>
						<span class="text-lms-on-hero-muted"><Icon icon={ChevronRight} size="sm" /></span>
					</a>
				{/each}
			</section>
		{/snippet}
	</HeroBanner>

	<section
		id="presensi"
		class="lms-card flex scroll-mt-21 flex-col gap-4 rounded-xl! p-5 shadow-none!"
		aria-labelledby="{uid}-att"
	>
		<div class="flex flex-wrap items-start justify-between gap-3">
			{@render heading(
				`${uid}-att`,
				i18n.t('dashboard.homeroom.attendance', { class: className }),
				attendanceTab === 'today'
					? i18n.t('dashboard.homeroom.attendance_today_hint', {
							date: formatLongDate(sample.date, dateLocale),
							time: sample.firstPeriod
						})
					: i18n.t('dashboard.homeroom.attendance_recap_hint', {
							month: sample.recapMonth,
							days: sample.schoolDays
						})
			)}
			{@render segmented(
				[
					{ key: 'today', label: i18n.t('dashboard.homeroom.tab_today') },
					{ key: 'recap', label: i18n.t('dashboard.homeroom.tab_recap') }
				],
				attendanceTab,
				(key) => (attendanceTab = key),
				i18n.t('dashboard.homeroom.attendance', { class: className })
			)}
		</div>
		{#if attendanceTab === 'today'}
			<div class="flex flex-wrap items-center gap-2.5">
				{#each [{ key: 'present', count: countOf('H') + countOf('T'), tone: 'bg-lms-success-subtle' }, { key: 'sick', count: countOf('S'), tone: 'bg-lms-interactive-subtle' }, { key: 'permit', count: countOf('I'), tone: 'bg-lms-warning-subtle' }, { key: 'absent', count: countOf('A'), tone: 'bg-lms-danger-subtle' }, { key: 'unset', count: total - filled, tone: 'bg-lms-background' }] as stat (stat.key)}
					<span
						class={[
							'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.8125rem]',
							stat.tone
						]}
					>
						<b class="tabular-nums">{stat.count}</b>{i18n.t(`dashboard.homeroom.count_${stat.key}`)}
					</span>
				{/each}
				<span class="flex-1"></span>
				<button
					type="button"
					class="border-lms-input-border bg-lms-surface lms-focus-ring flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-[0.8125rem] font-semibold"
					onclick={markRest}
				>
					<span class="text-lms-interactive"><Icon icon={CheckCheck} size="sm" /></span>{i18n.t(
						'dashboard.homeroom.mark_rest'
					)}
				</button>
			</div>
			<ol class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16.875rem),1fr))] gap-2">
				{#each sample.students as name, index (name)}
					{@const id = index + 1}
					{@const current = attendance[id]}
					<li
						class={[
							'flex items-center gap-2.5 rounded-[10px] border px-2.5 py-2',
							current ? 'border-lms-border' : 'border-lms-input-border',
							current && current !== 'H' ? ROW_TINT[current] : 'bg-lms-surface'
						]}
					>
						<span class="text-lms-muted w-5.5 font-mono text-[11px]">{id}</span>
						<span class="flex min-w-0 flex-1 flex-col">
							<span class="truncate text-[0.8125rem] font-semibold">{name}</span>
							<span class="text-lms-muted truncate text-[11px]">
								{sample.attendanceNotes[id] ??
									(current
										? i18n.t(`dashboard.homeroom.code_${current}`)
										: i18n.t('dashboard.homeroom.not_recorded'))}
							</span>
						</span>
						<span class="flex gap-0.75" role="group" aria-label={name}>
							{#each ATTENDANCE_CODES as code (code)}
								<button
									type="button"
									title={i18n.t(`dashboard.homeroom.code_${code}`)}
									aria-label="{name}: {i18n.t(`dashboard.homeroom.code_${code}`)}"
									aria-pressed={current === code}
									class={[
										'lms-focus-ring size-7 rounded-md border p-0 text-[11px] font-bold',
										current === code
											? CODE_CLASSES[code]
											: 'border-lms-input-border bg-lms-surface text-lms-muted'
									]}
									onclick={() => {
										attendance = { ...attendance, [id]: code };
										savedAt = null;
									}}>{code}</button
								>
							{/each}
						</span>
					</li>
				{/each}
			</ol>
			<div class="border-lms-border flex flex-wrap items-center gap-3 border-t pt-3">
				<span
					class={[
						'flex-[1_1_15rem] text-[0.8125rem]',
						savedAt ? 'text-lms-success-text' : complete ? 'text-lms-foreground' : 'text-lms-muted'
					]}
					aria-live="polite"
				>
					{savedAt
						? i18n.t('dashboard.homeroom.save_done', { time: savedAt })
						: complete
							? i18n.t('dashboard.homeroom.save_complete')
							: i18n.t('dashboard.homeroom.save_left', { count: total - filled })}
				</span>
				<button
					type="button"
					class={[
						'lms-focus-ring flex h-10.5 items-center gap-2 rounded-[10px] px-4.5 text-sm font-bold',
						complete && !savedAt
							? 'lms-action-primary'
							: 'bg-lms-background text-lms-muted cursor-default'
					]}
					aria-disabled={!complete || savedAt !== null}
					onclick={saveAttendance}
				>
					<Icon icon={Save} size="sm" />{savedAt
						? i18n.t('dashboard.homeroom.saved')
						: i18n.t('dashboard.homeroom.save')}
				</button>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full min-w-140 text-[0.8125rem] tabular-nums">
					<thead class="bg-lms-background text-lms-muted font-mono text-[11px] uppercase">
						<tr>
							<th class="rounded-s-lg px-2.5 py-2 text-left font-normal"
								>{i18n.t('dashboard.homeroom.recap_student', { month: sample.recapMonth })}</th
							>
							{#each ['present', 'sick', 'permit', 'absent', 'late', 'rate'] as col (col)}
								<th class="px-2 py-2 text-left font-normal last:rounded-e-lg"
									>{i18n.t(`dashboard.homeroom.recap_${col}`)}</th
								>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each sample.students as name, index (name)}
							{@const counts = sample.absences(index)}
							{@const present = sample.schoolDays - counts.sick - counts.permit - counts.absent}
							{@const rate = Math.round((present / sample.schoolDays) * 100)}
							<tr class="border-lms-border border-b">
								<td class="px-2.5 py-2.25 font-semibold">{name}</td>
								<td class="px-2">{present}</td>
								<td class="px-2">{counts.sick}</td>
								<td class="px-2">{counts.permit}</td>
								<td class={['px-2', counts.absent && 'text-lms-danger-text font-bold']}
									>{counts.absent}</td
								>
								<td class="px-2">{counts.late}</td>
								<td
									class={[
										'px-2 font-bold',
										rate < ATTENDANCE_WARN_PERCENT && 'text-lms-warning-text'
									]}>{rate}%</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,21.25rem),1fr))] gap-4">
		<section
			id="persetujuan"
			class="lms-card flex scroll-mt-21 flex-col gap-1.5 rounded-xl! p-5 shadow-none!"
			aria-labelledby="{uid}-req"
		>
			<div class="mb-1.5 flex items-baseline justify-between gap-2">
				{@render heading(`${uid}-req`, i18n.t('dashboard.homeroom.parent_requests'))}
				<button
					type="button"
					class="text-lms-link lms-focus-ring text-[0.8125rem] font-semibold whitespace-nowrap"
					onclick={() => notify(i18n.t('dashboard.homeroom.toast_open_approvals'), InboxIcon)}
				>
					{i18n.t('dashboard.homeroom.open_all', { count: sample.parentRequests.length })}
				</button>
			</div>
			<ul>
				{#each sample.parentRequests.slice(0, 3) as request (request.title)}
					{@const sla = slaLabel(request.hoursAgo)}
					<li class="border-lms-border flex items-center gap-3 border-t py-2.5">
						<span
							class="bg-lms-background text-lms-interactive flex size-8.5 flex-none items-center justify-center rounded-lg"
						>
							<Icon icon={request.kind === 'leave' ? CalendarX : GraduationCap} size="sm" />
						</span>
						<span class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="text-sm font-semibold">{request.title}</span>
							<span class="text-lms-muted truncate text-xs"
								>{request.requester} · {request.detail}</span
							>
						</span>
						<span
							class={[
								'rounded-full px-2.5 py-0.75 text-[11px] font-bold whitespace-nowrap',
								sla.tone
							]}>{sla.label}</span
						>
					</li>
				{:else}
					<li class="border-lms-border text-lms-muted border-t py-3 text-[0.8125rem]">
						{i18n.t('dashboard.homeroom.no_requests')}
					</li>
				{/each}
			</ul>
		</section>
		<section
			id="buku-penghubung"
			class="lms-card flex scroll-mt-21 flex-col gap-3 rounded-xl! p-5 shadow-none!"
			aria-labelledby="{uid}-liaison"
		>
			<div class="flex items-baseline justify-between gap-2">
				{@render heading(`${uid}-liaison`, i18n.t('dashboard.homeroom.liaison'))}
				<span class="text-lms-muted text-xs whitespace-nowrap"
					>{i18n.t('dashboard.homeroom.unread', { count: unread })}</span
				>
			</div>
			<div
				class="flex gap-1.5 overflow-x-auto pb-0.5"
				role="group"
				aria-label={i18n.t('dashboard.homeroom.liaison')}
			>
				{#each threads as item, index (item.parent)}
					{@const hasDot = !read.includes(index) && item.messages.at(-1)?.from === 'parent'}
					<button
						type="button"
						aria-pressed={index === threadIndex}
						class={[
							'lms-focus-ring flex h-8.5 flex-none items-center gap-1.5 rounded-full border-[1.5px] px-3 text-xs font-semibold',
							index === threadIndex
								? 'border-lms-interactive bg-lms-interactive-subtle'
								: 'border-lms-input-border bg-lms-surface'
						]}
						onclick={() => pickThread(index)}
					>
						{#if hasDot}<span class="bg-lms-danger-text size-1.75 rounded-full" aria-hidden="true"
							></span>{/if}
						{firstName(item.student)} · {firstName(item.parent)}
					</button>
				{/each}
			</div>
			{#if thread}
				<ol
					class="flex max-h-65 min-h-35 flex-col gap-2 overflow-y-auto px-0.5 py-1"
					aria-live="polite"
				>
					{#each thread.messages as message, index (index)}
						<li
							class={[
								'flex max-w-[85%] flex-col gap-0.75',
								message.from === 'parent' ? 'self-start' : 'self-end'
							]}
						>
							<span
								class={[
									'rounded-xl px-3 py-2.25 text-[0.8125rem] leading-4.75',
									message.from === 'parent' ? 'bg-lms-background' : 'lms-action-primary'
								]}
							>
								{message.text}
							</span>
							<span
								class={[
									'text-lms-muted text-[11px]',
									message.from === 'parent' ? 'text-left' : 'text-right'
								]}
							>
								{message.from === 'parent'
									? i18n.t('dashboard.homeroom.from_parent', {
											name: thread.parent,
											student: firstName(thread.student),
											time: message.time
										})
									: i18n.t('dashboard.homeroom.from_you', { time: message.time })}
							</span>
						</li>
					{/each}
				</ol>
				<form
					class="flex gap-2"
					onsubmit={(event) => {
						event.preventDefault();
						sendReply();
					}}
				>
					<label class="min-w-0 flex-1">
						<span class="sr-only"
							>{i18n.t('dashboard.homeroom.reply_to', { name: thread.parent })}</span
						>
						<input
							bind:value={reply}
							placeholder={i18n.t('dashboard.homeroom.reply_to', { name: thread.parent })}
							class="input lms-input lms-focus-ring h-10.5 text-sm"
						/>
					</label>
					<button
						type="submit"
						aria-label={i18n.t('dashboard.homeroom.send')}
						class={[
							'lms-focus-ring flex size-10.5 items-center justify-center rounded-[10px]',
							reply.trim() ? 'lms-action-primary' : 'bg-lms-input-border text-lms-on-interactive'
						]}
					>
						<Icon icon={Send} size="sm" />
					</button>
				</form>
			{/if}
		</section>
	</div>

	<section
		id="rekap-nilai"
		class="lms-card flex scroll-mt-21 flex-col gap-3.5 rounded-xl! p-5 shadow-none!"
		aria-labelledby="{uid}-grades"
	>
		<div class="flex flex-wrap items-start justify-between gap-3">
			{@render heading(
				`${uid}-grades`,
				i18n.t('dashboard.homeroom.grade_recap'),
				i18n.t('dashboard.homeroom.grade_recap_hint', { kkm: sample.kkm })
			)}
			<div class="flex flex-wrap items-center gap-2">
				<button
					type="button"
					aria-pressed={lowOnly}
					class={[
						'lms-focus-ring flex h-8 items-center gap-1.5 rounded-full border-[1.5px] px-3 text-xs font-semibold',
						lowOnly
							? 'border-lms-interactive bg-lms-interactive-subtle'
							: 'border-lms-input-border bg-lms-surface'
					]}
					onclick={() => (lowOnly = !lowOnly)}
				>
					<Icon icon={lowOnly ? Check : Filter} size="sm" />{i18n.t(
						'dashboard.homeroom.below_kkm_only'
					)}
				</button>
				{@render segmented(
					[
						{ key: 'no', label: i18n.t('dashboard.homeroom.sort_number') },
						{ key: 'avg', label: i18n.t('dashboard.homeroom.sort_lowest') }
					],
					sort,
					(key) => (sort = key),
					i18n.t('dashboard.homeroom.grade_recap')
				)}
			</div>
		</div>
		<div class="overflow-x-auto">
			<table
				class="border-lms-input-border w-full min-w-195 border-separate border-spacing-0 overflow-hidden rounded-md border text-[0.8125rem] tabular-nums"
			>
				<thead class="bg-lms-background text-[11px] font-bold">
					<tr>
						<th class="text-lms-muted w-45 px-3 py-2.5 text-left"
							>{i18n.t('dashboard.homeroom.col_student')}</th
						>
						{#each sample.subjects as subject (subject)}
							<th class="border-lms-border border-l px-1 py-2.5 text-center">{subject}</th>
						{/each}
						<th class="border-lms-border w-18 border-l px-1 py-2.5 text-center"
							>{i18n.t('dashboard.homeroom.col_average')}</th
						>
					</tr>
				</thead>
				<tbody>
					{#each gradeRows as row (row.name)}
						<tr>
							<td class="border-lms-border h-9.5 truncate border-t px-3">{row.name}</td>
							{#each sample.subjects as subject, column (subject)}
								{@const value = sample.score(row.index, column)}
								<td
									class={[
										'border-lms-border border-t border-l text-center',
										value < sample.kkm && 'bg-lms-danger-subtle text-lms-danger-text font-bold'
									]}>{value}</td
								>
							{/each}
							<td
								class={[
									'border-lms-border border-t border-l text-center font-bold',
									row.avg < sample.kkm && 'text-lms-danger-text'
								]}>{row.avg}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="text-lms-muted flex items-center gap-1.5 text-xs">
			<Icon icon={Lock} size="sm" />{i18n.t('dashboard.homeroom.grades_read_only')}
		</p>
	</section>

	<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,21.25rem),1fr))] gap-4">
		<section
			id="murid"
			class="lms-card flex scroll-mt-21 flex-col gap-1.5 rounded-xl! p-5 shadow-none!"
			aria-labelledby="{uid}-attn"
		>
			<div class="mb-1.5 flex items-baseline justify-between gap-2">
				{@render heading(`${uid}-attn`, i18n.t('dashboard.homeroom.attention'))}
				<span class="text-lms-muted text-xs whitespace-nowrap"
					>{i18n.t('dashboard.homeroom.students_count', { count: attention.length })}</span
				>
			</div>
			<ul>
				{#each attention as row (row.name)}
					<li class="border-lms-border flex flex-wrap items-center gap-3 border-t py-2.5">
						<span class="flex min-w-0 flex-[1_1_10rem] flex-col gap-0.75">
							<span class="text-sm font-semibold">{row.name}</span>
							<span class="flex flex-wrap gap-1.25">
								{#if row.low}<span
										class="lms-tone-warning rounded-full px-2 py-0.5 text-[11px] font-bold"
										>{i18n.t('dashboard.homeroom.tag_low', { count: row.low })}</span
									>{/if}
								{#if row.absent}<span
										class="lms-tone-danger rounded-full px-2 py-0.5 text-[11px] font-bold"
										>{i18n.t('dashboard.homeroom.tag_absent', { count: row.absent })}</span
									>{/if}
							</span>
						</span>
						<button
							type="button"
							class="border-lms-input-border bg-lms-surface lms-focus-ring flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold"
							onclick={() => noteFollowUp(row.name)}
						>
							<span class="text-lms-interactive"><Icon icon={NotebookPen} size="sm" /></span
							>{i18n.t('dashboard.homeroom.record_follow_up')}
						</button>
					</li>
				{/each}
			</ul>
		</section>
		<section
			id="rapor"
			class="lms-card flex scroll-mt-21 flex-col gap-3 rounded-xl! p-5 shadow-none!"
			aria-labelledby="{uid}-report"
		>
			<div class="flex items-start justify-between gap-2">
				{@render heading(
					`${uid}-report`,
					i18n.t('dashboard.homeroom.report'),
					i18n.t('dashboard.homeroom.report_hint', { date: sample.reportDeadline })
				)}
				<span
					class={[
						'rounded-full px-2.5 py-0.75 text-[11px] font-bold whitespace-nowrap uppercase',
						reportStatus === 'pending'
							? 'lms-tone-warning'
							: reportStatus === 'ready'
								? 'lms-tone-success'
								: 'bg-lms-background text-lms-muted'
					]}
				>
					{i18n.t(`dashboard.homeroom.report_status_${reportStatus}`)}
				</span>
			</div>
			<div class="bg-lms-background h-2 overflow-hidden rounded-full">
				<div
					class="bg-lms-interactive h-full rounded-full transition-[width] duration-400"
					style:width="{reportPercent}%"
				></div>
			</div>
			<ul class="flex flex-col text-[0.8125rem]">
				{#each sample.subjectsFull as [subject, teacher], index (subject)}
					{@const done = subjectsDone.includes(index)}
					{@const wasReminded = reminded.includes(index)}
					<li class="border-lms-border flex items-center gap-2.5 border-t py-1.75">
						<span class={done ? 'text-lms-success-text' : 'text-lms-warning-text'}
							><Icon icon={done ? CircleCheck : CircleDashed} size="sm" /></span
						>
						<span class="min-w-0 flex-1"
							>{subject} <span class="text-lms-muted">· {teacher}</span></span
						>
						{#if !done && !wasReminded}
							<button
								type="button"
								class="border-lms-input-border bg-lms-surface lms-focus-ring h-7 rounded-md border px-2.5 text-xs font-semibold"
								onclick={() => remindSubject(index, subject, teacher)}
								>{i18n.t('dashboard.homeroom.remind')}</button
							>
						{/if}
						<span
							class={[
								'text-xs font-semibold',
								done ? 'text-lms-success-text' : 'text-lms-warning-text'
							]}
						>
							{done
								? i18n.t('dashboard.homeroom.subject_done')
								: wasReminded
									? i18n.t('dashboard.homeroom.subject_reminded')
									: i18n.t('dashboard.homeroom.subject_pending')}
						</span>
					</li>
				{/each}
				<li class="border-lms-border flex items-center gap-2.5 border-t py-1.75">
					<span class={notesDone === total ? 'text-lms-success-text' : 'text-lms-warning-text'}
						><Icon icon={notesDone === total ? CircleCheck : CircleDashed} size="sm" /></span
					>
					<span class="flex-1"
						>{i18n.t('dashboard.homeroom.homeroom_notes', { done: notesDone, total })}</span
					>
					{#if notesDone < total}
						<button
							type="button"
							class="border-lms-input-border bg-lms-surface lms-focus-ring flex h-7 items-center gap-1.25 rounded-md border px-2.5 text-xs font-semibold"
							onclick={draftNotes}
						>
							<span class="text-lms-interactive"><Icon icon={Sparkles} size="sm" /></span>{i18n.t(
								'dashboard.homeroom.draft_notes'
							)}
						</button>
					{/if}
				</li>
				<li class="border-lms-border flex items-center gap-2.5 border-t py-1.75">
					<span class="text-lms-success-text"><Icon icon={CircleCheck} size="sm" /></span>
					<span class="flex-1">{i18n.t('dashboard.homeroom.attendance_recap_auto')}</span>
				</li>
			</ul>
			<p class="text-lms-muted text-xs leading-4.5">
				{reportSubmitted
					? i18n.t('dashboard.homeroom.report_msg_pending')
					: reportReady
						? i18n.t('dashboard.homeroom.report_msg_ready')
						: i18n.t('dashboard.homeroom.report_msg_incomplete')}
			</p>
			<button
				type="button"
				class={[
					'lms-focus-ring flex h-10.5 items-center justify-center gap-2 rounded-[10px] text-sm font-bold',
					reportReady && !reportSubmitted
						? 'lms-action-primary'
						: 'bg-lms-background text-lms-muted cursor-default'
				]}
				aria-disabled={!reportReady || reportSubmitted}
				onclick={submitReport}
			>
				<Icon icon={reportSubmitted ? BadgeCheck : Send} size="sm" />
				{reportSubmitted
					? i18n.t('dashboard.homeroom.report_submitted')
					: i18n.t('dashboard.homeroom.report_submit')}
			</button>
		</section>
	</div>

	<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,21.25rem),1fr))] gap-4">
		<section
			id="jadwal"
			class="lms-card flex scroll-mt-21 flex-col gap-3 rounded-xl! p-5 shadow-none!"
			aria-labelledby="{uid}-schedule"
		>
			<div class="flex flex-wrap items-center justify-between gap-2">
				{@render heading(
					`${uid}-schedule`,
					i18n.t('dashboard.homeroom.schedule', { class: className })
				)}
				{@render segmented(
					sample.scheduleDays.map((day) => ({ key: day, label: day })),
					scheduleDay,
					(key) => (scheduleDay = key),
					i18n.t('dashboard.homeroom.schedule', { class: className })
				)}
			</div>
			<ol>
				{#each (sample.schedule[scheduleDay] ?? [])
					.map((subject, index) => ({ subject, index }))
					.filter((slot) => slot.subject) as slot (slot.index)}
					{@const now = scheduleDay === sample.todayDay && slot.index === sample.currentPeriod}
					<li
						class={[
							'flex items-center gap-3 rounded-lg px-2.5 py-2',
							now && 'bg-lms-interactive-subtle shadow-[inset_3px_0_0_var(--color-lms-interactive)]'
						]}
					>
						<span class="text-lms-muted w-23 flex-none font-mono text-xs"
							>{sample.periods[slot.index]}</span
						>
						<span class="flex min-w-0 flex-1 flex-col">
							<span class="text-sm font-semibold">{slot.subject}</span>
							<span class="text-lms-muted text-xs">{sample.teacherOf[slot.subject] ?? ''}</span>
						</span>
						{#if now}<span
								class="lms-action-primary rounded-full px-2 py-0.5 text-[11px] font-bold uppercase"
								>{i18n.t('dashboard.homeroom.now')}</span
							>{/if}
					</li>
				{/each}
			</ol>
		</section>
		<section
			id="catatan"
			class="lms-card flex scroll-mt-21 flex-col gap-3 rounded-xl! p-5 shadow-none!"
			aria-labelledby="{uid}-notes"
		>
			<div class="flex flex-wrap items-center justify-between gap-2">
				{@render heading(`${uid}-notes`, i18n.t('dashboard.homeroom.behavior'))}
				<div
					class="flex flex-wrap gap-1.5"
					role="group"
					aria-label={i18n.t('dashboard.homeroom.behavior')}
				>
					{#each ['all', ...NOTE_CATEGORIES] as const as key (key)}
						<button
							type="button"
							aria-pressed={noteFilter === key}
							class={[
								'lms-focus-ring h-7 rounded-full border-[1.5px] px-2.5 text-[11px] font-semibold',
								noteFilter === key
									? 'border-lms-interactive bg-lms-interactive-subtle'
									: 'border-lms-input-border bg-lms-surface'
							]}
							onclick={() => (noteFilter = key)}
						>
							{key === 'all'
								? i18n.t('dashboard.homeroom.filter_all')
								: i18n.t(`dashboard.homeroom.filter_${key}`)}
						</button>
					{/each}
				</div>
			</div>
			<form
				class="bg-lms-background flex flex-col gap-2.5 rounded-xl p-3.5"
				onsubmit={(event) => {
					event.preventDefault();
					addNote();
				}}
				novalidate
			>
				<div class="flex flex-wrap gap-2">
					<label class="flex-[1_1_10rem]">
						<span class="sr-only">{i18n.t('dashboard.homeroom.pick_student')}</span>
						<select
							bind:value={noteStudent}
							class={[
								'input lms-input lms-focus-ring h-10 text-[0.8125rem]',
								noteTried && !noteStudent && 'border-lms-danger-text!'
							]}
							aria-invalid={noteTried && !noteStudent}
						>
							<option value="">{i18n.t('dashboard.homeroom.pick_student')}</option>
							{#each sample.students as name (name)}<option value={name}>{name}</option>{/each}
						</select>
					</label>
					{@render segmented(
						NOTE_CATEGORIES.map((key) => ({
							key,
							label: i18n.t(`dashboard.homeroom.filter_${key}`)
						})),
						noteCategory,
						(key) => (noteCategory = key),
						i18n.t('dashboard.homeroom.note_category')
					)}
				</div>
				<label>
					<span class="sr-only">{i18n.t('dashboard.homeroom.note_placeholder')}</span>
					<textarea
						bind:value={noteText}
						rows="2"
						placeholder={i18n.t('dashboard.homeroom.note_placeholder')}
						class={[
							'input lms-input lms-focus-ring min-h-16 resize-y py-2.5 text-[0.8125rem]',
							noteTried && noteText.trim().length < NOTE_MIN_LENGTH && 'border-lms-danger-text!'
						]}></textarea>
				</label>
				<div class="flex flex-wrap items-center gap-2.5">
					<label class="flex cursor-pointer items-center gap-2 text-[0.8125rem]">
						<input
							type="checkbox"
							bind:checked={notifyParent}
							class="accent-lms-interactive size-4.5"
						/>
						{i18n.t('dashboard.homeroom.notify_parent')}
					</label>
					<span class="text-lms-danger-text flex-1 text-xs" aria-live="polite">{noteError}</span>
					<button
						type="submit"
						class="lms-action-primary lms-focus-ring flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[0.8125rem] font-bold"
					>
						<Icon icon={Plus} size="sm" />{i18n.t('dashboard.homeroom.save_note')}
					</button>
				</div>
			</form>
			<ul>
				{#each notes.filter((note) => noteFilter === 'all' || note.category === noteFilter) as note (note.student + note.date + note.text)}
					<li class="border-lms-border flex items-start gap-3 border-t py-2.5">
						<span
							class={['mt-1.5 size-2 flex-none rounded-full', NOTE_DOT[note.category]]}
							aria-hidden="true"
						></span>
						<span class="flex min-w-0 flex-1 flex-col gap-0.75">
							<span class="text-[0.8125rem]"
								><b>{note.student}</b>
								<span class="text-lms-muted"
									>· {i18n.t(`dashboard.homeroom.category_${note.category}`)} · {note.date}</span
								></span
							>
							<span class="text-[0.8125rem] leading-4.75">{note.text}</span>
							{#if note.notified}
								<span class="text-lms-success-text flex items-center gap-1 text-[11px]"
									><Icon icon={Send} size="sm" />{i18n.t(
										'dashboard.homeroom.parent_notified'
									)}</span
								>
							{/if}
						</span>
					</li>
				{/each}
			</ul>
		</section>
	</div>

	<Toast message={visibleToast?.message ?? null} icon={visibleToast?.icon} />
</div>
