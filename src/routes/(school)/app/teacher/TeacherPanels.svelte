<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import SampleBadge from '$lib/features/dashboards/components/SampleBadge.svelte';
	import { useI18n } from '$lib/i18n';
	import type { LucideIcon } from '@lucide/svelte';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import Check from '@lucide/svelte/icons/check';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import FilePlus from '@lucide/svelte/icons/file-plus';
	import Flag from '@lucide/svelte/icons/flag';
	import Leaf from '@lucide/svelte/icons/leaf';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Send from '@lucide/svelte/icons/send';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Sigma from '@lucide/svelte/icons/sigma';
	import type {
		BankQuestion,
		QuestionLevel,
		RppStatus,
		teacherPanelsSample
	} from './teacher-panels.sample';

	interface Props {
		panels: typeof teacherPanelsSample;
		/** Aksi lokal pada data contoh: tampilkan toast halaman (catatan simulasi ditambahkan halaman). */
		notify: (message: string, icon: LucideIcon) => void;
	}

	let { panels, notify }: Props = $props();

	const i18n = useI18n();
	const uid = $props.id();
	/** Ambang tingkat kesulitan & daya beda (referensi): mudah ≥ 80% benar, sulit < 40%. */
	const EASY_MIN = 80;
	const HARD_MAX = 40;
	const DISCRIMINATION_LOW = 0.2;
	const DISCRIMINATION_GOOD = 0.4;
	const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;
	/** Sebaran jawaban salah pada pengecoh (referensi). */
	const DISTRACTOR_SPREAD = [0.5, 0.3, 0.2] as const;
	const MIN_BAR_PERCENT = 8;

	const BANK_ICONS: Record<BankQuestion['icon'], LucideIcon> = {
		sigma: Sigma,
		leaf: Leaf,
		book: BookOpenText
	};
	const LEVEL_TEXT: Record<QuestionLevel, string> = {
		easy: 'text-lms-success-text',
		medium: 'text-lms-warning-text',
		hard: 'text-lms-danger-text'
	};
	const LEVEL_BAR: Record<QuestionLevel, string> = {
		easy: 'bg-lms-progress',
		medium: 'bg-lms-scale-mid',
		hard: 'bg-lms-danger-text'
	};
	const LEVEL_CHIP: Record<QuestionLevel, string> = {
		easy: 'lms-tone-success',
		medium: 'lms-tone-warning',
		hard: 'lms-tone-danger'
	};
	const RPP_CHIP: Record<RppStatus, string> = {
		approved: 'lms-tone-success',
		submitted: 'lms-tone-info',
		draft: 'lms-tone-warning',
		none: 'bg-lms-background text-lms-muted'
	};

	// svelte-ignore state_referenced_locally
	let progress = $state(panels.classes.map((item) => item.chaptersDone));
	// svelte-ignore state_referenced_locally
	let rpp = $state<RppStatus[]>(panels.classes.map((item) => item.rpp));
	let highlight = $state(-1);
	let query = $state('');
	let bankTab = $state('all');
	let used = $state<string[]>([]);
	let drafts = $state(0);
	let examIndex = $state(0);
	// svelte-ignore state_referenced_locally
	let itemIndex = $state(panels.defaultItem);
	let flagged = $state<string[]>([]);

	const lessons = $derived(panels.week.reduce((sum, day) => sum + day.length, 0));
	const levelOf = (percent: number): QuestionLevel =>
		percent >= EASY_MIN ? 'easy' : percent < HARD_MAX ? 'hard' : 'medium';
	const percentOf = (done: number, total: number) => Math.round((done / total) * 100);

	const bank = $derived.by(() => {
		const draftQuestions: BankQuestion[] = Array.from({ length: drafts }, (_, index) => ({
			subjectCode: panels.subjectFilters[0] ?? '',
			text: i18n.t('dashboard.teacher_panels.draft_question', { number: index + 1 }),
			type: panels.newQuestionType,
			level: 'medium',
			used: 0,
			icon: 'sigma'
		}));
		const needle = query.toLowerCase();
		return [...panels.bank, ...draftQuestions]
			.reverse()
			.filter(
				(question) =>
					(bankTab === 'all' || question.subjectCode === bankTab) &&
					question.text.toLowerCase().includes(needle)
			);
	});

	const exam = $derived(panels.exams[examIndex] ?? panels.exams[0]);
	const item = $derived(exam?.items[itemIndex] ?? exam?.items[0] ?? null);
	const flagKey = $derived(`${examIndex}-${itemIndex}`);
	const options = $derived.by(() => {
		if (!item) return [];
		const correct = (itemIndex * 3) % OPTION_KEYS.length;
		const wrong = 100 - item[0];
		let distractor = 0;
		return OPTION_KEYS.map((key, index) => {
			const value =
				index === correct ? item[0] : Math.round(wrong * (DISTRACTOR_SPREAD[distractor++] ?? 0));
			return { key, value, correct: index === correct };
		});
	});
	const advice = $derived.by(() => {
		if (!item) return '';
		const [percent, discrimination] = item;
		if (discrimination < 0) return i18n.t('dashboard.teacher_panels.advice_negative');
		if (discrimination < DISCRIMINATION_LOW) return i18n.t('dashboard.teacher_panels.advice_low');
		if (percent < HARD_MAX) return i18n.t('dashboard.teacher_panels.advice_hard');
		return i18n.t('dashboard.teacher_panels.advice_ok');
	});
	const fmtDecimal = (value: number) =>
		i18n.locale === 'en' ? value.toFixed(2) : value.toFixed(2).replace('.', ',');

	function submitRpp(index: number, name: string) {
		rpp = rpp.map((status, position) => (position === index ? 'submitted' : status));
		notify(i18n.t('dashboard.teacher_panels.toast_rpp', { class: name }), Send);
	}

	function finishChapter(index: number, name: string, chapter: string) {
		progress = progress.map((done, position) => (position === index ? done + 1 : done));
		notify(i18n.t('dashboard.teacher_panels.toast_chapter', { chapter, class: name }), CircleCheck);
	}

	function useQuestion(text: string) {
		if (used.includes(text)) return;
		used = [...used, text];
		notify(i18n.t('dashboard.teacher_panels.toast_used'), FilePlus);
	}

	function newQuestion() {
		drafts += 1;
		bankTab = 'all';
		query = '';
		notify(i18n.t('dashboard.teacher_panels.toast_new_question'), FilePlus);
	}
</script>

{#snippet segmented(
	options: readonly { key: string; label: string }[],
	current: string,
	onpick: (key: string) => void,
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

<!-- Panel mapel guru (referensi "06 Guru · panel mapel"): jadwal, progres & RPP, bank soal, analisis butir. -->
<p class="lms-card flex flex-wrap items-start gap-3 rounded-xl! px-4 py-3.5 shadow-none!">
	<span class="text-lms-interactive mt-px"><Icon icon={ShieldCheck} /></span>
	<span class="flex-[1_1_17.5rem] text-[0.8125rem] leading-5">
		{i18n.t('dashboard.teacher_panels.notice_view')}
		<b>{i18n.t('dashboard.teacher_panels.notice_classes', { count: panels.classCount })}</b>
		{i18n.t('dashboard.teacher_panels.notice_can_edit')}
		<b>{i18n.t('dashboard.teacher_panels.notice_editable')}</b>
		{i18n.t('dashboard.teacher_panels.notice_rest')}
	</span>
</p>

<section
	class="lms-card flex flex-col gap-3.5 rounded-xl! p-5 shadow-none!"
	aria-labelledby="{uid}-schedule"
>
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 id="{uid}-schedule" class="flex flex-wrap items-center gap-2 text-base font-bold">
				{i18n.t('dashboard.teacher_panels.schedule')}<SampleBadge />
			</h2>
			<p class="text-lms-muted text-[0.8125rem]">
				{i18n.t('dashboard.teacher_panels.schedule_hint', {
					lessons,
					classes: panels.classCount
				})}
			</p>
		</div>
		<div
			class="flex flex-wrap gap-1.5"
			role="group"
			aria-label={i18n.t('dashboard.teacher_panels.highlight')}
		>
			{#each [{ index: -1, label: i18n.t('dashboard.teacher_panels.all'), color: null }, ...panels.classes.map( (item, index) => ({ index, label: item.code, color: item.color }) )] as chip (chip.index)}
				<button
					type="button"
					aria-pressed={highlight === chip.index}
					class={[
						'lms-focus-ring flex h-7.5 items-center gap-1.5 rounded-full border-[1.5px] px-2.5 text-xs font-semibold',
						highlight === chip.index
							? 'border-lms-interactive bg-lms-interactive-subtle'
							: 'border-lms-input-border bg-lms-surface'
					]}
					onclick={() => (highlight = chip.index)}
				>
					<span
						class={['size-2 rounded-xs', !chip.color && 'bg-lms-muted']}
						style:background-color={chip.color}
						aria-hidden="true"
					></span>{chip.label}
				</button>
			{/each}
		</div>
	</div>
	<div class="overflow-x-auto">
		<div class="grid min-w-160 grid-cols-[4.5rem_repeat(5,minmax(0,1fr))] gap-1">
			<span></span>
			{#each panels.days as day, index (day)}
				<span
					class={[
						'py-1.5 text-center text-xs font-bold',
						index === panels.todayIndex ? 'text-lms-interactive' : 'text-lms-foreground'
					]}
				>
					{index === panels.todayIndex ? i18n.t('dashboard.teacher_panels.today', { day }) : day}
				</span>
			{/each}
			{#each panels.periods as time, period (time)}
				<span class="text-lms-muted flex items-center font-mono text-[11px]">{time}</span>
				{#each panels.days as day, dayIndex (day)}
					{@const hit = panels.week[dayIndex]?.find(([slot]) => slot === period)}
					{@const cls = hit ? panels.classes[hit[1]] : undefined}
					{#if cls && hit}
						{@const chapter = cls.chapters[progress[hit[1]] ?? 0]}
						<span
							class={[
								'flex h-10.5 flex-col justify-center overflow-hidden rounded-md border px-2 py-1 transition-opacity',
								highlight !== -1 && highlight !== hit[1] && 'opacity-25'
							]}
							style:background-color="color-mix(in oklch, {cls.color} 16%, var(--color-lms-surface))"
							style:border-color="color-mix(in oklch, {cls.color} 45%, var(--color-lms-surface))"
						>
							<span class="truncate text-xs font-bold">{cls.code}</span>
							<span class="truncate text-[10px] opacity-85"
								>{chapter ?? i18n.t('dashboard.teacher_panels.final_assessment')}</span
							>
						</span>
					{:else}
						<span class="border-lms-border h-10.5 rounded-md border border-dashed"></span>
					{/if}
				{/each}
			{/each}
		</div>
	</div>
</section>

<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,21.25rem),1fr))] gap-4">
	<section
		class="lms-card flex flex-col gap-1 rounded-xl! p-5 shadow-none!"
		aria-labelledby="{uid}-progress"
	>
		<div class="mb-2 flex items-baseline justify-between gap-2">
			<h2 id="{uid}-progress" class="flex flex-wrap items-center gap-2 text-base font-bold">
				{i18n.t('dashboard.teacher_panels.progress')}<SampleBadge />
			</h2>
			<span class="text-lms-muted text-xs">{i18n.t('dashboard.semester.odd')}</span>
		</div>
		<ul>
			{#each panels.classes as cls, index (cls.code)}
				{@const done = progress[index] ?? 0}
				{@const status = rpp[index] ?? 'none'}
				{@const total = cls.chapters.length}
				{@const finished = done >= total}
				<li class="border-lms-border flex flex-col gap-2 border-t py-3">
					<div class="flex flex-wrap items-center justify-between gap-2.5">
						<span class="flex items-center gap-2 text-sm font-bold">
							<span
								class="size-2.5 rounded-[3px]"
								style:background-color={cls.color}
								aria-hidden="true"
							></span>
							{cls.name}
						</span>
						<span class={['rounded-full px-2.5 py-0.75 text-[11px] font-bold', RPP_CHIP[status]]}>
							{i18n.t('dashboard.teacher_panels.rpp', {
								status: i18n.t(`dashboard.teacher_panels.rpp_${status}`)
							})}
						</span>
					</div>
					<div class="flex gap-0.75" aria-hidden="true">
						{#each cls.chapters as chapter, position (chapter)}
							<span
								title={chapter}
								class="h-2.5 flex-1 rounded-[3px] transition-colors duration-300"
								style:background-color={position < done
									? cls.color
									: position === done
										? `color-mix(in oklch, ${cls.color} 35%, var(--color-lms-surface))`
										: 'var(--color-lms-background)'}
							></span>
						{/each}
					</div>
					<div class="flex flex-wrap items-center justify-between gap-2.5">
						<span class="text-lms-muted text-xs">
							{finished
								? i18n.t('dashboard.teacher_panels.all_done', { percent: percentOf(done, total) })
								: i18n.t('dashboard.teacher_panels.current_chapter', {
										number: done + 1,
										chapter: cls.chapters[done] ?? '',
										percent: percentOf(done, total)
									})}
						</span>
						<div class="flex gap-1.5">
							{#if status === 'draft' || status === 'none'}
								<button
									type="button"
									class="border-lms-input-border bg-lms-surface lms-focus-ring h-7.5 rounded-lg border px-2.5 text-xs font-semibold"
									onclick={() => submitRpp(index, cls.name)}
									>{i18n.t('dashboard.teacher_panels.submit_rpp')}</button
								>
							{/if}
							<button
								type="button"
								class={[
									'lms-focus-ring flex h-7.5 items-center gap-1.25 rounded-lg px-2.5 text-xs font-semibold',
									finished ? 'lms-tone-success' : 'lms-action-primary'
								]}
								aria-disabled={finished}
								onclick={() =>
									!finished && finishChapter(index, cls.name, cls.chapters[done] ?? '')}
							>
								<Icon icon={Check} size="sm" />
								{finished
									? i18n.t('dashboard.teacher_panels.finished')
									: i18n.t('dashboard.teacher_panels.mark_chapter')}
							</button>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	</section>

	<section
		class="lms-card flex flex-col gap-3 rounded-xl! p-5 shadow-none!"
		aria-labelledby="{uid}-bank"
	>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 id="{uid}-bank" class="flex flex-wrap items-center gap-2 text-base font-bold">
				{i18n.t('dashboard.teacher_panels.bank')}<SampleBadge />
			</h2>
			<button
				type="button"
				class="lms-action-primary lms-focus-ring flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold"
				onclick={newQuestion}
			>
				<Icon icon={Plus} size="sm" />{i18n.t('dashboard.teacher_panels.new_question')}
			</button>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<label class="relative block flex-[1_1_10rem]">
				<span class="sr-only">{i18n.t('dashboard.teacher_panels.search')}</span>
				<span
					class="text-lms-muted pointer-events-none absolute inset-y-0 left-2.5 flex items-center"
				>
					<Icon icon={Search} size="sm" />
				</span>
				<input
					type="search"
					bind:value={query}
					placeholder={i18n.t('dashboard.teacher_panels.search')}
					class="input lms-input lms-focus-ring h-9 ps-8 text-[0.8125rem]"
				/>
			</label>
			{@render segmented(
				[
					{ key: 'all', label: i18n.t('dashboard.teacher_panels.all') },
					...panels.subjectFilters.map((code) => ({ key: code, label: code }))
				],
				bankTab,
				(key) => (bankTab = key),
				i18n.t('dashboard.teacher_panels.bank')
			)}
		</div>
		<ul>
			{#each bank as question (question.text)}
				{@const isUsed = used.includes(question.text)}
				<li class="border-lms-border flex items-start gap-3 border-t py-2.5">
					<span
						class="bg-lms-background text-lms-interactive flex size-8.5 flex-none items-center justify-center rounded-lg"
					>
						<Icon icon={BANK_ICONS[question.icon]} size="sm" />
					</span>
					<span class="flex min-w-0 flex-1 flex-col gap-1">
						<span class="text-[0.8125rem] leading-4.75 font-semibold">{question.text}</span>
						<span class="text-lms-muted flex flex-wrap gap-1.5 text-[11px]">
							<span>{question.subjectCode}</span>·<span>{question.type}</span>·<span
								class={['font-semibold', LEVEL_TEXT[question.level]]}
								>{i18n.t(`dashboard.teacher_panels.level_${question.level}`)}</span
							>·<span
								>{i18n.t('dashboard.teacher_panels.used', {
									count: question.used + (isUsed ? 1 : 0)
								})}</span
							>
						</span>
					</span>
					<button
						type="button"
						class={[
							'lms-focus-ring h-7.5 flex-none rounded-lg border px-2.5 text-xs font-semibold whitespace-nowrap',
							isUsed
								? 'lms-tone-success border-transparent'
								: 'border-lms-input-border bg-lms-surface'
						]}
						onclick={() => useQuestion(question.text)}
					>
						{isUsed
							? i18n.t('dashboard.teacher_panels.added')
							: i18n.t('dashboard.teacher_panels.use')}
					</button>
				</li>
			{:else}
				<li class="border-lms-border text-lms-muted border-t py-3 text-[0.8125rem]">
					{i18n.t('dashboard.teacher_panels.no_match')}
				</li>
			{/each}
		</ul>
	</section>
</div>

{#if exam && item}
	{@const level = levelOf(item[0])}
	{@const isFlagged = flagged.includes(flagKey)}
	<section
		class="lms-card flex flex-col gap-4 rounded-xl! p-5 shadow-none!"
		aria-labelledby="{uid}-items"
	>
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<h2 id="{uid}-items" class="flex flex-wrap items-center gap-2 text-base font-bold">
					{i18n.t('dashboard.teacher_panels.item_analysis')}<SampleBadge />
				</h2>
				<p class="text-lms-muted text-[0.8125rem]">
					{exam.meta} · {i18n.t('dashboard.teacher_panels.pick_bar')}
				</p>
			</div>
			{@render segmented(
				panels.exams.map((entry, index) => ({ key: String(index), label: entry.title })),
				String(examIndex),
				(key) => {
					examIndex = Number(key);
					itemIndex = 0;
				},
				i18n.t('dashboard.teacher_panels.item_analysis')
			)}
		</div>
		<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] items-start gap-5">
			<div class="flex flex-col gap-1.5">
				<div class="flex h-30 items-end gap-1">
					{#each exam.items as [percent], index (index)}
						{@const active = index === itemIndex}
						{@const marked = flagged.includes(`${examIndex}-${index}`)}
						<button
							type="button"
							class="lms-focus-ring flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
							title={i18n.t('dashboard.teacher_panels.bar_title', { number: index + 1, percent })}
							aria-pressed={active}
							onclick={() => (itemIndex = index)}
						>
							<span
								class={[
									'w-full rounded-t rounded-b-[1px] transition-[height] duration-300',
									LEVEL_BAR[levelOf(percent)],
									active
										? 'ring-lms-foreground ring-offset-lms-surface ring-2 ring-offset-2'
										: marked && 'ring-lms-danger-text ring-offset-lms-surface ring-1 ring-offset-2'
								]}
								style:height="{Math.max(MIN_BAR_PERCENT, percent)}%"
							></span>
							<span class={['text-lms-muted font-mono text-[10px]', active && 'font-bold']}
								>{index + 1}</span
							>
						</button>
					{/each}
				</div>
				<div class="text-lms-muted flex flex-wrap gap-3.5 text-[11px]">
					{#each ['easy', 'medium', 'hard'] as const as key (key)}
						<span class="flex items-center gap-1.25">
							<span class={['size-2.5 rounded-xs', LEVEL_BAR[key]]}></span>
							{i18n.t(`dashboard.teacher_panels.legend_${key}`, { easy: EASY_MIN, hard: HARD_MAX })}
						</span>
					{/each}
				</div>
			</div>
			<div class="bg-lms-background flex flex-col gap-3 rounded-xl p-4">
				<div class="flex items-start justify-between gap-2.5">
					<div>
						<span class="text-lms-muted font-mono text-[11px] tracking-widest uppercase"
							>{i18n.t('dashboard.teacher_panels.question_no', { number: itemIndex + 1 })}</span
						>
						<p class="text-sm leading-5 font-semibold">
							{exam.questionTexts[itemIndex] ??
								i18n.t('dashboard.teacher_panels.item_label', {
									number: itemIndex + 1,
									title: exam.title
								})}
						</p>
					</div>
					<span
						class={[
							'rounded-full px-2.5 py-0.75 text-[11px] font-bold whitespace-nowrap uppercase',
							LEVEL_CHIP[level]
						]}>{i18n.t(`dashboard.teacher_panels.level_${level}`)}</span
					>
				</div>
				<dl class="grid grid-cols-2 gap-2">
					<div class="bg-lms-surface rounded-lg p-2.5">
						<dt class="text-lms-muted text-[11px]">{i18n.t('dashboard.teacher_panels.correct')}</dt>
						<dd class="text-lg font-bold">{item[0]}%</dd>
					</div>
					<div class="bg-lms-surface rounded-lg p-2.5">
						<dt class="text-lms-muted text-[11px]">
							{i18n.t('dashboard.teacher_panels.discrimination')}
						</dt>
						<dd
							class={[
								'text-lg font-bold',
								item[1] < DISCRIMINATION_LOW
									? 'text-lms-danger-text'
									: item[1] >= DISCRIMINATION_GOOD && 'text-lms-success-text'
							]}
						>
							{fmtDecimal(item[1])}
						</dd>
					</div>
				</dl>
				<div class="flex flex-col gap-1.5">
					<span class="text-lms-muted text-xs font-semibold"
						>{i18n.t('dashboard.teacher_panels.spread')}</span
					>
					{#each options as option (option.key)}
						<div class="flex items-center gap-2 text-xs">
							<span
								class={[
									'w-4 font-bold',
									option.correct ? 'text-lms-success-text' : 'text-lms-muted'
								]}>{option.key}</span
							>
							<span class="bg-lms-surface h-2 flex-1 overflow-hidden rounded-full">
								<span
									class={[
										'block h-full rounded-full',
										option.correct ? 'bg-lms-progress' : 'bg-lms-input-border'
									]}
									style:width="{option.value}%"
								></span>
							</span>
							<span class="w-9 text-right tabular-nums">{option.value}%</span>
						</div>
					{/each}
				</div>
				<p class="text-xs leading-4.5">{advice}</p>
				<button
					type="button"
					aria-pressed={isFlagged}
					class={[
						'lms-focus-ring flex h-9 items-center justify-center gap-1.5 rounded-lg border text-[0.8125rem] font-semibold',
						isFlagged
							? 'lms-tone-danger border-transparent'
							: 'border-lms-input-border bg-lms-surface'
					]}
					onclick={() =>
						(flagged = isFlagged
							? flagged.filter((key) => key !== flagKey)
							: [...flagged, flagKey])}
				>
					<Icon icon={Flag} size="sm" />
					{isFlagged
						? i18n.t('dashboard.teacher_panels.flagged')
						: i18n.t('dashboard.teacher_panels.flag')}
				</button>
			</div>
		</div>
	</section>
{/if}
