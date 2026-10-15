<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Plus from '@lucide/svelte/icons/plus';
	import { invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import FieldBox from '$lib/features/school-admin/components/FieldBox.svelte';
	import ListPanel, { type ListRow } from '$lib/features/school-admin/components/ListPanel.svelte';
	import ModuleShell from '$lib/features/school-admin/components/ModuleShell.svelte';
	import ObjectivesPanel from '$lib/features/school-admin/components/planning/ObjectivesPanel.svelte';
	import RecordDrawer from '$lib/features/school-admin/components/RecordDrawer.svelte';
	import Segmented from '$lib/features/school-admin/components/Segmented.svelte';
	import { PlanningDrawerState } from '$lib/features/school-admin/planning-drawer.state.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import {
		KKTP_MAX,
		PREFIX,
		PROGRESS_DEPENDENCY_KEY,
		parseKktp,
		inputClass,
		sectionGap,
		subjectIssueMessage,
		subjectIssues,
		subjectRows,
		subjectsPayload
	} from '$lib/features/school-admin/school-admin.model';
	import type {
		SchoolPlanningView,
		SchoolSetupState
	} from '$lib/features/school-admin/school-admin.types';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);

	// svelte-ignore state_referenced_locally
	let setup = $state<SchoolSetupState | null>(data.setup);
	// svelte-ignore state_referenced_locally
	let planning = $state<SchoolPlanningView | null>(data.planning);
	const editor = createRecordEditor<SchoolSetupState>(i18n.t, (v) => (setup = v));

	let query = $state('');
	let tab = $state('all');
	/** Mapel yang TP-nya sedang dikelola (drawer TP terbuka bila terisi). */
	let tpSubject = $state<string | null>(null);
	// Dibuat sekali (saat pertama dibuka); data perencanaan mengalir lewat getter.
	let planner = $state<PlanningDrawerState | null>(null);

	type Form = {
		code: string;
		name: string;
		kktp: string | number | null;
		enabled: boolean;
		custom: boolean;
	};
	let form = $state<Form>({ code: '', name: '', kktp: '', enabled: true, custom: true });

	const rows = $derived(setup && planning ? subjectRows(setup, planning) : []);
	const shown = $derived(
		rows
			.filter((r) => tab === 'all' || (tab === 'active' ? r.enabled : !r.enabled))
			.filter((r) => {
				const q = query.trim().toLowerCase();
				return !q || r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
			})
	);
	const list: ListRow[] = $derived(
		shown.map((r) => ({
			id: r.code,
			initials: r.code.slice(0, 3),
			name: r.name,
			code: r.code,
			meta: t('subjects.kktp_value', { value: r.kktp }),
			extra: r.id ? t('subjects.objectives_count', { count: r.objectives }) : '—',
			extraTone: r.id && !r.objectives ? 'warning' : 'default',
			status: r.enabled
				? { label: t('common.active'), tone: 'success' }
				: { label: t('common.inactive'), tone: 'neutral' }
		}))
	);
	const stats = $derived([
		{ label: t('subjects.stat_active'), value: rows.filter((r) => r.enabled).length },
		{ label: t('subjects.stat_objectives'), value: planning?.objectives.length ?? 0 },
		{
			label: t('subjects.stat_without_tp'),
			value: rows.filter((r) => r.id && !r.objectives).length
		}
	]);
	const gap = $derived(
		sectionGap(i18n.t, data.schoolProgress, 'subjects', resolve(APP_PATHS.SCHOOL_ADMIN_SETUP))
	);
	const current = $derived(rows.find((r) => r.code === editor.editId) ?? null);

	function openRecord(code: string | null) {
		const r = rows.find((x) => x.code === code);
		form = r
			? { code: r.code, name: r.name, kktp: String(r.kktp), enabled: r.enabled, custom: r.custom }
			: {
					code: '',
					name: '',
					kktp: String(setup?.default_kktp ?? ''),
					enabled: true,
					custom: true
				};
		editor.show(code);
	}

	function openObjectives(subjectId: string) {
		planner ??= new PlanningDrawerState({
			planning: () => planning!,
			key: () => 'objectives',
			t: i18n.t,
			onplanning: (v) => {
				planning = v;
				void invalidate(PROGRESS_DEPENDENCY_KEY);
			},
			onnotify: (m) => editor.notify(m)
		});
		planner.objSubject = subjectId;
		planner.editObjective = null;
		editor.close();
		tpSubject = subjectId;
	}

	async function save() {
		if (!setup) return;
		const e: Record<string, string> = {};
		const code = form.code.trim().toUpperCase();
		const kktp = parseKktp(form.kktp);
		const issues = subjectIssues(form, editor.editId ? null : rows.map((r) => r.code));
		for (const [field, issue] of Object.entries(issues))
			e[field] = subjectIssueMessage(i18n.t, issue);
		if (kktp === null) e.kktp = t('errors.kktp_range');
		editor.setErrors(e);
		if (Object.keys(e).length) return;
		const body = subjectsPayload(setup.subjects, {
			code: editor.editId ?? code,
			name: form.name,
			kktp: kktp!,
			enabled: form.enabled,
			custom: form.custom
		});
		// Mapel terpakai yang dinonaktifkan → 422 `subject_in_use`; editor.run menampilkan toast i18n.
		const wasEdit = Boolean(editor.editId);
		const next = await editor.run<SchoolSetupState>('subjects', { data: body });
		if (!next) return;
		setup = next;
		void invalidate(PROGRESS_DEPENDENCY_KEY);
		editor.close();
		editor.notify(t(wasEdit ? 'common.saved' : 'common.added'));
		const refreshed = await editor.run<SchoolPlanningView>('planning', {});
		if (refreshed) planning = refreshed;
	}
</script>

<svelte:head><title>{t('subjects.title')} · FLIXARE</title></svelte:head>

{#if !setup || !planning}
	<StatePanel
		tone="error"
		title={t('common.load_failed')}
		description={t(`failure.${data.failure}`)}
	/>
{:else}
	<ModuleShell
		eyebrow={t('subjects.eyebrow')}
		title={t('subjects.title')}
		description={t('subjects.desc')}
		{gap}
		{stats}
		help="help.school_admin_subjects"
	>
		{#snippet actions()}
			<button
				type="button"
				class="bg-lms-on-hero text-lms-brand-deep-neutral hover:bg-lms-on-hero/90 lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-semibold"
				onclick={() => openRecord(null)}><Icon icon={Plus} size="sm" />{t('subjects.add')}</button
			>
		{/snippet}
		<ListPanel
			heads={[
				t('subjects.head_subject'),
				t('subjects.head_kktp'),
				t('subjects.head_tp'),
				t('subjects.head_status')
			]}
			rows={list}
			{query}
			searchPlaceholder={t('subjects.search')}
			searchLabel={t('common.search')}
			tabs={[
				{ key: 'all', label: t('common.all'), count: rows.length },
				{ key: 'active', label: t('common.active'), count: rows.filter((r) => r.enabled).length },
				{
					key: 'inactive',
					label: t('common.inactive'),
					count: rows.filter((r) => !r.enabled).length
				}
			]}
			{tab}
			tabsLabel={t('common.filter')}
			emptyText={rows.length ? t('common.no_match') : t('subjects.empty')}
			footNote={t('subjects.foot')}
			onquery={(v) => (query = v)}
			ontab={(k) => (tab = k)}
			onopen={(code) => openRecord(code)}
		/>
	</ModuleShell>

	<RecordDrawer
		open={editor.open}
		eyebrow={`${editor.editId ? t('common.edit') : t('common.new')} · ${t('subjects.title').toUpperCase()}`}
		title={editor.editId ? form.name : t('subjects.add')}
		hint={editor.hasErrors ? t('common.check_fields') : t('common.required_hint')}
		hasErrors={editor.hasErrors}
		busy={editor.busy}
		saveLabel={t('common.save')}
		cancelLabel={t('common.cancel')}
		closeLabel={t('common.close')}
		onclose={() => editor.close()}
		onsave={save}
	>
		<div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
			<FieldBox
				label={t('subjects.field_code')}
				for="sb-code"
				required
				error={editor.errors.code}
				note={editor.editId ? t('subjects.code_locked') : t('subjects.code_note')}
			>
				<input
					id="sb-code"
					class={inputClass(editor.errors.code, true)}
					disabled={Boolean(editor.editId)}
					bind:value={form.code}
					oninput={() => editor.clearError('code')}
				/>
			</FieldBox>
			<FieldBox label={t('subjects.field_kktp')} for="sb-kktp" required error={editor.errors.kktp}>
				<input
					id="sb-kktp"
					type="number"
					min="0"
					max={KKTP_MAX}
					class={inputClass(editor.errors.kktp)}
					bind:value={form.kktp}
					oninput={() => editor.clearError('kktp')}
				/>
			</FieldBox>
			<FieldBox
				label={t('subjects.field_name')}
				for="sb-name"
				required
				full
				error={editor.errors.name}
			>
				<input
					id="sb-name"
					class={inputClass(editor.errors.name)}
					bind:value={form.name}
					oninput={() => editor.clearError('name')}
				/>
			</FieldBox>
			<FieldBox
				label={t('fields.status')}
				full
				note={t('subjects.inactive_note', { rule: t('subjects.foot') })}
			>
				<Segmented
					label={t('fields.status')}
					value={form.enabled ? 'yes' : 'no'}
					onchange={(v) => (form.enabled = v === 'yes')}
					options={[
						{ value: 'yes', label: t('common.active') },
						{ value: 'no', label: t('common.inactive') }
					]}
				/>
			</FieldBox>
			{#if current?.id}
				{@const subjectId = current.id}
				<div class="sm:col-span-2">
					<button
						type="button"
						class="lms-action-secondary lms-focus-ring h-9 rounded-lg px-3 text-xs font-semibold"
						onclick={() => openObjectives(subjectId)}
						>{t('subjects.open_tp', { count: current.objectives })}</button
					>
				</div>
			{/if}
		</div>
	</RecordDrawer>

	<Drawer
		bind:open={
			() => tpSubject !== null,
			(v) => {
				if (!v) tpSubject = null;
			}
		}
		label={t('subjects.tp_title')}
		closeLabel={t('common.close')}
	>
		{#if planner && planning}
			<div class="flex flex-col gap-4 p-2">
				<h2 class="text-base font-bold">
					{t('subjects.tp_title')} · {planner.subjectName(planner.objSubject)}
				</h2>
				<p class="text-lms-muted text-xs">{t('subjects.tp_note')}</p>
				<ObjectivesPanel {planner} {planning} lockSubject />
			</div>
		{/if}
	</Drawer>
	<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
{/if}
