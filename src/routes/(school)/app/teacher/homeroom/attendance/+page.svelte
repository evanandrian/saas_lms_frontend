<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { SchoolHomeroomAttendanceView } from '$lib/features/school-admin/school-admin.types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import ModuleShell from '$lib/features/school-admin/components/ModuleShell.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import {
		ATTENDANCE_STATUSES,
		PREFIX,
		shiftDate,
		type AttendanceStatus
	} from '$lib/features/school-admin/school-admin.model';
	import { useI18n } from '$lib/i18n';
	import { formatDateTime } from '$lib/utils/format';
	import Check from '@lucide/svelte/icons/check';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.homeroom.${key}`, params);

	let override = $state<SchoolHomeroomAttendanceView | null>(null);
	const view = $derived(override ?? data.view);
	let entries = $state<Record<string, { status: AttendanceStatus | ''; note: string }>>({});

	// Isian lokal mengikuti data tanggal yang dibuka; murid yang belum diisi default "Hadir".
	$effect(() => {
		const v = data.view;
		override = null;
		entries = Object.fromEntries(
			(v?.students ?? []).map((s) => [
				s.id,
				{ status: (s.status || 'present') as AttendanceStatus, note: s.note }
			])
		);
	});
	const editor = createRecordEditor<SchoolHomeroomAttendanceView>(i18n.t, (v) => (override = v));

	const TONE: Record<AttendanceStatus, string> = {
		present: 'lms-tone-success',
		sick: 'lms-tone-info',
		permit: 'lms-tone-warning',
		absent: 'lms-tone-danger'
	};
	const counts = $derived(
		ATTENDANCE_STATUSES.map((s) => ({
			status: s,
			count: Object.values(entries).filter((e) => e.status === s).length
		}))
	);
	const isToday = $derived(view ? view.date >= view.today : true);
	const atStart = $derived(view ? view.date <= view.min_date : true);
	const dayLabel = $derived(
		view
			? formatDateTime(view.date, i18n.locale, {
					weekday: 'long',
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})
			: ''
	);

	function go(date: string) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- path sudah lewat resolve(); hanya query tanggal/mode
		void goto(`${resolve('/app/teacher/homeroom/attendance')}?date=${date}`, { noScroll: true });
	}

	function setAll(status: AttendanceStatus) {
		entries = Object.fromEntries(Object.entries(entries).map(([id, e]) => [id, { ...e, status }]));
	}

	async function save() {
		if (!view) return;
		const out = await editor.run<SchoolHomeroomAttendanceView>('save', {
			data: {
				date: view.date,
				entries: Object.entries(entries).map(([student_id, e]) => ({
					student_id,
					status: e.status || 'present',
					note: e.note.trim()
				}))
			}
		});
		if (out) {
			override = out;
			editor.notify(t('saved'));
		}
	}
</script>

<svelte:head><title>{t('title')} · FLIXARE</title></svelte:head>

{#if !view}
	<StatePanel
		tone={data.failure === 'forbidden' ? 'warning' : 'error'}
		title={data.failure === 'forbidden'
			? t('not_homeroom_title')
			: i18n.t(`${PREFIX}.common.load_failed`)}
		description={data.failure === 'forbidden'
			? t('not_homeroom_desc')
			: i18n.t(`${PREFIX}.failure.${data.failure}`)}
	/>
{:else}
	<ModuleShell
		eyebrow={t('eyebrow')}
		title={t('title_class', { class: view.class })}
		description={t('desc')}
		help="help.homeroom_attendance"
		stats={counts.map((c) => ({
			label: i18n.t(`${PREFIX}.attendance_status.${c.status}`),
			value: c.count,
			tone: c.status === 'absent' && c.count ? 'danger' : 'default'
		}))}
	>
		<div class="lms-card flex flex-col rounded-xl">
			<div class="border-lms-border flex flex-wrap items-center gap-2.5 border-b px-4 py-3">
				<button
					type="button"
					aria-label={t('prev_day')}
					class="lms-action-ghost lms-focus-ring flex size-8 items-center justify-center rounded-md disabled:opacity-40"
					disabled={atStart}
					onclick={() => go(shiftDate(view.date, -1))}><Icon icon={ChevronLeft} size="sm" /></button
				>
				<span class="min-w-[220px] text-center text-[13px] font-semibold"
					>{view.date === view.today ? `${t('today')} · ` : ''}{dayLabel}</span
				>
				<button
					type="button"
					aria-label={t('next_day')}
					class="lms-action-ghost lms-focus-ring flex size-8 items-center justify-center rounded-md disabled:opacity-40"
					disabled={isToday}
					onclick={() => go(shiftDate(view.date, 1))}><Icon icon={ChevronRight} size="sm" /></button
				>
				<span class="flex-1"></span>
				{#if view.filled}<span
						class="lms-tone-success rounded-full px-2.5 py-1 text-xs font-semibold"
						>{t('filled')}</span
					>{/if}
				<button
					type="button"
					class="lms-action-secondary lms-focus-ring h-8 rounded-lg px-3 text-xs font-semibold"
					disabled={view.holiday}
					onclick={() => setAll('present')}>{t('all_present')}</button
				>
			</div>
			{#if view.holiday}
				<p class="text-lms-muted px-4 py-9 text-center text-sm">{t('holiday')}</p>
			{:else}
				<div class="overflow-x-auto">
					<div class="min-w-[640px]">
						{#each view.students as s, index (s.id)}
							{@const entry = entries[s.id]}
							<div
								class="border-lms-border grid grid-cols-[36px_minmax(0,1.4fr)_auto_minmax(0,1fr)] items-center gap-3 border-b px-4 py-2.5 text-[13px]"
							>
								<span class="text-lms-muted font-mono text-xs">{index + 1}</span>
								<span class="flex min-w-0 flex-col"
									><span class="truncate font-semibold">{s.name}</span><span
										class="text-lms-muted font-mono text-[11px]">NIS {s.nis}</span
									></span
								>
								<div
									role="radiogroup"
									aria-label={t('status_of', { name: s.name })}
									class="flex gap-1"
								>
									{#each ATTENDANCE_STATUSES as status (status)}
										<button
											type="button"
											role="radio"
											aria-checked={entry?.status === status}
											class="lms-focus-ring h-8 rounded-lg px-2.5 text-xs font-semibold {entry?.status ===
											status
												? TONE[status]
												: 'bg-lms-surface-muted text-lms-muted'}"
											onclick={() => entry && (entry.status = status)}
											>{i18n.t(`${PREFIX}.attendance_status.${status}`)}</button
										>
									{/each}
								</div>
								<input
									aria-label={t('note_of', { name: s.name })}
									class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-8 rounded-lg px-2 text-xs"
									placeholder={t('note_ph')}
									maxlength="200"
									value={entry?.note ?? ''}
									oninput={(e) => entry && (entry.note = e.currentTarget.value)}
								/>
							</div>
						{:else}
							<p class="text-lms-muted px-4 py-9 text-center text-sm">{t('no_students')}</p>
						{/each}
					</div>
				</div>
			{/if}
			<div class="flex flex-wrap items-center gap-3 px-4 py-3">
				<span class="text-lms-muted flex-1 text-xs">{t('foot')}</span>
				<button
					type="button"
					class="lms-action-primary lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] px-5 text-sm font-bold disabled:opacity-50"
					disabled={editor.busy || view.holiday || !view.students.length}
					onclick={save}
					><Icon icon={Check} size="sm" />{view.filled ? t('update') : t('save')}</button
				>
			</div>
		</div>
	</ModuleShell>
	<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
{/if}
