<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { resolve } from '$app/paths';
	import type {
		SchoolClassDetail,
		SchoolClassesView
	} from '$lib/features/school-admin/school-admin.types';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import FieldBox from '$lib/features/school-admin/components/FieldBox.svelte';
	import ImportWizard from '$lib/features/school-admin/components/ImportWizard.svelte';
	import ListPanel, { type ListRow } from '$lib/features/school-admin/components/ListPanel.svelte';
	import ModuleShell from '$lib/features/school-admin/components/ModuleShell.svelte';
	import RecordDrawer from '$lib/features/school-admin/components/RecordDrawer.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import { PREFIX, inputClass, sectionGap } from '$lib/features/school-admin/school-admin.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import FileUp from '@lucide/svelte/icons/file-up';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);
	const MAX_CAPACITY = 60;
	const DEFAULT_CAPACITY = 36;

	// svelte-ignore state_referenced_locally
	let view = $state<SchoolClassesView | null>(data.view);
	const editor = createRecordEditor<SchoolClassesView>(i18n.t, (v) => (view = v));

	let query = $state('');
	let tab = $state('all');
	let importOpen = $state(false);
	let confirmDelete = $state(false);
	let detail = $state<SchoolClassDetail | null>(null);

	type Form = { grade_id: string; name: string; capacity: string; homeroom_id: string };
	let form = $state<Form>({
		grade_id: '',
		name: '',
		capacity: String(DEFAULT_CAPACITY),
		homeroom_id: ''
	});

	const items = $derived(
		[...(view?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true }))
	);
	const grades = $derived(view?.grades ?? []);
	const noHomeroom = $derived(items.filter((c) => !c.homeroom_id).length);

	const stats = $derived([
		{
			label: t('classes.stat_classes'),
			value: items.length,
			sub: t('classes.grades_count', { count: grades.length })
		},
		{
			label: t('classes.stat_no_homeroom'),
			value: noHomeroom,
			tone: noHomeroom ? ('warning' as const) : ('default' as const)
		},
		{ label: t('classes.stat_students'), value: view?.students ?? 0 }
	]);
	const tabs = $derived([
		{ key: 'all', label: t('common.all'), count: items.length },
		...grades.map((g) => ({
			key: g.id,
			label: t('classes.grade_tab', { grade: g.grade }),
			count: items.filter((c) => c.grade_id === g.id).length
		})),
		{ key: 'nohr', label: t('classes.tab_no_homeroom'), count: noHomeroom }
	]);
	const rows: ListRow[] = $derived(
		items
			.filter((c) => tab === 'all' || c.grade_id === tab || (tab === 'nohr' && !c.homeroom_id))
			.filter((c) => !query.trim() || c.name.toLowerCase().includes(query.trim().toLowerCase()))
			.map((c) => {
				const full = c.capacity > 0 && c.students >= c.capacity;
				return {
					id: c.id,
					initials: c.name.split(/[- ]/).pop() ?? c.name,
					name: t('common.class_of', { class: c.name }),
					code: t('classes.code', { grade: c.grade, phase: c.phase || '—' }),
					meta: c.homeroom_name || t('common.not_set'),
					extra: `${c.students} / ${c.capacity || '—'}`,
					extraTone: full ? 'warning' : 'default',
					status: !c.homeroom_id
						? { label: t('classes.status_no_homeroom'), tone: 'warning' }
						: full
							? { label: t('classes.status_full'), tone: 'warning' }
							: { label: t('classes.status_complete'), tone: 'success' }
				};
			})
	);
	const gap = $derived(
		sectionGap(
			i18n.t,
			data.schoolProgress,
			'assign',
			resolve(APP_PATHS.SCHOOL_ADMIN_SETUP),
			t('classes.gap_why')
		)
	);

	async function openRecord(id: string | null) {
		detail = null;
		const c = id ? items.find((x) => x.id === id) : null;
		form = c
			? {
					grade_id: c.grade_id,
					name: c.name,
					capacity: c.capacity ? String(c.capacity) : '',
					homeroom_id: c.homeroom_id ?? ''
				}
			: {
					grade_id: grades[0]?.id ?? '',
					name: '',
					capacity: String(DEFAULT_CAPACITY),
					homeroom_id: ''
				};
		editor.show(id);
		if (id) detail = await editor.run<SchoolClassDetail>('detail', { id });
	}

	async function save() {
		const e: Record<string, string> = {};
		if (!form.grade_id) e.grade_id = t('errors.required');
		if (!form.name.trim()) e.name = t('errors.required');
		const cap = Number(form.capacity || 0);
		if (form.capacity && !(cap >= 1 && cap <= MAX_CAPACITY))
			e.capacity = t('errors.capacity_range');
		editor.setErrors(e);
		if (Object.keys(e).length) return;
		await editor.save(
			{
				grade_id: form.grade_id,
				name: form.name.trim().toUpperCase(),
				capacity: cap,
				homeroom_id: form.homeroom_id
			},
			{ added: t('common.added'), saved: t('common.saved') }
		);
	}

	async function refresh() {
		const out = await editor.run<SchoolClassesView>('refresh', {});
		if (out) view = out;
	}
</script>

<svelte:head><title>{t('classes.title')} · FLIXARE</title></svelte:head>

{#if !view}
	<StatePanel
		tone="error"
		title={t('common.load_failed')}
		description={t(`failure.${data.failure}`)}
	/>
{:else}
	<ModuleShell
		eyebrow={t('classes.eyebrow')}
		title={t('classes.title')}
		description={t('classes.desc', { year: view.year || '—' })}
		{gap}
		{stats}
		help="help.school_admin_classes"
	>
		{#snippet actions()}
			<button
				type="button"
				class="bg-lms-on-hero/8 border-lms-on-hero/14 text-lms-on-hero hover:bg-lms-on-hero/14 lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] border px-3.5 text-[13px] font-semibold disabled:opacity-50"
				onclick={() => (importOpen = true)}
				disabled={!view?.year_id}><Icon icon={FileUp} size="sm" />{t('common.import')}</button
			>
			<button
				type="button"
				class="bg-lms-on-hero text-lms-brand-deep-neutral hover:bg-lms-on-hero/90 lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-semibold disabled:opacity-50"
				onclick={() => openRecord(null)}
				disabled={!view?.year_id || !grades.length}
				><Icon icon={Plus} size="sm" />{t('classes.add')}</button
			>
		{/snippet}

		{#if !view.year_id}
			<StatePanel
				tone="warning"
				title={t('classes.no_year_title')}
				description={t('classes.no_year_desc')}
			>
				{#snippet actions()}<a
						class="lms-action-primary lms-focus-ring inline-flex h-10 items-center rounded-[10px] px-4 text-sm font-semibold"
						href={resolve(APP_PATHS.SCHOOL_ADMIN_YEARS)}>{t('classes.go_years')}</a
					>{/snippet}
			</StatePanel>
		{:else}
			<ListPanel
				heads={[
					t('classes.head_class'),
					t('classes.head_homeroom'),
					t('classes.head_capacity'),
					t('classes.head_status')
				]}
				{rows}
				{query}
				searchPlaceholder={t('classes.search')}
				searchLabel={t('common.search')}
				{tabs}
				{tab}
				tabsLabel={t('common.filter')}
				emptyText={items.length ? t('common.no_match') : t('common.empty_import')}
				importLabel={t('common.import_from')}
				footNote={t('common.shown', { count: rows.length })}
				onquery={(v) => (query = v)}
				ontab={(k) => (tab = k)}
				onopen={(id) => openRecord(id)}
				onimport={() => (importOpen = true)}
			/>
		{/if}
	</ModuleShell>

	<RecordDrawer
		open={editor.open}
		eyebrow={`${editor.editId ? t('common.edit') : t('common.new')} · ${t('classes.title').toUpperCase()}`}
		title={editor.editId ? t('common.class_of', { class: form.name }) : t('classes.add')}
		subtitle={detail ? t('classes.students_count', { count: detail.student_list.length }) : ''}
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
			<FieldBox label={t('fields.grade')} for="c-grade" required error={editor.errors.grade_id}>
				<select id="c-grade" class={inputClass(editor.errors.grade_id)} bind:value={form.grade_id}>
					{#each grades as g (g.id)}<option value={g.id}
							>{t('classes.grade_option', { grade: g.grade, phase: g.phase || '—' })}</option
						>{/each}
				</select>
			</FieldBox>
			<FieldBox label={t('fields.class_name')} for="c-name" required error={editor.errors.name}>
				<input
					id="c-name"
					class={inputClass(editor.errors.name, true)}
					placeholder="X-H"
					bind:value={form.name}
					oninput={() => editor.clearError('name')}
				/>
			</FieldBox>
			<FieldBox label={t('fields.capacity')} for="c-cap" error={editor.errors.capacity}>
				<input
					id="c-cap"
					type="number"
					min="1"
					max={MAX_CAPACITY}
					class={inputClass(editor.errors.capacity)}
					placeholder={String(DEFAULT_CAPACITY)}
					bind:value={form.capacity}
					oninput={() => editor.clearError('capacity')}
				/>
			</FieldBox>
			<FieldBox
				label={t('fields.homeroom')}
				for="c-hr"
				error={editor.errors.homeroom_id}
				note={t('classes.homeroom_note')}
			>
				<select
					id="c-hr"
					class={inputClass(editor.errors.homeroom_id)}
					bind:value={form.homeroom_id}
				>
					<option value="">{t('common.not_set_option')}</option>
					{#each view.teachers as teacher (teacher.value)}<option value={teacher.value}
							>{teacher.label}</option
						>{/each}
				</select>
			</FieldBox>
		</div>
		{#if detail}
			<div class="border-lms-border flex flex-col rounded-xl border">
				<span class="text-lms-muted px-3.5 py-2.5 font-mono text-[10px] tracking-[0.1em]"
					>{t('classes.student_list', { count: detail.student_list.length })}</span
				>
				{#each detail.student_list.slice(0, 40) as s (s.id)}
					<div
						class="border-lms-border flex justify-between gap-2.5 border-t px-3.5 py-2 text-[13px]"
					>
						<span class="font-semibold">{s.name}</span><span class="text-lms-muted"
							>NIS {s.nis}</span
						>
					</div>
				{:else}
					<span class="border-lms-border text-lms-muted border-t px-3.5 py-2 text-[13px]"
						>{t('classes.no_students')}</span
					>
				{/each}
			</div>
		{/if}
	</RecordDrawer>

	<ConfirmDialog
		bind:open={confirmDelete}
		tone="danger"
		icon={Trash2}
		title={t('classes.delete_title')}
		message={t('classes.delete_message')}
		confirmLabel={t('common.delete')}
		busyLabel={t('common.deleting')}
		cancelLabel={t('common.cancel')}
		onconfirm={async () => {
			if (editor.editId) await editor.remove(editor.editId, t('common.deleted'));
		}}
	/>

	{#if importOpen}
		<ImportWizard
			kind="classes"
			onclose={() => (importOpen = false)}
			ondone={async (n) => {
				if (n) editor.notify(t('common.imported', { count: n }));
				await refresh();
			}}
		/>
	{/if}
	<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
{/if}
