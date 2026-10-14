<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { resolve } from '$app/paths';
	import type {
		SchoolInviteResult,
		SchoolTeacherDetail,
		SchoolTeachersView
	} from '$lib/features/school-admin/school-admin.types';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import AccountBox from '$lib/features/school-admin/components/AccountBox.svelte';
	import ActivationCodes from '$lib/features/school-admin/components/ActivationCodes.svelte';
	import FieldBox from '$lib/features/school-admin/components/FieldBox.svelte';
	import ImportWizard from '$lib/features/school-admin/components/ImportWizard.svelte';
	import InviteJobProgress from '$lib/features/school-admin/components/InviteJobProgress.svelte';
	import ListPanel, { type ListRow } from '$lib/features/school-admin/components/ListPanel.svelte';
	import ModuleShell from '$lib/features/school-admin/components/ModuleShell.svelte';
	import RecordDrawer from '$lib/features/school-admin/components/RecordDrawer.svelte';
	import Segmented from '$lib/features/school-admin/components/Segmented.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import {
		ACCOUNT_TONES,
		PREFIX,
		RE,
		initials,
		inputClass,
		normalizePhone,
		percent,
		phoneFieldNote,
		sectionGap,
		type AccountStatus
	} from '$lib/features/school-admin/school-admin.model';
	import { page } from '$app/state';
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

	// svelte-ignore state_referenced_locally
	let view = $state<SchoolTeachersView | null>(data.view);
	const editor = createRecordEditor<SchoolTeachersView>(i18n.t, (v) => (view = v));

	let query = $state('');
	let tab = $state('all');
	// Tombol "Impor" dari dashboard/03b membuka wizard langsung (?import=1).
	let importOpen = $state(page.url.searchParams.get('import') === '1');
	let confirmDelete = $state(false);
	let detail = $state<SchoolTeacherDetail | null>(null);
	let codes = $state<SchoolInviteResult['codes']>([]);
	let inviteJobs = $state<string[]>([]);

	type Form = {
		name: string;
		nip: string;
		gender: string;
		email: string;
		phone: string;
		active: boolean;
	};
	const EMPTY: Form = { name: '', nip: '', gender: 'L', email: '', phone: '', active: true };
	let form = $state<Form>({ ...EMPTY });

	const items = $derived(view?.items ?? []);
	const by = (status: AccountStatus) => items.filter((x) => x.status === status).length;
	const pending = $derived(items.filter((x) => x.status === 'not_invited'));

	const stats = $derived([
		{ label: t('teachers.stat_total'), value: items.length },
		{
			label: t('teachers.stat_active'),
			value: by('active'),
			bar: percent(by('active'), items.length),
			tone: 'success' as const
		},
		{ label: t('teachers.stat_invited'), value: by('invited') },
		{
			label: t('teachers.stat_not_invited'),
			value: by('not_invited'),
			tone: by('not_invited') ? ('warning' as const) : ('default' as const)
		}
	]);
	const tabs = $derived([
		{ key: 'all', label: t('common.all'), count: items.length },
		{ key: 'active', label: t('account.active'), count: by('active') },
		{ key: 'invited', label: t('account.invited'), count: by('invited') },
		{ key: 'not_invited', label: t('account.not_invited'), count: by('not_invited') }
	]);
	const rows: ListRow[] = $derived(
		items
			.filter((x) => tab === 'all' || x.status === tab)
			.filter((x) => {
				const q = query.trim().toLowerCase();
				return !q || `${x.name} ${x.email} ${x.nip}`.toLowerCase().includes(q);
			})
			.map((x) => ({
				id: x.id,
				initials: initials(x.name),
				name: x.name,
				code: x.nip || t('teachers.no_nip'),
				meta: x.email,
				extra:
					(x.assignments
						? t('teachers.assignments', { count: x.assignments })
						: t('teachers.no_assignments')) +
					(x.homeroom_class ? ` · ${t('teachers.homeroom_of', { class: x.homeroom_class })}` : ''),
				extraTone: x.assignments || x.homeroom_class ? 'default' : 'muted',
				status: { label: t(`account.${x.status}`), tone: ACCOUNT_TONES[x.status as AccountStatus] }
			}))
	);
	const gap = $derived(
		sectionGap(i18n.t, data.schoolProgress, 'teachers', resolve(APP_PATHS.SCHOOL_ADMIN_SETUP))
	);
	const current = $derived(items.find((x) => x.id === editor.editId) ?? null);

	async function openRecord(id: string | null) {
		detail = null;
		const x = id ? items.find((i) => i.id === id) : null;
		form = x
			? {
					name: x.name,
					nip: x.nip,
					gender: x.gender || 'L',
					email: x.email,
					phone: x.phone,
					active: x.active
				}
			: { ...EMPTY };
		editor.show(id);
		if (id) detail = await editor.run<SchoolTeacherDetail>('detail', { id });
	}

	function validate(): boolean {
		const e: Record<string, string> = {};
		if (form.name.trim().length < 3) e.name = t('errors.required');
		if (!RE.email.test(form.email.trim())) e.email = t('errors.email_format');
		if (form.nip && !RE.nip.test(form.nip.trim())) e.nip = t('errors.nip_format');
		if (form.phone && !RE.phone.test(normalizePhone(form.phone)))
			e.phone = t('errors.phone_format');
		editor.setErrors(e);
		return !Object.keys(e).length;
	}

	async function save() {
		if (!validate()) return;
		await editor.save(
			{ ...form, phone: normalizePhone(form.phone), email: form.email.trim().toLowerCase() },
			{ added: t('common.added'), saved: t('common.saved') }
		);
	}

	async function invite(ids: string[]) {
		const out = await editor.run<SchoolInviteResult>('invite', { kind: 'teachers', ids });
		if (!out) return;
		if (out.queued) {
			// > 50 akun: diproses worker; progres & kode tampil di panel InviteJobProgress.
			inviteJobs = out.job_ids ?? [];
			editor.notify(t('invite_job.queued_toast', { count: out.queued }));
			return;
		}
		codes = out.codes;
		editor.notify(t('invite.result', { sent: out.sent, linked: out.linked, skipped: out.skipped }));
		await refresh();
	}

	async function refresh() {
		const fresh = await editor.run<SchoolTeachersView>('refresh', {});
		if (fresh) view = fresh;
	}
</script>

<svelte:head><title>{t('teachers.title')} · FLIXARE</title></svelte:head>

{#if !view}
	<StatePanel
		tone="error"
		title={t('common.load_failed')}
		description={t(`failure.${data.failure}`)}
	/>
{:else}
	<ModuleShell
		eyebrow={t('teachers.eyebrow')}
		title={t('teachers.title')}
		description={t('teachers.desc')}
		{gap}
		{stats}
		help="help.school_admin_teachers"
	>
		{#snippet actions()}
			<button
				type="button"
				class="bg-lms-on-hero/8 border-lms-on-hero/14 text-lms-on-hero hover:bg-lms-on-hero/14 lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] border px-3.5 text-[13px] font-semibold disabled:opacity-50"
				onclick={() => (importOpen = true)}
				><Icon icon={FileUp} size="sm" />{t('common.import')}</button
			>
			<button
				type="button"
				class="bg-lms-on-hero text-lms-brand-deep-neutral hover:bg-lms-on-hero/90 lms-focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-semibold disabled:opacity-50"
				onclick={() => openRecord(null)}><Icon icon={Plus} size="sm" />{t('teachers.add')}</button
			>
		{/snippet}

		{#if codes.length}<ActivationCodes {codes} />{/if}
		{#if inviteJobs.length}
			{#key inviteJobs.join()}
				<InviteJobProgress
					jobIds={inviteJobs}
					ondone={refresh}
					ondismiss={() => (inviteJobs = [])}
				/>
			{/key}
		{/if}

		<ListPanel
			heads={[
				t('teachers.head_teacher'),
				t('teachers.head_email'),
				t('teachers.head_teaching'),
				t('teachers.head_account')
			]}
			{rows}
			{query}
			searchPlaceholder={t('teachers.search')}
			searchLabel={t('common.search')}
			{tabs}
			{tab}
			tabsLabel={t('common.filter')}
			bulk={pending.length
				? {
						text: t('teachers.bulk_text', { count: pending.length }),
						action: t('teachers.bulk_action', { count: pending.length }),
						busy: editor.busy,
						onclick: () => invite(pending.map((x) => x.id))
					}
				: null}
			emptyText={items.length ? t('common.no_match') : t('common.empty_import')}
			importLabel={t('common.import_from')}
			footNote={t('common.shown', { count: rows.length })}
			onquery={(v) => (query = v)}
			ontab={(k) => (tab = k)}
			onopen={(id) => openRecord(id)}
			onimport={() => (importOpen = true)}
		/>
	</ModuleShell>

	<RecordDrawer
		open={editor.open}
		eyebrow={`${editor.editId ? t('common.edit') : t('common.new')} · ${t('teachers.title').toUpperCase()}`}
		title={editor.editId ? form.name || t('teachers.title') : t('teachers.add')}
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
			<FieldBox label={t('fields.full_name')} for="t-name" required full error={editor.errors.name}>
				<input
					id="t-name"
					class={inputClass(editor.errors.name)}
					placeholder={t('teachers.name_ph')}
					bind:value={form.name}
					oninput={() => editor.clearError('name')}
				/>
			</FieldBox>
			<FieldBox label={t('fields.nip')} for="t-nip" error={editor.errors.nip}>
				<input
					id="t-nip"
					class={inputClass(editor.errors.nip, true)}
					inputmode="numeric"
					placeholder={t('teachers.nip_ph')}
					bind:value={form.nip}
					oninput={() => editor.clearError('nip')}
				/>
			</FieldBox>
			<FieldBox label={t('fields.gender')} required error={editor.errors.gender}>
				<Segmented
					label={t('fields.gender')}
					value={form.gender}
					onchange={(v) => (form.gender = v)}
					options={[
						{ value: 'L', label: t('gender.L') },
						{ value: 'P', label: t('gender.P') }
					]}
				/>
			</FieldBox>
			<FieldBox
				label={t('fields.email')}
				for="t-email"
				required
				note={t('teachers.email_note')}
				error={editor.errors.email}
			>
				<input
					id="t-email"
					type="email"
					class={inputClass(editor.errors.email)}
					placeholder={t('teachers.email_ph')}
					disabled={current?.status === 'active' || current?.status === 'invited'}
					bind:value={form.email}
					oninput={() => editor.clearError('email')}
				/>
			</FieldBox>
			<FieldBox
				label={t('fields.phone')}
				for="t-phone"
				note={phoneFieldNote(i18n.t, current)}
				error={editor.errors.phone}
			>
				<input
					id="t-phone"
					type="tel"
					class={inputClass(editor.errors.phone)}
					placeholder="0812…"
					bind:value={form.phone}
					oninput={() => editor.clearError('phone')}
				/>
			</FieldBox>
			{#if editor.editId}
				<FieldBox label={t('fields.status')} full note={t('teachers.inactive_note')}>
					<Segmented
						label={t('fields.status')}
						value={form.active ? 'yes' : 'no'}
						onchange={(v) => (form.active = v === 'yes')}
						options={[
							{ value: 'yes', label: t('common.active') },
							{ value: 'no', label: t('common.inactive') }
						]}
					/>
				</FieldBox>
			{/if}
		</div>
		{#if detail?.assignment_list.length}
			<div class="border-lms-border flex flex-col rounded-xl border">
				<span class="text-lms-muted px-3.5 py-2.5 font-mono text-[10px] tracking-[0.1em]"
					>{t('teachers.assignment_list', { count: detail.assignment_list.length })}</span
				>
				{#each detail.assignment_list as a, i (i)}
					<div
						class="border-lms-border flex justify-between gap-2.5 border-t px-3.5 py-2 text-[13px]"
					>
						<span class="font-semibold">{a.subject}</span><span class="text-lms-muted text-right"
							>{t('common.class_of', { class: a.class })}</span
						>
					</div>
				{/each}
			</div>
		{/if}
		{#if current}
			<AccountBox
				status={current.status as AccountStatus}
				hasEmail={Boolean(current.email)}
				busy={editor.busy}
				oninvite={() => invite([current.id])}
			/>
		{/if}
	</RecordDrawer>

	<ConfirmDialog
		bind:open={confirmDelete}
		tone="danger"
		icon={Trash2}
		title={t('teachers.delete_title')}
		message={t('common.delete_message')}
		confirmLabel={t('common.delete')}
		busyLabel={t('common.deleting')}
		cancelLabel={t('common.cancel')}
		onconfirm={async () => {
			if (editor.editId) await editor.remove(editor.editId, t('common.deleted'));
		}}
	/>

	{#if importOpen}
		<ImportWizard
			kind="teachers"
			onclose={() => (importOpen = false)}
			ondone={async (n) => {
				if (n) editor.notify(t('common.imported', { count: n }));
				const fresh = await editor.run<SchoolTeachersView>('refresh', {});
				if (fresh) view = fresh;
			}}
		/>
	{/if}
	<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
{/if}
