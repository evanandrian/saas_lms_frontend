<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { resolve } from '$app/paths';
	import type {
		SchoolYearDetail,
		SchoolYearsView
	} from '$lib/features/school-admin/school-admin.types';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import FieldBox from '$lib/features/school-admin/components/FieldBox.svelte';
	import ListPanel, { type ListRow } from '$lib/features/school-admin/components/ListPanel.svelte';
	import ModuleShell from '$lib/features/school-admin/components/ModuleShell.svelte';
	import RecordDrawer from '$lib/features/school-admin/components/RecordDrawer.svelte';
	import Segmented from '$lib/features/school-admin/components/Segmented.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import {
		PREFIX,
		RE,
		inputClass,
		sectionGap
	} from '$lib/features/school-admin/school-admin.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { formatDate } from '$lib/utils/format';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);

	// svelte-ignore state_referenced_locally
	let view = $state<SchoolYearsView | null>(data.view);
	const editor = createRecordEditor<SchoolYearsView>(i18n.t, (v) => (view = v));

	let query = $state('');
	let confirmDelete = $state(false);

	type Form = {
		name: string;
		start: string;
		end: string;
		active: boolean;
		s1Start: string;
		s1End: string;
		s2Start: string;
		s2End: string;
		term: string;
		copy: boolean;
	};
	let form = $state<Form>(blank());

	const items = $derived([...(view?.items ?? [])].sort((a, b) => b.name.localeCompare(a.name)));
	const termLabel = (term: number) =>
		term === 1 ? t('years.term_odd') : term === 2 ? t('years.term_even') : '—';

	const stats = $derived([
		{ label: t('years.stat_active'), value: view?.active_year || '—' },
		{
			label: t('years.stat_term'),
			value: termLabel(view?.active_term ?? 0),
			sub: view?.term_start
				? `${formatDate(view.term_start, i18n.locale)} – ${formatDate(view.term_end, i18n.locale)}`
				: ''
		},
		{ label: t('years.stat_classes'), value: view?.classes_count ?? 0 }
	]);
	const STATUS_TONE = { active: 'success', archived: 'neutral', upcoming: 'info' } as const;
	const rows: ListRow[] = $derived(
		items
			.filter((y) => !query.trim() || y.name.includes(query.trim()))
			.map((y) => ({
				id: y.id,
				initials: 'TA',
				name: y.name,
				code: t('years.classes_count', { count: y.class_count }),
				meta: `${formatDate(y.start, i18n.locale)} – ${formatDate(y.end, i18n.locale)}`,
				extra: y.active_term
					? t('years.term_until', {
							term: termLabel(y.active_term),
							date: formatDate(y.term_end, i18n.locale)
						})
					: '—',
				status: {
					label: t(`years.status_${y.status}`),
					tone: STATUS_TONE[y.status as keyof typeof STATUS_TONE] ?? 'neutral'
				}
			}))
	);
	const gap = $derived(
		sectionGap(i18n.t, data.schoolProgress, 'year', resolve(APP_PATHS.SCHOOL_ADMIN_SETUP))
	);
	const current = $derived(items.find((y) => y.id === editor.editId) ?? null);

	/** Usulan tahun berikutnya dari tahun ajaran aktif (referensi: TTTT/TTTT, semester berurutan). */
	function blank(): Form {
		const base = Number((view?.active_year ?? '').slice(0, 4)) || new Date().getFullYear();
		const n = view?.active_year ? base + 1 : base;
		return {
			name: `${n}/${n + 1}`,
			start: `${n}-07-13`,
			end: `${n + 1}-06-25`,
			active: !view?.active_year,
			s1Start: `${n}-07-13`,
			s1End: `${n}-12-18`,
			s2Start: `${n + 1}-01-04`,
			s2End: `${n + 1}-06-25`,
			term: '1',
			copy: Boolean(view?.active_year)
		};
	}

	async function openRecord(id: string | null) {
		form = blank();
		editor.show(id);
		if (!id) return;
		const y = await editor.run<SchoolYearDetail>('detail', { id });
		// Abaikan respons basi (drawer sudah ditutup / beralih ke tahun lain).
		if (!editor.open || editor.editId !== id) return;
		// Detail gagal dimuat → tutup drawer agar form usulan tidak tersimpan sebagai data tahun ini.
		if (!y) return editor.close();
		const s1 = y.semesters.find((s) => s.term === 1);
		const s2 = y.semesters.find((s) => s.term === 2);
		form = {
			name: y.name,
			start: y.start,
			end: y.end,
			active: y.active,
			s1Start: s1?.start ?? '',
			s1End: s1?.end ?? '',
			s2Start: s2?.start ?? '',
			s2End: s2?.end ?? '',
			term: String(y.active_term || 1),
			copy: false
		};
	}

	async function save() {
		const e: Record<string, string> = {};
		if (!RE.year.test(form.name.trim())) e.name = t('errors.year_format');
		if (!form.start) e.start = t('errors.required');
		if (!form.end || form.end <= form.start) e.end = t('errors.end_after_start');
		if (!(form.s1End > form.s1Start && form.s2Start > form.s1End && form.s2End > form.s2Start))
			e.semesters = t('errors.semester_order');
		if (current?.active && !form.active) e.active = t('errors.keep_one_active');
		editor.setErrors(e);
		if (Object.keys(e).length) return;
		await editor.save(
			{
				name: form.name.trim(),
				start: form.start,
				end: form.end,
				active: form.active,
				active_term: Number(form.term),
				copy_classes: !editor.editId && form.copy,
				semesters: [
					{ term: 1, start: form.s1Start, end: form.s1End, active: false },
					{ term: 2, start: form.s2Start, end: form.s2End, active: false }
				]
			},
			{ added: t('common.added'), saved: t('common.saved') }
		);
	}
</script>

<svelte:head><title>{t('years.title')} · FLIXARE</title></svelte:head>

{#if !view}
	<StatePanel
		tone="error"
		title={t('common.load_failed')}
		description={t(`failure.${data.failure}`)}
	/>
{:else}
	<ModuleShell
		eyebrow={t('years.eyebrow')}
		title={t('years.title')}
		description={t('years.desc')}
		{gap}
		{stats}
		help="help.school_admin_years"
	>
		{#snippet actions()}
			<button
				type="button"
				class="bg-lms-on-hero text-lms-brand-deep-neutral hover:bg-lms-on-hero/90 lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-semibold disabled:opacity-50"
				onclick={() => openRecord(null)}><Icon icon={Plus} size="sm" />{t('years.add')}</button
			>
		{/snippet}
		<ListPanel
			heads={[
				t('years.head_year'),
				t('years.head_period'),
				t('years.head_term'),
				t('years.head_status')
			]}
			{rows}
			{query}
			searchPlaceholder={t('years.search')}
			searchLabel={t('common.search')}
			tabs={[{ key: 'all', label: t('common.all'), count: items.length }]}
			tab="all"
			tabsLabel={t('common.filter')}
			emptyText={items.length ? t('common.no_match') : t('years.empty')}
			footNote={t('years.foot')}
			onquery={(v) => (query = v)}
			ontab={() => {}}
			onopen={(id) => openRecord(id)}
		/>
	</ModuleShell>

	<RecordDrawer
		open={editor.open}
		eyebrow={`${editor.editId ? t('common.edit') : t('common.new')} · ${t('years.title').toUpperCase()}`}
		title={editor.editId ? form.name : t('years.add')}
		hint={editor.hasErrors ? t('common.check_fields') : t('common.required_hint')}
		hasErrors={editor.hasErrors}
		busy={editor.busy}
		saveLabel={t('common.save')}
		cancelLabel={t('common.cancel')}
		closeLabel={t('common.close')}
		deleteLabel={editor.editId && !current?.active ? t('common.delete') : undefined}
		onclose={() => editor.close()}
		onsave={save}
		ondelete={editor.editId && !current?.active ? () => (confirmDelete = true) : undefined}
	>
		<div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
			<FieldBox label={t('fields.year_name')} for="y-name" required error={editor.errors.name}>
				<input
					id="y-name"
					class={inputClass(editor.errors.name, true)}
					placeholder="2027/2028"
					bind:value={form.name}
					oninput={() => editor.clearError('name')}
				/>
			</FieldBox>
			<FieldBox
				label={t('fields.status')}
				error={editor.errors.active}
				note={t('years.active_note')}
			>
				<Segmented
					label={t('fields.status')}
					value={form.active ? 'yes' : 'no'}
					onchange={(v) => {
						form.active = v === 'yes';
						editor.clearError('active');
					}}
					options={[
						{ value: 'yes', label: t('common.active') },
						{ value: 'no', label: t('common.inactive') }
					]}
				/>
			</FieldBox>
			<FieldBox label={t('fields.start')} for="y-start" required error={editor.errors.start}>
				<input
					id="y-start"
					type="date"
					class={inputClass(editor.errors.start)}
					bind:value={form.start}
				/>
			</FieldBox>
			<FieldBox label={t('fields.end')} for="y-end" required error={editor.errors.end}>
				<input id="y-end" type="date" class={inputClass(editor.errors.end)} bind:value={form.end} />
			</FieldBox>
			<FieldBox label={t('years.s1_start')} for="y-s1s" required>
				<input
					id="y-s1s"
					type="date"
					class={inputClass(editor.errors.semesters)}
					bind:value={form.s1Start}
				/>
			</FieldBox>
			<FieldBox label={t('years.s1_end')} for="y-s1e" required>
				<input
					id="y-s1e"
					type="date"
					class={inputClass(editor.errors.semesters)}
					bind:value={form.s1End}
				/>
			</FieldBox>
			<FieldBox label={t('years.s2_start')} for="y-s2s" required error={editor.errors.semesters}>
				<input
					id="y-s2s"
					type="date"
					class={inputClass(editor.errors.semesters)}
					bind:value={form.s2Start}
				/>
			</FieldBox>
			<FieldBox label={t('years.s2_end')} for="y-s2e" required>
				<input
					id="y-s2e"
					type="date"
					class={inputClass(editor.errors.semesters)}
					bind:value={form.s2End}
				/>
			</FieldBox>
			<FieldBox label={t('years.active_term')} full>
				<Segmented
					label={t('years.active_term')}
					value={form.term}
					onchange={(v) => (form.term = v)}
					options={[
						{ value: '1', label: t('years.term_odd') },
						{ value: '2', label: t('years.term_even') }
					]}
				/>
			</FieldBox>
			{#if !editor.editId}
				<FieldBox label={t('years.copy')} full note={t('years.copy_note')}>
					<Segmented
						label={t('years.copy')}
						value={form.copy ? 'yes' : 'no'}
						onchange={(v) => (form.copy = v === 'yes')}
						options={[
							{ value: 'yes', label: t('years.copy_yes') },
							{ value: 'no', label: t('years.copy_no') }
						]}
					/>
				</FieldBox>
			{/if}
		</div>
	</RecordDrawer>

	<ConfirmDialog
		bind:open={confirmDelete}
		tone="danger"
		icon={Trash2}
		title={t('years.delete_title')}
		message={t('years.delete_message')}
		confirmLabel={t('common.delete')}
		busyLabel={t('common.deleting')}
		cancelLabel={t('common.cancel')}
		onconfirm={async () => {
			if (editor.editId) await editor.remove(editor.editId, t('common.deleted'));
		}}
	/>
	<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
{/if}
