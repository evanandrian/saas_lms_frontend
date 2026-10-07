<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import UnavailableLink from '$lib/components/ui/UnavailableLink.svelte';
	import SampleBadge from '$lib/features/dashboards/components/SampleBadge.svelte';
	import { semesterKey } from '$lib/features/dashboards/dashboards.model';
	import { workspaceGreeting } from '$lib/features/workspace/workspace.model';
	import { useI18n } from '$lib/i18n';
	import { initialsOf } from '$lib/utils/initials';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Clock from '@lucide/svelte/icons/clock';
	import FileQuestionMark from '@lucide/svelte/icons/file-question-mark';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import Play from '@lucide/svelte/icons/play';
	import Plus from '@lucide/svelte/icons/plus';
	import Square from '@lucide/svelte/icons/square';
	import WandSparkles from '@lucide/svelte/icons/wand-sparkles';
	import type { LucideIcon } from '@lucide/svelte';
	import {
		formatHourMinute,
		formatLongDate,
		formatMinuteSecond,
		greetingPeriod
	} from '$lib/utils/clock';
	import { createDashboardClock } from '$lib/utils/dashboard-clock.svelte';
	import {
		agendaHours,
		buildGradebook,
		layoutAgenda,
		nextSessionMeta,
		nowLinePosition,
		secondsUntil,
		type AgendaKind
	} from './teacher-dashboard';
	import TeacherPanels from './TeacherPanels.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const reasonId = $props.id();
	const tabsId = `${reasonId}-tabs`;

	const TOAST_SECONDS = 6;
	/** Simulasi lobi (dev): murid bergabung bertahap seperti referensi. */
	const LOBBY_SIM_INITIAL = 2;
	const LOBBY_SIM_PER_SECOND = 3;
	const LOBBY_SIM_CAP = 29;
	const LOBBY_AVATAR_LIMIT = 8;
	const LOBBY_AVATAR_TONES = [
		'bg-lms-interactive',
		'bg-lms-progress',
		'bg-lms-interactive-hover',
		'bg-lms-brand-deep-neutral'
	];
	/** Tumpukan kertas: lapisan ke-2 tampil bila ≥ 2 lembar, ke-3 bila ≥ 4 (referensi). */
	const PILE_SECOND_LAYER = 2;
	const PILE_THIRD_LAYER = 4;

	const AGENDA_CARD_CLASSES: Record<AgendaKind, string> = {
		done: 'bg-lms-surface-muted border border-lms-border text-lms-muted',
		next: 'bg-lms-interactive border border-lms-interactive text-lms-on-interactive',
		open: 'bg-lms-interactive-subtle border border-lms-interactive/40 text-lms-foreground',
		later: 'bg-lms-surface border border-dashed border-lms-input-border text-lms-foreground'
	};

	const clock = createDashboardClock(() => data.dashboard?.clockStartSeconds ?? null);
	let lobbyOpenedAt = $state<number | null>(null);
	let gradedById = $state<Record<string, number>>({});
	let selectedClassIndex = $state(0);
	let toast = $state<{ message: string; icon: LucideIcon; until: number } | null>(null);

	const dashboard = $derived(data.dashboard);
	const elapsedSeconds = $derived(clock.elapsed);
	const nowSeconds = $derived(clock.nowSeconds);
	const toGrade = $derived(
		(dashboard?.toGrade ?? []).map((pile) => {
			const left = Math.max(0, pile.count - (gradedById[pile.id] ?? 0));
			return { ...pile, left };
		})
	);
	const gradeLeft = $derived(toGrade.reduce((sum, pile) => sum + pile.left, 0));
	const nextSession = $derived(dashboard?.nextSession ?? null);
	const toNext = $derived(nextSession ? secondsUntil(nextSession.startMinutes, nowSeconds) : 0);
	const agendaCards = $derived(layoutAgenda(dashboard?.agenda ?? []));
	const nowTop = $derived(nowLinePosition(nowSeconds));
	const selectedClass = $derived(dashboard?.gradebook[selectedClassIndex] ?? null);
	const gradebook = $derived(
		selectedClass && dashboard ? buildGradebook(selectedClass, dashboard.remedialThreshold) : null
	);
	const joined = $derived(
		lobbyOpenedAt === null
			? 0
			: Math.min(
					LOBBY_SIM_CAP,
					LOBBY_SIM_INITIAL + (elapsedSeconds - lobbyOpenedAt) * LOBBY_SIM_PER_SECOND
				)
	);
	const visibleToast = $derived(toast && elapsedSeconds < toast.until ? toast : null);
	const simulationNote = $derived(i18n.t('dashboard.sample.simulation_note'));
	// Sapaan & semester dari backend; data contoh (referensi) bila backend belum menjawab.
	// Sapaan dari profil user yang masuk (backend), bukan data contoh.
	const greetingName = $derived(workspaceGreeting(data.workspace, i18n.t));
	const semesterLabel = $derived.by(() => {
		if (!data.live) return dashboard?.semesterLabel ?? '';
		const key = semesterKey(data.live.period.semester);
		return key ? i18n.t(`dashboard.semester.${key}`) : '';
	});

	function showToast(message: string, icon: LucideIcon = CircleCheck) {
		toast = {
			message: `${message} ${simulationNote}`,
			icon,
			until: elapsedSeconds + TOAST_SECONDS
		};
	}

	function toggleLobby() {
		lobbyOpenedAt = lobbyOpenedAt === null ? elapsedSeconds : null;
	}

	function gradeOne(pile: { id: string; title: string; count: number; left: number }) {
		gradedById = { ...gradedById, [pile.id]: Math.min(pile.count, (gradedById[pile.id] ?? 0) + 1) };
		if (pile.left === 1) {
			showToast(i18n.t('dashboard.teacher.toast_all_graded', { title: pile.title }));
		}
	}

	function makeRemedial() {
		if (!gradebook || !selectedClass) return;
		showToast(
			i18n.t('dashboard.teacher.toast_remedial', {
				count: gradebook.lowCount,
				class: selectedClass.name
			}),
			WandSparkles
		);
	}

	function handleTabKeydown(event: KeyboardEvent) {
		const total = dashboard?.gradebook.length ?? 0;
		if (!total || (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')) return;
		event.preventDefault();
		const step = event.key === 'ArrowRight' ? 1 : -1;
		selectedClassIndex = (selectedClassIndex + step + total) % total;
		document.getElementById(`${tabsId}-tab-${selectedClassIndex}`)?.focus();
	}
</script>

<!-- Struktur & data contoh mengikuti FLIXARE App v3.html layar 06 + panel mapel (FE-07). -->
<div class="flex min-w-0 flex-col gap-5">
	{#if dashboard}
		{@const actionsDisabled = !data.canSimulate}
		<p id={reasonId} class="sr-only">{i18n.t('common.state.action_unavailable')}</p>

		<HeroBanner
			eyebrow={[formatLongDate(dashboard.date, 'id-ID'), semesterLabel].filter(Boolean).join(' · ')}
			title={i18n.t(`dashboard.greeting.${greetingPeriod(nowSeconds)}`, {
				name: greetingName
			})}
			description={i18n.t('dashboard.teacher.summary', {
				classes: data.panels.classCount,
				agenda: dashboard.agenda.length,
				pending: gradeLeft
			})}
			watermark="top"
		>
			{#snippet eyebrowTrail()}
				<span class="font-mono">{formatHourMinute(nowSeconds)} WIB</span>
			{/snippet}
			{#snippet actions()}
				<Button variant="on-hero" disabled aria-describedby={reasonId}>
					<Icon icon={Plus} size="sm" />{i18n.t('dashboard.teacher.create_task')}
				</Button>
				<Button variant="on-hero-outline" disabled aria-describedby={reasonId}>
					<Icon icon={FileQuestionMark} size="sm" />{i18n.t('dashboard.teacher.question_bank')}
				</Button>
			{/snippet}
			{#snippet aside()}
				{#if nextSession}
					<section
						class="lms-hero-raised flex flex-col gap-3.5 p-5"
						aria-label={i18n.t('dashboard.teacher.next')}
					>
						<p class="flex items-center justify-between gap-2">
							<span
								class="text-lms-on-hero-muted flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] uppercase"
							>
								{i18n.t('dashboard.teacher.next')}<SampleBadge tone="on-hero" />
							</span>
							<span
								class="bg-lms-progress/22 text-lms-on-hero-progress inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-semibold"
							>
								<Icon icon={Clock} size="sm" />
								{toNext > 0
									? i18n.t('dashboard.teacher.starts_in', { time: formatMinuteSecond(toNext) })
									: i18n.t('dashboard.teacher.in_progress')}
							</span>
						</p>
						<div>
							<h2 class="text-[1.375rem] leading-tight font-bold">{nextSession.title}</h2>
							<p class="text-lms-on-hero-muted mt-1 text-[0.8125rem]">
								{nextSessionMeta(nextSession, {
									questions: i18n.t('dashboard.teacher.questions', {
										count: nextSession.questionCount
									}),
									students: i18n.t('dashboard.teacher.students', {
										count: nextSession.studentCount
									})
								})}
							</p>
						</div>
						{#if lobbyOpenedAt !== null}
							<div class="bg-lms-on-hero/6 flex flex-col gap-2 rounded-xl p-3">
								<p class="flex items-center justify-between text-[0.8125rem]">
									<span class="flex items-center gap-2 font-semibold">
										<span
											class="bg-lms-on-hero-progress ring-lms-on-hero-progress/25 size-2 rounded-full ring-4"
											aria-hidden="true"
										></span>
										{i18n.t('dashboard.teacher.lobby_open')}
									</span>
									<span class="font-mono font-semibold" aria-live="polite">
										{i18n.t('dashboard.teacher.lobby_joined', {
											joined,
											total: nextSession.studentCount
										})}
									</span>
								</p>
								<div
									class="bg-lms-on-hero/12 h-1.5 overflow-hidden rounded-full"
									aria-hidden="true"
								>
									<div
										class="bg-lms-on-hero-progress h-full rounded-full transition-[width] duration-600 ease-out motion-reduce:transition-none"
										style:width="{Math.round((joined / nextSession.studentCount) * 100)}%"
									></div>
								</div>
								<div class="flex" aria-hidden="true">
									{#each dashboard.lobbyRoster.slice(0, Math.min(LOBBY_AVATAR_LIMIT, joined)) as name, index (name)}
										<span
											class={[
												'border-lms-hero -me-1.5 inline-flex size-6.5 items-center justify-center rounded-full border-2 text-[9px] font-bold',
												LOBBY_AVATAR_TONES[index % LOBBY_AVATAR_TONES.length]
											]}>{initialsOf(name)}</span
										>
									{/each}
								</div>
							</div>
						{/if}
						<div class="flex flex-wrap gap-2">
							<Button
								variant={lobbyOpenedAt === null ? 'on-hero' : 'on-hero-subtle'}
								disabled={actionsDisabled}
								aria-describedby={actionsDisabled ? reasonId : undefined}
								aria-pressed={lobbyOpenedAt !== null}
								onclick={toggleLobby}
							>
								<Icon icon={lobbyOpenedAt === null ? Play : Square} size="sm" />
								{lobbyOpenedAt === null
									? i18n.t('dashboard.teacher.open_lobby')
									: i18n.t('dashboard.teacher.close_lobby')}
							</Button>
							<Button variant="on-hero-outline" disabled aria-describedby={reasonId}>
								{i18n.t('dashboard.teacher.preview_questions')}
							</Button>
						</div>
					</section>
				{/if}
			{/snippet}
		</HeroBanner>

		<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,22.5rem),1fr))] gap-4">
			<section
				class="lms-card flex min-w-0 flex-col overflow-hidden rounded-xl! shadow-none!"
				aria-labelledby="{reasonId}-agenda"
			>
				<div class="border-lms-border flex items-center justify-between border-b px-5 py-4">
					<h2 id="{reasonId}-agenda" class="flex items-center gap-2 text-base font-bold">
						{i18n.t('dashboard.teacher.agenda')}<SampleBadge />
					</h2>
					<UnavailableLink
						label={i18n.t('dashboard.teacher.calendar')}
						note={i18n.t('common.workspace.not_available_yet')}
					/>
				</div>
				<div class="relative mt-2 mb-3 h-112">
					{#each agendaHours() as hour (hour)}
						<div class="border-lms-border flex h-14 border-t" aria-hidden="true">
							<span class="text-lms-muted w-14.5 flex-none ps-3.5 pt-1 font-mono text-[11px]"
								>{hour}</span
							>
						</div>
					{/each}
					<span class="bg-lms-interactive/45 absolute inset-y-0 left-15.5 w-0.5" aria-hidden="true"
					></span>
					{#if nowTop !== null}
						<div
							class="pointer-events-none absolute inset-x-0 left-2 z-0 flex items-center transition-[top] duration-1000 ease-linear"
							style:top="{nowTop}px"
							aria-hidden="true"
						>
							<span
								class="lms-action-destructive flex-none rounded-[3px] px-1.25 py-px font-mono text-[10px] font-semibold"
								>{formatHourMinute(nowSeconds)}</span
							>
							<span class="lms-action-destructive h-0.5 flex-1"></span>
						</div>
					{/if}
					<ol>
						{#each agendaCards as card (card.id)}
							<li
								class={[
									'absolute right-3.5 left-18.5 z-1 flex flex-col gap-1.5 overflow-hidden rounded-lg px-3 py-2 leading-tight',
									AGENDA_CARD_CLASSES[card.kind]
								]}
								style:top="{card.topPx}px"
								style:height="{card.heightPx}px"
							>
								<span class="flex items-baseline justify-between gap-2">
									<span
										class={['text-[0.8125rem] font-bold', card.kind === 'done' && 'line-through']}
									>
										{card.time} · {card.title}
									</span>
									<span class="text-[11px] font-semibold whitespace-nowrap">
										{card.kind === 'next' && nextSession && toNext > 0
											? i18n.t('dashboard.teacher.starts_in_minutes', {
													minutes: Math.ceil(toNext / 60)
												})
											: card.statusLabel}
									</span>
								</span>
								{#if card.showMeta}
									<span class="text-xs">{card.meta}</span>
								{/if}
							</li>
						{/each}
					</ol>
				</div>
			</section>

			<section
				class="lms-card flex min-w-0 flex-col gap-1 rounded-xl! px-5 py-4 shadow-none!"
				aria-labelledby="{reasonId}-pile"
			>
				<div class="mb-2.5 flex items-baseline justify-between">
					<h2 id="{reasonId}-pile" class="flex items-center gap-2 text-base font-bold">
						{i18n.t('dashboard.teacher.grading_pile')}<SampleBadge />
					</h2>
					<span class="text-lms-muted text-[0.8125rem]">
						<strong class="text-lms-foreground">{gradeLeft}</strong>
						{i18n.t('dashboard.teacher.sheets')}
					</span>
				</div>
				<ul>
					{#each toGrade as pile (pile.id)}
						{@const done = pile.left === 0}
						<li class="border-lms-border flex items-center gap-4 border-t py-3.5">
							<span class="relative h-13.5 w-11.5 flex-none" aria-hidden="true">
								<span
									class={[
										'bg-lms-surface border-lms-input-border absolute inset-0 translate-x-1 translate-y-0.5 rotate-6 rounded-[3px] border transition-opacity',
										pile.left >= PILE_THIRD_LAYER ? 'opacity-100' : 'opacity-0'
									]}
								></span>
								<span
									class={[
										'bg-lms-surface border-lms-input-border absolute inset-0 -translate-x-0.5 translate-y-px -rotate-4 rounded-[3px] border transition-opacity',
										pile.left >= PILE_SECOND_LAYER ? 'opacity-100' : 'opacity-0'
									]}
								></span>
								<span
									class={[
										'lms-ruled-paper absolute inset-0 flex items-center justify-center rounded-[3px] border transition-colors',
										done
											? 'bg-lms-progress/12 border-lms-progress'
											: 'bg-lms-surface border-lms-input-border'
									]}
								>
									<span
										class={[
											'bg-lms-surface px-1 text-[1.0625rem] leading-5 font-bold tabular-nums',
											done ? 'text-lms-progress-text' : 'text-lms-foreground'
										]}>{pile.left}</span
									>
								</span>
							</span>
							<span class="flex min-w-0 flex-1 flex-col gap-0.5">
								<span class="text-sm font-semibold">{pile.title}</span>
								<span class="text-lms-muted text-xs">
									{pile.classLabel} · {pile.dueLabel}
									<span class="sr-only">
										· {i18n.t('dashboard.teacher.sheets_left', { count: pile.left })}</span
									>
								</span>
							</span>
							{#if done}
								<span
									class="text-lms-progress-text flex items-center gap-1.5 text-xs font-bold whitespace-nowrap"
								>
									<Icon icon={CircleCheck} size="sm" />{i18n.t('dashboard.teacher.graded')}
								</span>
							{:else}
								<button
									type="button"
									class="border-lms-input-border bg-lms-surface text-lms-foreground hover:border-lms-interactive lms-focus-ring flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
									disabled={actionsDisabled}
									aria-describedby={actionsDisabled ? reasonId : undefined}
									onclick={() => gradeOne(pile)}
								>
									<span class="text-lms-interactive"><Icon icon={PenLine} size="sm" /></span>
									{i18n.t('dashboard.teacher.grade_one')}<span class="sr-only">: {pile.title}</span>
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		</div>

		{#if selectedClass && gradebook}
			<section
				class="lms-card flex min-w-0 flex-col gap-4 rounded-xl! p-5 shadow-none!"
				aria-labelledby="{reasonId}-gradebook"
			>
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 id="{reasonId}-gradebook" class="flex items-center gap-2 text-base font-bold">
							{i18n.t('dashboard.teacher.gradebook')}<SampleBadge />
						</h2>
						<p class="text-lms-muted text-[0.8125rem]">
							{i18n.t('dashboard.teacher.gradebook_description', {
								threshold: dashboard.remedialThreshold
							})}
						</p>
					</div>
					<button
						type="button"
						class="border-lms-input-border bg-lms-surface text-lms-foreground hover:border-lms-interactive lms-focus-ring flex h-9 items-center gap-2 rounded-lg border px-3.5 text-[0.8125rem] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
						disabled={actionsDisabled || gradebook.lowCount === 0}
						aria-describedby={actionsDisabled ? reasonId : undefined}
						onclick={makeRemedial}
					>
						<span class="text-lms-interactive"><Icon icon={WandSparkles} size="sm" /></span>
						{i18n.t('dashboard.teacher.make_remedial', { count: gradebook.lowCount })}
					</button>
				</div>

				<div class="border-lms-border relative flex gap-1 overflow-x-auto border-b" role="tablist">
					{#each dashboard.gradebook as gradebookClass, index (gradebookClass.id)}
						{@const selected = index === selectedClassIndex}
						<button
							type="button"
							role="tab"
							id="{tabsId}-tab-{index}"
							aria-selected={selected}
							aria-controls="{tabsId}-panel"
							tabindex={selected ? 0 : -1}
							class={[
								'lms-focus-ring -mb-px flex flex-col items-start gap-0.5 border-b-2 px-3.5 pt-2 pb-2.5 whitespace-nowrap',
								selected
									? 'border-lms-interactive text-lms-foreground'
									: 'text-lms-muted border-transparent'
							]}
							onclick={() => (selectedClassIndex = index)}
							onkeydown={handleTabKeydown}
						>
							<span class="text-[0.8125rem] font-bold">{gradebookClass.name}</span>
							<span class="text-lms-muted text-[11px]">
								{i18n.t('dashboard.teacher.material_progress', {
									percent: gradebookClass.progressPercent
								})}
							</span>
						</button>
					{/each}
				</div>

				<div
					id="{tabsId}-panel"
					role="tabpanel"
					aria-labelledby="{tabsId}-tab-{selectedClassIndex}"
					class="relative overflow-x-auto"
				>
					<div
						role="table"
						aria-label="{i18n.t('dashboard.teacher.gradebook')} · {selectedClass.name}"
						class="border-lms-input-border grid min-w-140 overflow-hidden rounded-sm border"
						style:grid-template-columns="170px repeat({selectedClass.objectives.length}, minmax(0,
						1fr))"
					>
						<div role="row" class="contents">
							<span
								role="columnheader"
								class="bg-lms-background border-lms-input-border text-lms-muted border-b px-3 py-2.5 text-[11px] leading-tight font-bold uppercase"
							>
								{i18n.t('dashboard.teacher.student_name')}
							</span>
							{#each selectedClass.objectives as objective (objective.code)}
								<span
									role="columnheader"
									title={objective.name}
									class="bg-lms-background border-b-lms-input-border border-l-lms-border flex flex-col gap-px border-b border-l px-1.5 py-2 text-center text-[11px] leading-tight font-bold"
								>
									<span>{objective.code}</span>
									<span class="text-lms-muted truncate font-normal">{objective.name}</span>
								</span>
							{/each}
						</div>
						{#each [...gradebook.rows.map( (row) => ({ ...row, isAverage: false }) ), { name: i18n.t('dashboard.teacher.class_average'), scores: gradebook.averages, isAverage: true }] as row, rowIndex (row.name)}
							{@const rowClasses = [
								row.isAverage
									? 'bg-lms-background border-t-2 border-lms-input-border font-bold'
									: rowIndex > 0 && 'border-t border-lms-border'
							]}
							<div role="row" class="contents">
								<span
									role="rowheader"
									class={['flex h-10 items-center truncate px-3 text-[0.8125rem]', rowClasses]}
								>
									{row.name}
								</span>
								{#each row.scores as score, column (column)}
									{@const low = score < dashboard.remedialThreshold}
									<span
										role="cell"
										class={[
											'border-lms-border flex h-10 items-center justify-center border-l',
											rowClasses
										]}
									>
										<span
											class={[
												'flex size-8 -rotate-8 items-center justify-center rounded-full border-[1.5px] text-[0.8125rem] tabular-nums',
												low
													? 'border-lms-danger-text text-lms-danger-text'
													: 'text-lms-foreground border-transparent'
											]}
										>
											<span class="rotate-8">{score}</span>
										</span>
										{#if low}
											<span class="sr-only">
												({i18n.t('dashboard.teacher.below_threshold', {
													threshold: dashboard.remedialThreshold
												})})</span
											>
										{/if}
									</span>
								{/each}
							</div>
						{/each}
					</div>
				</div>
			</section>
		{/if}

		<TeacherPanels panels={data.panels} notify={showToast} />

		<Toast message={visibleToast?.message ?? null} icon={visibleToast?.icon} />
	{:else}
		<StatePanel
			headingLevel={1}
			title={i18n.t('common.state.no_data_title')}
			description={i18n.t('common.state.no_data_description')}
		/>
	{/if}
</div>
