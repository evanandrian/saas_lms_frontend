<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { resolve } from '$app/paths';
	import type {
		SchoolGuardiansView,
		SchoolInviteResult
	} from '$lib/features/school-admin/school-admin.types';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import AccountBox from '$lib/features/school-admin/components/AccountBox.svelte';
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
		RELATIONS,
		guardianContact,
		initials,
		inputClass,
		normalizePhone,
		phoneFieldNote,
		sectionGap,
		type AccountStatus
	} from '$lib/features/school-admin/school-admin.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import FileUp from '@lucide/svelte/icons/file-up';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Unlink from '@lucide/svelte/icons/unlink';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);

	// svelte-ignore state_referenced_locally
	let view = $state<SchoolGuardiansView | null>(data.view);
	const editor = createRecordEditor<SchoolGuardiansView>(i18n.t, (v) => (view = v));

	let query = $state('');
	let tab = $state('all');
	let importOpen = $state(false);
	let inviteJobs = $state<string[]>([]);
	let confirmDelete = $state(false);

	type Form = {
		name: string;
		relation: string;
		email: string;
		phone: string;
		student_id: string;
		primary: boolean;
	};
	const blank = (): Form => ({
		name: '',
		relation: 'mother',
		email: '',
		phone: '',
		student_id: view?.students[0]?.value ?? '',
		primary: false
	});
	let form = $state<Form>(blank());

	const items = $derived(view?.items ?? []);
	const noEmail = $derived(items.filter((g) => !g.email).length);
	const pending = $derived(items.filter((g) => g.status === 'not_invited' && g.email));

	const stats = $derived([
		{ label: t('guardians.stat_total'), value: items.length },
		{
			label: t('guardians.stat_linked'),
			value: `${view?.students_linked ?? 0} / ${view?.students_total ?? 0}`
		},
		{
			label: t('guardians.stat_no_email'),
			value: noEmail,
			tone: noEmail ? ('warning' as const) : ('default' as const),
			sub: t('guardians.no_email_sub')
		}
	]);
	const tabs = $derived([
		{ key: 'all', label: t('common.all'), count: items.length },
		{
			key: 'primary',
			label: t('guardians.tab_primary'),
			count: items.filter((g) => g.primary).length
		},
		{
			key: 'not_invited',
			label: t('account.not_invited'),
			count: items.filter((g) => g.status === 'not_invited').length
		},
		{ key: 'noemail', label: t('guardians.tab_no_email'), count: noEmail }
	]);
	const rows: ListRow[] = $derived(
		items
			.filter((g) =>
				tab === 'all'
					? true
					: tab === 'primary'
						? g.primary
						: tab === 'noemail'
							? !g.email
							: g.status === tab
			)
			.filter((g) => {
				const q = query.trim().toLowerCase();
				return (
					!q ||
					`${g.name} ${g.email} ${g.children.map((c) => c.name).join(' ')}`
						.toLowerCase()
						.includes(q)
				);
			})
			.map((g) => ({
				id: g.id,
				initials: initials(g.name),
				name: g.name,
				code:
					(g.relation ? t(`relation.${g.relation}`) : '—') +
					(g.primary ? ` · ${t('guardians.primary')}` : ''),
				meta:
					g.children
						.map((c) => `${c.name}${c.class_name ? ` (${c.class_name})` : ''}`)
						.join(', ') || '—',
				extra: guardianContact(i18n.t, g),
				extraTone: g.email ? 'default' : 'warning',
				status: { label: t(`account.${g.status}`), tone: ACCOUNT_TONES[g.status as AccountStatus] }
			}))
	);
	const gap = $derived(
		sectionGap(i18n.t, data.schoolProgress, 'students', resolve(APP_PATHS.SCHOOL_ADMIN_SETUP))
	);
	const current = $derived(items.find((g) => g.id === editor.editId) ?? null);
	const linkedIds = $derived(new Set(current?.children.map((c) => c.id) ?? []));

	function openRecord(id: string | null) {
		const g = id ? items.find((x) => x.id === id) : null;
		form = g
			? {
					name: g.name,
					relation: g.relation || 'mother',
					email: g.email,
					phone: g.phone,
					student_id: g.children[0]?.id ?? view?.students[0]?.value ?? '',
					primary: g.children[0]?.primary ?? false
				}
			: blank();
		editor.show(id);
	}

	async function save() {
		const e: Record<string, string> = {};
		if (form.name.trim().length < 3) e.name = t('errors.required');
		if (!form.student_id) e.student_id = t('errors.required');
		if (form.email && !RE.email.test(form.email.trim())) e.email = t('errors.email_format');
		if (form.phone && !RE.phone.test(normalizePhone(form.phone)))
			e.phone = t('errors.phone_format');
		editor.setErrors(e);
		if (Object.keys(e).length) return;
		await editor.save(
			{ ...form, email: form.email.trim().toLowerCase(), phone: normalizePhone(form.phone) },
			{ added: t('common.added'), saved: t('common.saved') }
		);
	}

	async function unlink(studentId: string) {
		if (!current) return;
		const out = await editor.run<SchoolGuardiansView>('unlink', { id: current.id, studentId });
		if (out) {
			view = out;
			editor.notify(t('guardians.unlinked'));
		}
	}

	async function refresh() {
		const fresh = await editor.run<SchoolGuardiansView>('refresh', {});
		if (fresh) view = fresh;
	}

	async function invite(ids: string[]) {
		const out = await editor.run<SchoolInviteResult>('invite', { kind: 'guardians', ids });
		if (!out) return;
		if (out.queued) {
			// > 50 akun: diproses worker; progres tampil di panel InviteJobProgress.
			inviteJobs = out.job_ids ?? [];
			editor.notify(t('invite_job.queued_toast', { count: out.queued }));
			return;
		}
		editor.notify(t('invite.result', { sent: out.sent, linked: out.linked, skipped: out.skipped }));
		await refresh();
	}
</script>

<svelte:head><title>{t('guardians.title')} · FLIXARE</title></svelte:head>

{#if !view}
	<StatePanel
		tone="error"
		title={t('common.load_failed')}
		description={t(`failure.${data.failure}`)}
	/>
{:else}
	<ModuleShell
		eyebrow={t('guardians.eyebrow')}
		title={t('guardians.title')}
		description={t('guardians.desc')}
		{gap}
		{stats}
		help="help.school_admin_guardians"
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
				disabled={!view?.students.length}
				onclick={() => openRecord(null)}><Icon icon={Plus} size="sm" />{t('guardians.add')}</button
			>
		{/snippet}
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
				t('guardians.head_guardian'),
				t('guardians.head_children'),
				t('guardians.head_contact'),
				t('guardians.head_account')
			]}
			{rows}
			{query}
			searchPlaceholder={t('guardians.search')}
			searchLabel={t('common.search')}
			{tabs}
			{tab}
			tabsLabel={t('common.filter')}
			bulk={pending.length
				? {
						text: t('guardians.bulk_text', { count: pending.length }),
						action: t('guardians.bulk_action', { count: pending.length }),
						busy: editor.busy,
						onclick: () => invite(pending.map((g) => g.id))
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
		eyebrow={`${editor.editId ? t('common.edit') : t('common.new')} · ${t('guardians.title').toUpperCase()}`}
		title={editor.editId ? form.name || t('guardians.title') : t('guardians.add')}
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
			<FieldBox label={t('fields.full_name')} for="g-name" required full error={editor.errors.name}>
				<input
					id="g-name"
					class={inputClass(editor.errors.name)}
					bind:value={form.name}
					oninput={() => editor.clearError('name')}
				/>
			</FieldBox>
			<FieldBox label={t('fields.relation')} full>
				<Segmented
					label={t('fields.relation')}
					value={form.relation}
					onchange={(v) => (form.relation = v)}
					options={RELATIONS.map((r) => ({ value: r, label: t(`relation.${r}`) }))}
				/>
			</FieldBox>
			<FieldBox
				label={t('fields.email')}
				for="g-email"
				note={t('guardians.email_note')}
				error={editor.errors.email}
			>
				<input
					id="g-email"
					type="email"
					class={inputClass(editor.errors.email)}
					disabled={current?.status === 'active' || current?.status === 'invited'}
					bind:value={form.email}
					oninput={() => editor.clearError('email')}
				/>
			</FieldBox>
			<FieldBox
				label={t('fields.phone')}
				for="g-phone"
				note={phoneFieldNote(i18n.t, current)}
				error={editor.errors.phone}
			>
				<input
					id="g-phone"
					type="tel"
					class={inputClass(editor.errors.phone)}
					bind:value={form.phone}
					oninput={() => editor.clearError('phone')}
				/>
			</FieldBox>
			<FieldBox
				label={editor.editId ? t('guardians.link_child') : t('fields.child')}
				for="g-child"
				required
				full
				error={editor.errors.student_id}
				note={editor.editId ? t('guardians.link_note') : ''}
			>
				<select
					id="g-child"
					class={inputClass(editor.errors.student_id)}
					bind:value={form.student_id}
				>
					{#each view.students as s (s.value)}<option value={s.value}
							>{s.label}{linkedIds.has(s.value) ? ` · ${t('guardians.linked')}` : ''}</option
						>{/each}
				</select>
			</FieldBox>
			<FieldBox label={t('guardians.primary_label')} full note={t('guardians.primary_note')}>
				<Segmented
					label={t('guardians.primary_label')}
					value={form.primary ? 'yes' : 'no'}
					onchange={(v) => (form.primary = v === 'yes')}
					options={[
						{ value: 'yes', label: t('common.yes') },
						{ value: 'no', label: t('common.no') }
					]}
				/>
			</FieldBox>
		</div>
		{#if current}
			<div class="border-lms-border flex flex-col rounded-xl border">
				<span class="text-lms-muted px-3.5 py-2.5 font-mono text-[10px] tracking-[0.1em]"
					>{t('guardians.children_list')}</span
				>
				{#each current.children as c (c.id)}
					<div
						class="border-lms-border flex items-center justify-between gap-2.5 border-t px-3.5 py-2 text-[13px]"
					>
						<span class="font-semibold">{c.name}</span>
						<span class="text-lms-muted flex items-center gap-2"
							>{c.class_name ? t('common.class_of', { class: c.class_name }) : '—'}{c.primary
								? ` · ${t('guardians.primary')}`
								: ''}
							<button
								type="button"
								class="lms-action-ghost lms-focus-ring flex size-7 items-center justify-center rounded-md"
								aria-label={t('guardians.unlink', { name: c.name })}
								title={t('guardians.unlink', { name: c.name })}
								onclick={() => unlink(c.id)}><Icon icon={Unlink} size="sm" /></button
							></span
						>
					</div>
				{:else}
					<span class="border-lms-border text-lms-muted border-t px-3.5 py-2 text-[13px]">—</span>
				{/each}
			</div>
			<AccountBox
				kind="guardian"
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
		title={t('guardians.delete_title')}
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
			kind="guardians"
			onclose={() => (importOpen = false)}
			ondone={async (n) => {
				if (n) editor.notify(t('common.imported', { count: n }));
				await refresh();
			}}
		/>
	{/if}
	<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
{/if}
