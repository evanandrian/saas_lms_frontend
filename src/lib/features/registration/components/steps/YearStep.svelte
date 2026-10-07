<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import type { RegistrationWizard } from '../../registration.state.svelte';

	interface Props {
		wizard: RegistrationWizard;
	}

	let { wizard }: Props = $props();
	const i18n = useI18n();
	const uid = $props.id();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`register.${key}`, params);
	const MONTH_KEYS = [
		'jul',
		'aug',
		'sep',
		'oct',
		'nov',
		'dec',
		'jan',
		'feb',
		'mar',
		'apr',
		'may',
		'jun'
	] as const;
	const FIRST_MONTH = 7;
	const DAYS_PER_WEEK = 7;
	const MS_PER_DAY = 86_400_000;

	const errors = $derived(wizard.errors);
	const startYear = $derived(
		Number(wizard.setup.academicYear.slice(0, 4)) || new Date().getFullYear()
	);
	const years = $derived([startYear, startYear + 1].map((y) => `${y}/${y + 1}`));
	const nowYear = $derived.by(() => {
		const d = new Date();
		const y = d.getMonth() + 1 < FIRST_MONTH ? d.getFullYear() - 1 : d.getFullYear();
		return `${y}/${y + 1}`;
	});
	const rows = $derived([
		{ term: 1, name: t('year.odd'), tone: 'bg-lms-interactive', startKey: 'g1', endKey: 'g2' },
		{ term: 2, name: t('year.even'), tone: 'bg-lms-progress', startKey: 'e1', endKey: 'e2' }
	]);
	const ym = (i: number) =>
		`${i < 6 ? startYear : startYear + 1}-${String(i < 6 ? i + FIRST_MONTH : i - 5).padStart(2, '0')}`;
	const inRange = (k: string, a: string, b: string) =>
		a && b && k >= a.slice(0, 7) && k <= b.slice(0, 7);

	function setDate(term: number, field: 'start' | 'end', value: string) {
		wizard.setup.semesters = wizard.setup.semesters.map((s) =>
			s.term === term ? { ...s, [field]: value } : s
		);
	}

	function changeYear(value: string) {
		const shift = Number(value.slice(0, 4)) - startYear;
		wizard.setup.academicYear = value;
		wizard.setup.semesters = wizard.setup.semesters.map((s) => ({
			...s,
			start: shiftYear(s.start, shift),
			end: shiftYear(s.end, shift)
		}));
	}

	const shiftYear = (date: string, shift: number) =>
		date ? `${Number(date.slice(0, 4)) + shift}${date.slice(4)}` : date;
	const weeks = (a: string, b: string) => {
		const days = Math.round((new Date(b).getTime() - new Date(a).getTime()) / MS_PER_DAY);
		return days > 0 ? Math.round(days / DAYS_PER_WEEK) : 0;
	};
</script>

<section class="lms-card flex flex-col gap-5 rounded-[14px]! p-6 shadow-none!">
	<div class="flex flex-wrap items-end gap-4">
		<label class="flex min-w-50 flex-col gap-1.5" for="{uid}-ta">
			<span class="text-[0.8125rem] font-semibold">{t('year.academic_year')}</span>
			<select
				id="{uid}-ta"
				value={wizard.setup.academicYear}
				onchange={(e) => changeYear(e.currentTarget.value)}
				class="input lms-input lms-focus-ring h-11 text-[0.9375rem]"
			>
				{#each years as y (y)}<option value={y}>{y}</option>{/each}
			</select>
		</label>
		<span class="text-lms-muted flex items-center gap-2 pb-3 text-[0.8125rem]">
			<span class="text-lms-interactive"><Icon icon={CalendarCheck} size="sm" /></span>
			{wizard.setup.academicYear === nowYear ? t('year.active_now') : t('year.upcoming')}
		</span>
	</div>
	<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17.5rem),1fr))] gap-3.5">
		{#each rows as row (row.term)}
			{@const sem = wizard.semester(row.term)}
			{@const startErr = row.startKey === 'e1' ? errors.e1 : undefined}
			{@const endErr = errors[row.endKey]}
			<div class="border-lms-border flex flex-col gap-3 overflow-hidden rounded-xl border p-4">
				<span class={['-mx-4 -mt-4 mb-1 h-1', row.tone]}></span>
				<span class="text-[0.9375rem] font-bold">{t('year.semester', { name: row.name })}</span>
				<div class="grid grid-cols-2 gap-2.5">
					<label class="flex flex-col gap-1.5">
						<span class="text-lms-muted text-xs font-semibold">{t('year.start')}</span>
						<input
							type="date"
							value={sem.start}
							onchange={(e) => setDate(row.term, 'start', e.currentTarget.value)}
							class={[
								'input lms-input lms-focus-ring h-10.5 text-sm',
								startErr && 'border-lms-danger-text!'
							]}
						/>
					</label>
					<label class="flex flex-col gap-1.5">
						<span class="text-lms-muted text-xs font-semibold">{t('year.end')}</span>
						<input
							type="date"
							value={sem.end}
							onchange={(e) => setDate(row.term, 'end', e.currentTarget.value)}
							class={[
								'input lms-input lms-focus-ring h-10.5 text-sm',
								endErr && 'border-lms-danger-text!'
							]}
						/>
					</label>
				</div>
				<span class={['text-xs', startErr || endErr ? 'text-lms-danger-text' : 'text-lms-muted']}>
					{startErr
						? t(`errors.${startErr}`)
						: endErr
							? t(`errors.${endErr}`)
							: t('year.weeks', { n: weeks(sem.start, sem.end) })}
				</span>
			</div>
		{/each}
	</div>
	<div class="flex flex-col gap-2" aria-hidden="true">
		<div class="grid grid-cols-12 gap-0.75">
			{#each MONTH_KEYS as key, i (key)}
				{@const k = ym(i)}
				<span
					class={[
						'h-7 rounded-[5px] transition-colors',
						inRange(k, wizard.semester(1).start, wizard.semester(1).end)
							? 'bg-lms-interactive/55'
							: inRange(k, wizard.semester(2).start, wizard.semester(2).end)
								? 'bg-lms-progress/55'
								: 'bg-lms-surface-muted'
					]}
				></span>
			{/each}
		</div>
		<div class="grid grid-cols-12 gap-0.75">
			{#each MONTH_KEYS as key (key)}<span
					class="text-lms-muted text-center font-mono text-[10px] uppercase"
					>{t(`year.month_${key}`)}</span
				>{/each}
		</div>
	</div>
</section>
