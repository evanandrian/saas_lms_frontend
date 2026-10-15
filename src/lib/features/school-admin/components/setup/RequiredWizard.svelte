<script lang="ts">
	import { resolve } from '$app/paths';
	import type { SchoolSetupState } from '$lib/api/generated/lms';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import BookMarked from '@lucide/svelte/icons/book-marked';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Building2 from '@lucide/svelte/icons/building-2';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import Check from '@lucide/svelte/icons/check';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import Circle from '@lucide/svelte/icons/circle';
	import Clock from '@lucide/svelte/icons/clock';
	import CloudCheck from '@lucide/svelte/icons/cloud-check';
	import FileUp from '@lucide/svelte/icons/file-up';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Info from '@lucide/svelte/icons/info';
	import Lock from '@lucide/svelte/icons/lock';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import School from '@lucide/svelte/icons/school';
	import Upload from '@lucide/svelte/icons/upload';
	import {
		ACCREDITATIONS,
		MAX_CAPACITY,
		MAX_GROUPS,
		RequiredWizardState
	} from '../../required-wizard.state.svelte';
	import {
		KKTP_MAX,
		PREFIX,
		REQUIRED_SECTIONS,
		inputClass,
		sectionCount
	} from '../../school-admin.model';
	import Segmented from '../Segmented.svelte';

	interface Props {
		setup: SchoolSetupState;
		/** Langkah yang dibuka (0–4); null = langkah wajib pertama yang belum selesai. */
		step: number | null;
		/** Mode ubah satu bagian dari checklist (tombol "Simpan" lalu kembali). */
		editOne?: boolean;
		onstate: (state: SchoolSetupState) => void;
		onimport: (kind: 'classes' | 'subjects') => void;
		ondone: () => void;
		onnotify: (message: string) => void;
	}

	let { setup, step, editOne = false, onstate, onimport, ondone, onnotify }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.setup.${key}`, params);
	const ICONS = [Building2, BookMarked, CalendarRange, School, BookOpen];

	// Props dibaca lewat getter agar state kelas mengikuti `setup` terbaru dari halaman;
	// `step` sengaja hanya nilai awal (langkah pembuka).
	// svelte-ignore state_referenced_locally
	const wizard = new RequiredWizardState(
		{
			setup: () => setup,
			editOne: () => editOne,
			t: i18n.t,
			onstate: (state) => onstate(state),
			ondone: () => ondone(),
			onnotify: (message) => onnotify(message)
		},
		step
	);
</script>

<!-- 03b wizard data wajib (referensi v4 SchoolSetup: aside langkah + section isian + footer). -->
<div
	class="mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8"
>
	<aside class="flex flex-col gap-4">
		<div class="flex flex-col gap-1.5">
			<span class="text-lms-interactive font-mono text-xs font-semibold tracking-[0.1em]"
				>{t('required_eyebrow', { step: wizard.current + 1 })}</span
			>
			<span class="text-lms-muted text-[13px] leading-5">{t('required_desc')}</span>
		</div>
		<nav class="flex flex-col gap-1.5" aria-label={t('steps_label')}>
			{#each REQUIRED_SECTIONS as key, k (key)}
				{@const section = wizard.sections[k]}
				{@const done = Boolean(section?.done)}
				{@const locked = k > wizard.reachable && !editOne}
				<button
					type="button"
					disabled={locked}
					aria-current={k === wizard.current ? 'step' : undefined}
					class="lms-focus-ring flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-55 {k ===
					wizard.current
						? 'border-lms-interactive bg-lms-interactive-subtle'
						: 'border-lms-border bg-lms-surface'}"
					onclick={() => wizard.goTo(k)}
				>
					<span
						class="flex size-7 flex-none items-center justify-center rounded-full text-xs font-bold {done
							? 'bg-lms-success-text text-lms-surface'
							: k === wizard.current
								? 'lms-action-primary'
								: 'bg-lms-surface-muted text-lms-muted'}"
					>
						{#if done}<Icon icon={Check} size="sm" />{:else}{k + 1}{/if}
					</span>
					<span class="flex min-w-0 flex-col">
						<span class="truncate text-sm font-semibold"
							>{i18n.t(`${PREFIX}.sections.${key}.title`)}</span
						>
						<span class="text-lms-muted truncate text-xs"
							>{done && section
								? sectionCount(i18n.t, section)
								: k === wizard.current
									? t('step_current')
									: locked
										? t('step_locked')
										: t('step_open')}</span
						>
					</span>
				</button>
			{/each}
			<div
				class="border-lms-border text-lms-muted mt-1 flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5"
			>
				<span class="bg-lms-surface-muted flex size-7 items-center justify-center rounded-full"
					><Icon icon={Clock} size="sm" /></span
				>
				<span class="flex flex-col"
					><span class="text-sm font-semibold">{t('later_title')}</span><span class="text-xs"
						>{t('later_sub')}</span
					></span
				>
			</div>
		</nav>
	</aside>

	<section class="lms-card flex min-w-0 flex-col rounded-2xl">
		<div class="border-lms-border flex items-start gap-4 border-b px-6 py-5">
			<span
				class="bg-lms-interactive-subtle text-lms-interactive flex size-11 flex-none items-center justify-center rounded-xl"
				><Icon icon={ICONS[wizard.current] ?? Building2} /></span
			>
			<div class="flex min-w-0 flex-col gap-1">
				<h2 class="text-xl font-bold">
					{i18n.t(`${PREFIX}.sections.${REQUIRED_SECTIONS[wizard.current]}.title`)}
				</h2>
				<span class="text-lms-muted text-sm"
					>{t(`step_desc_${REQUIRED_SECTIONS[wizard.current]}`)}</span
				>
				<span class="text-lms-muted font-mono text-[11px]"
					>{t(`step_table_${REQUIRED_SECTIONS[wizard.current]}`)}</span
				>
			</div>
		</div>

		<div class="flex min-w-0 flex-1 flex-col gap-5 p-6">
			{#if wizard.current === 0}
				<div class="bg-lms-surface-muted grid gap-3 rounded-xl p-4 sm:grid-cols-2">
					{#each [[t('locked_name'), setup.school.name], [t('locked_npsn'), setup.school.npsn || '—'], [t('locked_level'), setup.school.level], [t('locked_timezone'), setup.school.timezone || '—']] as [label, value] (label)}
						<div class="flex flex-col gap-0.5">
							<span class="text-lms-muted flex items-center gap-1.5 text-xs"
								><Icon icon={Lock} size="sm" />{label}</span
							><span class="text-sm font-semibold">{value}</span>
						</div>
					{/each}
					<span class="text-lms-muted text-xs sm:col-span-2">{t('locked_note')}</span>
				</div>
				<div class="grid gap-4 sm:grid-cols-2">
					<label class="flex flex-col gap-1.5 sm:col-span-2">
						<span class="text-[13px] font-semibold"
							>{t('address')}<span class="text-lms-danger-text"> *</span></span
						>
						<textarea
							rows="2"
							class="lms-input lms-focus-ring rounded-[10px] border-[1.5px] px-3 py-2.5 text-sm {wizard
								.errors.address
								? 'border-lms-danger-text'
								: 'border-lms-input-border'}"
							placeholder={t('address_ph')}
							bind:value={wizard.profile.address}></textarea>
						{#if wizard.errors.address}<span class="text-lms-danger-text text-xs"
								>{wizard.errors.address}</span
							>{/if}
					</label>
					<label class="flex flex-col gap-1.5">
						<span class="text-[13px] font-semibold">{t('district')}</span>
						<select
							class={inputClass(wizard.errors.district_code)}
							bind:value={wizard.profile.district_code}
						>
							<option value="">—</option>
							{#each setup.districts as d (d.value)}<option value={d.value}>{d.label}</option
								>{/each}
						</select>
						{#if !setup.districts.length}<span class="text-lms-muted text-xs"
								>{t('district_empty')}</span
							>{/if}
					</label>
					<div class="flex flex-col gap-1.5">
						<span class="text-[13px] font-semibold">{t('accreditation')}</span>
						<Segmented
							label={t('accreditation')}
							value={wizard.profile.accreditation}
							onchange={(v) => (wizard.profile.accreditation = v)}
							options={ACCREDITATIONS.map((a) => ({
								value: a,
								label: a === 'BELUM' ? t('accreditation_none') : a
							}))}
						/>
					</div>
					<label class="flex flex-col gap-1.5">
						<span class="text-[13px] font-semibold"
							>{t('principal')}<span class="text-lms-danger-text"> *</span></span
						>
						<input
							class={inputClass(wizard.errors.principal_name)}
							placeholder={t('principal_ph')}
							bind:value={wizard.profile.principal_name}
						/>
						{#if wizard.errors.principal_name}<span class="text-lms-danger-text text-xs"
								>{wizard.errors.principal_name}</span
							>{/if}
					</label>
					<label class="flex flex-col gap-1.5">
						<span class="text-[13px] font-semibold">{t('principal_nip')}</span>
						<input
							class={inputClass(wizard.errors.principal_nip, true)}
							inputmode="numeric"
							placeholder={t('principal_nip_ph')}
							bind:value={wizard.profile.principal_nip}
						/>
						<span
							class="text-xs {wizard.errors.principal_nip
								? 'text-lms-danger-text'
								: 'text-lms-muted'}">{wizard.errors.principal_nip || t('principal_nip_note')}</span
						>
					</label>
					<div
						class="border-lms-border flex flex-wrap items-center gap-3 rounded-xl border p-3 sm:col-span-2"
					>
						<span
							class="bg-lms-surface-muted text-lms-muted flex size-14 items-center justify-center overflow-hidden rounded-lg"
						>
							{#if wizard.logoPreview || setup.profile.has_logo}<img
									src={wizard.logoPreview ?? resolve(APP_PATHS.SCHOOL_ADMIN_LOGO)}
									alt={t('logo')}
									class="size-full object-contain"
								/>{:else}<Icon icon={ImageIcon} />{/if}
						</span>
						<span class="flex flex-[1_1_200px] flex-col"
							><span class="text-sm font-semibold">{t('logo')}</span><span
								class="text-lms-muted text-xs">{wizard.errors.logo || t('logo_note')}</span
							></span
						>
						<label
							class="lms-action-secondary lms-focus-ring inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-xs font-semibold"
						>
							<Icon icon={Upload} size="sm" />{t('logo_pick')}
							<input
								type="file"
								accept="image/png,image/jpeg"
								class="sr-only"
								onchange={(e) => {
									void wizard.uploadLogo(e.currentTarget.files?.[0]);
									e.currentTarget.value = '';
								}}
							/>
						</label>
					</div>
				</div>
			{:else if wizard.current === 1}
				<div class="grid gap-3 sm:grid-cols-2">
					{#each setup.curricula as c (c.value)}
						<button
							type="button"
							class="lms-focus-ring flex flex-col gap-2 rounded-xl border-[1.5px] p-4 text-left {wizard.curriculum ===
							c.value
								? 'border-lms-interactive bg-lms-interactive-subtle'
								: 'border-lms-border'}"
							onclick={() => (wizard.curriculum = c.value)}
						>
							<span class="flex items-center justify-between gap-2"
								><span class="text-base font-bold">{c.label}</span><span
									class="flex size-5 items-center justify-center rounded-full border {wizard.curriculum ===
									c.value
										? 'bg-lms-interactive border-lms-interactive text-lms-on-interactive'
										: 'border-lms-border-strong'}"
									>{#if wizard.curriculum === c.value}<Icon icon={Check} size="sm" />{/if}</span
								></span
							>
							<span class="text-lms-muted text-[13px]">{t(`curriculum_desc_${c.value}`)}</span>
						</button>
					{/each}
				</div>
				{#if wizard.errors.curriculum}<span class="text-lms-danger-text text-xs"
						>{wizard.errors.curriculum}</span
					>{/if}
				{#if setup.phases.length}
					<div class="border-lms-border flex flex-col rounded-xl border">
						<span class="px-4 py-2.5 text-sm font-semibold"
							>{t('phases_title', { level: setup.school.level })}</span
						>
						{#each setup.phases as p (p.code)}
							<div class="border-lms-border flex justify-between border-t px-4 py-2 text-[13px]">
								<span class="font-semibold">{t('phase', { code: p.code })}</span><span
									class="text-lms-muted"
									>{p.grade_from === p.grade_to
										? t('grade_single', { grade: p.grade_from })
										: t('grade_range', { from: p.grade_from, to: p.grade_to })}</span
								>
							</div>
						{/each}
					</div>
				{/if}
			{:else if wizard.current === 2}
				<div class="grid gap-4 sm:grid-cols-3">
					<label class="flex flex-col gap-1.5"
						><span class="text-[13px] font-semibold"
							>{t('year_name')}<span class="text-lms-danger-text"> *</span></span
						><input
							class={inputClass(wizard.errors.name, true)}
							placeholder="2026/2027"
							bind:value={wizard.year.name}
						/>{#if wizard.errors.name}<span class="text-lms-danger-text text-xs"
								>{wizard.errors.name}</span
							>{/if}</label
					>
					<label class="flex flex-col gap-1.5"
						><span class="text-[13px] font-semibold"
							>{t('start')}<span class="text-lms-danger-text"> *</span></span
						><input
							type="date"
							class={inputClass(wizard.errors.start)}
							bind:value={wizard.year.start}
						/></label
					>
					<label class="flex flex-col gap-1.5"
						><span class="text-[13px] font-semibold"
							>{t('end')}<span class="text-lms-danger-text"> *</span></span
						><input
							type="date"
							class={inputClass(wizard.errors.end)}
							bind:value={wizard.year.end}
						/>{#if wizard.errors.end}<span class="text-lms-danger-text text-xs"
								>{wizard.errors.end}</span
							>{/if}</label
					>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					{#each [1, 2] as term (term)}
						{@const on = wizard.year.term === term}
						<div
							class="flex flex-col gap-3 rounded-xl border-[1.5px] p-4 {on
								? 'border-lms-interactive bg-lms-interactive-subtle'
								: 'border-lms-border'}"
						>
							<div class="flex items-center justify-between gap-2">
								<span class="text-sm font-bold">{term === 1 ? t('term_odd') : t('term_even')}</span>
								<button
									type="button"
									class="lms-focus-ring inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold {on
										? 'bg-lms-interactive text-lms-on-interactive border-lms-interactive'
										: 'border-lms-border text-lms-muted'}"
									onclick={() => (wizard.year.term = term)}
									><Icon icon={on ? CircleDot : Circle} size="sm" />{on
										? t('term_active')
										: t('term_make_active')}</button
								>
							</div>
							<div class="grid grid-cols-2 gap-2">
								<label class="flex flex-col gap-1"
									><span class="text-xs font-semibold">{t('start')}</span><input
										type="date"
										class={inputClass(wizard.errors.semesters)}
										bind:value={wizard.year[term === 1 ? 's1Start' : 's2Start']}
									/></label
								>
								<label class="flex flex-col gap-1"
									><span class="text-xs font-semibold">{t('end')}</span><input
										type="date"
										class={inputClass(wizard.errors.semesters)}
										bind:value={wizard.year[term === 1 ? 's1End' : 's2End']}
									/></label
								>
							</div>
						</div>
					{/each}
				</div>
				{#if wizard.errors.semesters}<span class="text-lms-danger-text text-xs"
						>{wizard.errors.semesters}</span
					>{/if}
				<span class="text-lms-muted flex items-center gap-1.5 text-xs"
					><Icon icon={Info} size="sm" />{t('term_note', {
						tz: setup.school.timezone || 'WIB'
					})}</span
				>
			{:else if wizard.current === 3}
				<div class="flex flex-wrap items-center gap-3">
					<span class="text-[13px] font-semibold">{t('pattern')}</span>
					<Segmented
						label={t('pattern')}
						value={wizard.scheme}
						onchange={(v) => (wizard.scheme = v)}
						options={[
							{ value: 'huruf', label: 'X-A' },
							{ value: 'angka', label: 'X-1' }
						]}
					/>
					<span class="flex-1"></span>
					<button
						type="button"
						class="lms-action-secondary lms-focus-ring inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold"
						onclick={() => onimport('classes')}
						><Icon icon={FileUp} size="sm" />{t('import_classes')}</button
					>
				</div>
				{#each wizard.grades as g (g.grade)}
					<div class="border-lms-border flex flex-col gap-3 rounded-xl border p-4">
						<div class="flex flex-wrap items-center gap-3">
							<span class="flex flex-[1_1_160px] flex-col"
								><span class="text-sm font-bold">{t('grade_label', { grade: g.grade })}</span><span
									class="text-lms-muted text-xs"
									>{t('grade_sub', {
										phase: g.phase || wizard.phaseOfGrade(g.grade) || '—',
										count: g.count
									})}</span
								></span
							>
							<label class="text-lms-muted flex items-center gap-2 text-xs"
								>{t('capacity')}<input
									type="number"
									min="1"
									max={MAX_CAPACITY}
									class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-9 w-16 rounded-lg px-2 text-center text-sm"
									bind:value={g.capacity}
								/></label
							>
							<div class="border-lms-border flex items-center overflow-hidden rounded-lg border">
								<button
									type="button"
									aria-label={t('group_dec')}
									class="lms-focus-ring flex size-9 items-center justify-center disabled:opacity-40"
									disabled={g.count <= 0}
									onclick={() => (g.count = Math.max(0, g.count - 1))}
									><Icon icon={Minus} size="sm" /></button
								>
								<span class="w-8 text-center text-sm font-bold tabular-nums">{g.count}</span>
								<button
									type="button"
									aria-label={t('group_inc')}
									class="lms-focus-ring flex size-9 items-center justify-center disabled:opacity-40"
									disabled={g.count >= MAX_GROUPS}
									onclick={() => (g.count = Math.min(MAX_GROUPS, g.count + 1))}
									><Icon icon={Plus} size="sm" /></button
								>
							</div>
						</div>
						<div class="flex flex-wrap gap-1.5">
							{#each wizard.previewNames(g) as name (name)}<span
									class="bg-lms-surface-muted rounded-md px-2 py-1 font-mono text-xs font-semibold"
									>{name}</span
								>{:else}<span class="text-lms-muted text-xs">{t('grade_none')}</span>{/each}
						</div>
					</div>
				{/each}
				<span class="text-xs {wizard.errors.classes ? 'text-lms-danger-text' : 'text-lms-muted'}"
					>{wizard.errors.classes ||
						t('classes_note', { count: wizard.totalClasses, year: setup.year.name })}</span
				>
			{:else}
				<div class="flex flex-wrap items-center gap-3">
					<span class="text-lms-muted flex-[1_1_260px] text-[13px]"
						>{t('subjects_intro', {
							curriculum:
								setup.curricula.find((c) => c.value === setup.school.curriculum)?.label ?? '',
							level: setup.school.level
						})}</span
					>
					<button
						type="button"
						class="lms-action-ghost lms-focus-ring h-9 rounded-lg px-3 text-xs font-semibold"
						onclick={() => wizard.toggleAllSubjects()}
						>{wizard.allOn ? t('subjects_none') : t('subjects_all')}</button
					>
					<button
						type="button"
						class="lms-action-secondary lms-focus-ring inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold"
						onclick={() => onimport('subjects')}
						><Icon icon={FileUp} size="sm" />{t('import_subjects')}</button
					>
				</div>
				<div class="border-lms-border flex flex-col rounded-xl border">
					<div
						class="text-lms-muted grid grid-cols-[36px_90px_minmax(0,1fr)_80px] gap-3 px-4 py-2 font-mono text-[10px] tracking-[0.1em]"
					>
						<span></span><span>{t('col_code')}</span><span>{t('col_subject')}</span><span>KKTP</span
						>
					</div>
					{#each wizard.subjects as s (s.code)}
						<div
							class="border-lms-border grid grid-cols-[36px_90px_minmax(0,1fr)_80px] items-center gap-3 border-t px-4 py-2 text-[13px] {s.enabled
								? ''
								: 'opacity-60'}"
						>
							<button
								type="button"
								role="checkbox"
								aria-checked={s.enabled}
								aria-label={s.name}
								class="lms-focus-ring flex size-6 items-center justify-center rounded-md border-[1.5px] {s.enabled
									? 'bg-lms-interactive border-lms-interactive text-lms-on-interactive'
									: 'border-lms-border-strong'}"
								onclick={() => (s.enabled = !s.enabled)}
								>{#if s.enabled}<Icon icon={Check} size="sm" />{/if}</button
							>
							<span class="font-mono text-xs font-semibold">{s.code}</span>
							<span class="flex items-center gap-2"
								>{s.name}{#if s.custom}<span
										class="lms-tone-info rounded px-1.5 py-0.5 text-[10px] font-bold"
										>{t('custom_badge')}</span
									>{/if}</span
							>
							<input
								type="number"
								min="0"
								max={KKTP_MAX}
								aria-label={`KKTP ${s.name}`}
								class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-8 w-16 rounded-md px-2 text-center text-sm"
								bind:value={s.kktp}
							/>
						</div>
					{/each}
					<div
						class="border-lms-border grid grid-cols-[36px_90px_minmax(0,1fr)_80px] items-center gap-3 border-t px-4 py-2"
					>
						<span class="text-lms-muted flex justify-center"><Icon icon={Plus} size="sm" /></span>
						<input
							class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-9 rounded-md px-2 font-mono text-xs uppercase"
							placeholder={t('custom_code')}
							bind:value={wizard.newCode}
						/>
						<input
							class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-9 rounded-md px-2 text-sm"
							placeholder={t('custom_name')}
							bind:value={wizard.newName}
						/>
						<button
							type="button"
							class="lms-action-secondary lms-focus-ring h-9 rounded-md text-xs font-semibold"
							onclick={() => wizard.addSubject()}>{t('custom_add')}</button
						>
					</div>
				</div>
				<span class="text-xs {wizard.errors.subjects ? 'text-lms-danger-text' : 'text-lms-muted'}"
					>{wizard.errors.subjects || t('subjects_note', { count: wizard.enabledSubjects })}</span
				>
			{/if}
		</div>

		<div class="border-lms-border flex flex-wrap items-center gap-3 border-t px-6 py-4">
			{#if wizard.current > 0 && !editOne}
				<button
					type="button"
					class="lms-action-secondary lms-focus-ring inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold"
					onclick={() => wizard.back()}><Icon icon={ArrowLeft} size="sm" />{t('back')}</button
				>
			{/if}
			<span class="text-lms-muted flex flex-[1_1_160px] items-center gap-1.5 text-xs"
				><Icon icon={CloudCheck} size="sm" />{wizard.savedOnce
					? t('saved_status')
					: t('autosave')}</span
			>
			<button
				type="button"
				class="lms-action-primary lms-focus-ring inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-bold disabled:opacity-60"
				disabled={wizard.busy}
				onclick={() => wizard.next()}
			>
				{editOne
					? t('save')
					: wizard.current === REQUIRED_SECTIONS.length - 1
						? t('finish_required')
						: t('save_next')}<Icon icon={ArrowRight} size="sm" />
			</button>
		</div>
	</section>
</div>
