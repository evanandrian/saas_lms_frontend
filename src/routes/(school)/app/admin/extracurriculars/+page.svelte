<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Users from '@lucide/svelte/icons/users';
	import { invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import ExtraMembersDrawer from '$lib/features/school-admin/components/ExtraMembersDrawer.svelte';
	import FieldBox from '$lib/features/school-admin/components/FieldBox.svelte';
	import ModuleShell from '$lib/features/school-admin/components/ModuleShell.svelte';
	import RecordDrawer from '$lib/features/school-admin/components/RecordDrawer.svelte';
	import Segmented from '$lib/features/school-admin/components/Segmented.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import {
		EXTRA_NAME_MAX,
		EXTRA_PLACE_MAX,
		PREFIX,
		PROGRESS_DEPENDENCY_KEY,
		WEEKDAYS,
		extraBody,
		extraDeleteMessage,
		extraErrors,
		extraForm,
		failureMessage,
		inputClass,
		inputMaxLength,
		sectionGap,
		type ExtraForm
	} from '$lib/features/school-admin/school-admin.model';
	import type {
		SchoolExtraMembersView,
		SchoolPlanExtra,
		SchoolPlanningView,
		SchoolStudentRow,
		SchoolStudentsView
	} from '$lib/features/school-admin/school-admin.types';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { runPageAction } from '$lib/utils/page-action';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);

	// svelte-ignore state_referenced_locally
	let planning = $state<SchoolPlanningView | null>(data.planning);
	const editor = createRecordEditor<SchoolPlanningView>(i18n.t, (v) => (planning = v));

	let form = $state<ExtraForm>(extraForm(null));
	let confirmDelete = $state(false);
	/** Ekskul yang anggotanya sedang dikelola (drawer anggota terbuka bila terisi). */
	let membersOf = $state<SchoolPlanExtra | null>(null);
	let members = $state<SchoolExtraMembersView | null>(null);
	let students = $state<SchoolStudentRow[]>([]);
	/** Permintaan drawer anggota yang sedang berjalan (terpisah dari editor form ekskul). */
	let membersPending = $state(0);
	const membersBusy = $derived(membersPending > 0);

	const extras = $derived(planning?.extras ?? []);
	const current = $derived(extras.find((x) => x.id === editor.editId) ?? null);
	/** Opsi pembina; pembina tersimpan yang tidak lagi ada di daftar guru tetap ditampilkan. */
	const coachOptions = $derived.by(() => {
		const options = planning?.teachers ?? [];
		if (!current?.coach_id || options.some((o) => o.value === current.coach_id)) return options;
		return [...options, { value: current.coach_id, label: current.coach_name || '—' }];
	});
	const stats = $derived([
		{ label: t('extras.stat_count'), value: extras.length },
		{
			label: t('extras.stat_members'),
			value: extras.reduce((sum, x) => sum + (x.member_count ?? 0), 0)
		},
		{ label: t('extras.stat_mandatory'), value: extras.filter((x) => x.is_mandatory).length }
	]);
	const gap = $derived(
		sectionGap(i18n.t, data.schoolProgress, 'extras', resolve(APP_PATHS.SCHOOL_ADMIN_SETUP))
	);

	const dayLabel = (d: number | null | undefined) => (d ? t(`weekday.${d}`) : '');

	function schedule(x: SchoolPlanExtra) {
		const time = x.start_time && x.end_time ? `${x.start_time}–${x.end_time}` : '';
		const text = [dayLabel(x.schedule_day), time].filter(Boolean).join(' ');
		return text || t('extras.no_schedule');
	}

	function openRecord(id: string | null) {
		form = extraForm(extras.find((x) => x.id === id));
		editor.show(id);
	}

	/** Setelah ekskul berubah: tampilan terbaru + status bagian setup (banner celah data). */
	function applyPlanning(view: SchoolPlanningView) {
		planning = view;
		void invalidate(PROGRESS_DEPENDENCY_KEY);
	}

	async function save() {
		const errors = extraErrors(form, i18n.t);
		editor.setErrors(errors);
		if (Object.keys(errors).length) return;
		const wasEdit = Boolean(editor.editId);
		// PUT = penggantian penuh: extraBody selalu mengirim semua atribut.
		const view = await editor.run<SchoolPlanningView>('extraSave', {
			id: editor.editId ?? '',
			data: extraBody(form)
		});
		if (!view) return;
		applyPlanning(view);
		editor.close();
		editor.notify(t(wasEdit ? 'common.saved' : 'common.added'));
	}

	async function remove() {
		if (!editor.editId) return;
		const view = await editor.run<SchoolPlanningView>('extraRemove', { id: editor.editId });
		if (!view) return;
		applyPlanning(view);
		editor.close();
		editor.notify(t('common.deleted'));
	}

	/**
	 * Runner drawer anggota: busy berbasis hitungan (aman untuk Promise.all) dan galat hanya sebagai
	 * toast — tidak menulis `errors` form ekskul milik editor.
	 */
	async function runMembers<R>(name: string, body: unknown): Promise<R | null> {
		membersPending++;
		try {
			const out = await runPageAction<R>(name, body);
			if (out.ok) return out.data;
			editor.notify(failureMessage(i18n.t, out), true);
			return null;
		} finally {
			membersPending--;
		}
	}

	async function openMembers(x: SchoolPlanExtra) {
		membersOf = x;
		members = null;
		const [m, s] = await Promise.all([
			runMembers<SchoolExtraMembersView>('extraMembers', { id: x.id }),
			students.length ? Promise.resolve(null) : runMembers<SchoolStudentsView>('students', {})
		]);
		if (s) students = s.items;
		if (membersOf?.id !== x.id) return; // respons basi (drawer ditutup / ekskul lain dibuka)
		if (!m) {
			membersOf = null;
			return;
		}
		members = m;
	}

	async function membersCall(name: string, body: Record<string, unknown>) {
		const target = membersOf;
		if (!target) return;
		const m = await runMembers<SchoolExtraMembersView>(name, { id: target.id, ...body });
		if (!m) return;
		if (membersOf?.id === target.id) members = m;
		editor.notify(t('common.saved'));
		// member_count di kartu & statistik.
		const p = await runMembers<SchoolPlanningView>('planning', {});
		if (p) planning = p;
	}
</script>

<svelte:head><title>{t('extras.title')} · FLIXARE</title></svelte:head>

{#if !planning}
	<StatePanel
		tone="error"
		title={t('common.load_failed')}
		description={t(`failure.${data.failure}`)}
	/>
{:else}
	<ModuleShell
		eyebrow={t('extras.eyebrow')}
		title={t('extras.title')}
		description={t('extras.desc')}
		{gap}
		{stats}
		help="help.school_admin_extracurriculars"
	>
		{#snippet actions()}
			<button
				type="button"
				class="bg-lms-on-hero text-lms-brand-deep-neutral hover:bg-lms-on-hero/90 lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-semibold"
				onclick={() => openRecord(null)}><Icon icon={Plus} size="sm" />{t('extras.add')}</button
			>
		{/snippet}
		{#if extras.length}
			<ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each extras as x (x.id)}
					<li
						class="border-lms-border bg-lms-surface flex flex-col gap-2 rounded-xl border p-4 text-[13px]"
					>
						<div class="flex items-start gap-2">
							<span class="flex-1 text-sm font-bold">{x.name}</span>
							{#if x.is_mandatory}
								<span
									class="lms-tone-warning rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide"
									>{t('extras.mandatory')}</span
								>
							{/if}
						</div>
						<span class="text-lms-muted">{t('planning.coach', { name: x.coach_name || '—' })}</span>
						<span>{schedule(x)}</span>
						{#if x.place}<span class="text-lms-muted">{x.place}</span>{/if}
						<span class="font-semibold">{t('extras.members', { count: x.member_count ?? 0 })}</span>
						<div class="mt-auto flex gap-2 pt-2">
							<button
								type="button"
								class="lms-action-secondary lms-focus-ring h-9 rounded-lg px-3 text-xs font-semibold"
								onclick={() => openRecord(x.id)}>{t('extras.edit')}</button
							>
							<button
								type="button"
								class="lms-action-secondary lms-focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
								onclick={() => openMembers(x)}
								><Icon icon={Users} size="sm" />{t('extras.manage_members')}</button
							>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<StatePanel title={t('extras.empty')} />
		{/if}
	</ModuleShell>

	<RecordDrawer
		open={editor.open}
		eyebrow={`${editor.editId ? t('common.edit') : t('common.new')} · ${t('extras.title').toUpperCase()}`}
		title={editor.editId ? (current?.name ?? form.name) : t('extras.add')}
		hint={editor.hasErrors ? t('common.check_fields') : t('common.required_hint')}
		hasErrors={editor.hasErrors}
		busy={editor.busy}
		saveLabel={t('common.save')}
		cancelLabel={t('common.cancel')}
		closeLabel={t('common.close')}
		deleteLabel={editor.editId ? t('common.delete') : undefined}
		onclose={() => editor.close()}
		onsave={save}
		ondelete={editor.editId ? () => (confirmDelete = true) : undefined}
	>
		<div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
			<FieldBox
				label={t('extras.field_name')}
				for="ex-name"
				required
				full
				error={editor.errors.name}
			>
				<input
					id="ex-name"
					maxlength={inputMaxLength(EXTRA_NAME_MAX)}
					class={inputClass(editor.errors.name)}
					bind:value={form.name}
					oninput={() => editor.clearError('name')}
				/>
			</FieldBox>
			<FieldBox
				label={t('planning.coach_label')}
				for="ex-coach"
				full
				error={editor.errors.coach_id}
			>
				<select
					id="ex-coach"
					class={inputClass(editor.errors.coach_id)}
					bind:value={form.coach_id}
					onchange={() => editor.clearError('coach_id')}
				>
					<option value="">{t('planning.coach_none')}</option>
					{#each coachOptions as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
				</select>
			</FieldBox>
			<FieldBox label={t('extras.field_day')} for="ex-day" error={editor.errors.schedule_day}>
				<select
					id="ex-day"
					class={inputClass(editor.errors.schedule_day)}
					bind:value={form.schedule_day}
					onchange={() => editor.clearError('schedule_day')}
				>
					<option value="">{t('common.not_set_option')}</option>
					{#each WEEKDAYS as d (d)}<option value={String(d)}>{t(`weekday.${d}`)}</option>{/each}
				</select>
			</FieldBox>
			<FieldBox label={t('extras.field_place')} for="ex-place" error={editor.errors.place}>
				<input
					id="ex-place"
					maxlength={inputMaxLength(EXTRA_PLACE_MAX)}
					class={inputClass(editor.errors.place)}
					bind:value={form.place}
					oninput={() => editor.clearError('place')}
				/>
			</FieldBox>
			<FieldBox label={t('extras.field_start')} for="ex-start" error={editor.errors.start_time}>
				<input
					id="ex-start"
					type="time"
					class={inputClass(editor.errors.start_time)}
					bind:value={form.start_time}
					oninput={() => editor.clearError('start_time')}
				/>
			</FieldBox>
			<FieldBox label={t('extras.field_end')} for="ex-end" error={editor.errors.end_time}>
				<input
					id="ex-end"
					type="time"
					class={inputClass(editor.errors.end_time)}
					bind:value={form.end_time}
					oninput={() => editor.clearError('end_time')}
				/>
			</FieldBox>
			<FieldBox label={t('extras.field_mandatory')} full note={t('extras.mandatory_note')}>
				<Segmented
					label={t('extras.field_mandatory')}
					value={form.is_mandatory ? 'yes' : 'no'}
					onchange={(v) => (form.is_mandatory = v === 'yes')}
					options={[
						{ value: 'yes', label: t('common.yes') },
						{ value: 'no', label: t('common.no') }
					]}
				/>
			</FieldBox>
		</div>
	</RecordDrawer>

	<ConfirmDialog
		bind:open={confirmDelete}
		tone="danger"
		icon={Trash2}
		title={t('planning.extra_delete_title', { name: current?.name ?? '' })}
		message={extraDeleteMessage(i18n.t, current?.member_count)}
		confirmLabel={t('common.delete')}
		busyLabel={t('common.deleting')}
		cancelLabel={t('common.cancel')}
		onconfirm={remove}
	/>

	<ExtraMembersDrawer
		open={membersOf !== null}
		name={membersOf?.name ?? ''}
		view={members}
		{students}
		classes={planning.classes}
		busy={membersBusy}
		onclose={() => {
			membersOf = null;
			members = null;
		}}
		onadd={(ids) => membersCall('extraMembersAdd', { studentIds: ids })}
		onaddclass={(id) => membersCall('extraMembersAdd', { classId: id })}
		onremove={(sid) => membersCall('extraMemberRemove', { studentId: sid })}
	/>
	<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
{/if}
