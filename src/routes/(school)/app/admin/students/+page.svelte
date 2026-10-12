<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { resolve } from '$app/paths';
	import type {
		SchoolInviteResult,
		SchoolSeatsResult,
		SchoolStudentsView,
		SchoolSubscriptionView
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
		LIST_LIMIT,
		PREFIX,
		RE,
		SEAT_WARNING_RATIO,
		initials,
		inputClass,
		percent,
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
	let view = $state<SchoolStudentsView | null>(data.view);
	// svelte-ignore state_referenced_locally
	let subscription = $state<SchoolSubscriptionView | null>(data.subscription);
	const editor = createRecordEditor<SchoolStudentsView>(i18n.t, (v) => (view = v));

	let query = $state('');
	let tab = $state('all');
	let classFilter = $state('');
	// Tombol "Impor" dari dashboard/03b membuka wizard langsung (?import=1).
	let importOpen = $state(page.url.searchParams.get('import') === '1');
	let confirmDelete = $state(false);
	let quotaBlocked = $state(false);
	let codes = $state<SchoolInviteResult['codes']>([]);
	let inviteJobs = $state<string[]>([]);

	type Form = {
		name: string;
		nis: string;
		nisn: string;
		gender: string;
		birth_date: string;
		class_id: string;
		religion: string;
		address: string;
		email: string;
		active: boolean;
	};
	const blank = (): Form => ({
		name: '',
		nis: '',
		nisn: '',
		gender: 'L',
		birth_date: '',
		class_id: classFilter || view?.classes[0]?.value || '',
		religion: '',
		address: '',
		email: '',
		active: true
	});
	let form = $state<Form>(blank());

	const items = $derived(view?.items ?? []);
	const seats = $derived(view?.seats ?? { used: 0, seats: 0 });
	const noGuardian = $derived(items.filter((s) => !s.guardians.length).length);
	const notInvited = $derived(items.filter((s) => s.status === 'not_invited'));
	const seatFull = $derived(seats.seats > 0 && seats.used >= seats.seats);

	const stats = $derived([
		{
			label: t('students.stat_seats'),
			value: seats.seats ? `${seats.used} / ${seats.seats}` : String(seats.used),
			bar: seats.seats ? percent(seats.used, seats.seats) : undefined,
			tone:
				seats.seats && seats.used / seats.seats > SEAT_WARNING_RATIO
					? ('warning' as const)
					: ('default' as const),
			sub: seats.seats ? undefined : t('students.no_seat_limit')
		},
		{
			label: t('students.stat_no_guardian'),
			value: noGuardian,
			tone: noGuardian ? ('warning' as const) : ('default' as const)
		},
		{ label: t('students.stat_active'), value: items.filter((s) => s.status === 'active').length },
		{ label: t('students.stat_not_invited'), value: notInvited.length }
	]);
	const tabs = $derived([
		{ key: 'all', label: t('common.all'), count: items.length },
		{ key: 'noguard', label: t('students.tab_no_guardian'), count: noGuardian },
		{ key: 'not_invited', label: t('account.not_invited'), count: notInvited.length }
	]);
	const filtered = $derived(
		items
			.filter((s) => !classFilter || s.class_id === classFilter)
			.filter((s) => tab === 'all' || (tab === 'noguard' ? !s.guardians.length : s.status === tab))
			.filter((s) => {
				const q = query.trim().toLowerCase();
				return !q || `${s.name} ${s.nis} ${s.nisn}`.toLowerCase().includes(q);
			})
	);
	const rows: ListRow[] = $derived(
		filtered.slice(0, LIST_LIMIT).map((s) => ({
			id: s.id,
			initials: initials(s.name),
			name: s.name,
			code: s.nisn
				? t('students.code_nis_nisn', { nis: s.nis, nisn: s.nisn })
				: t('students.code_nis', { nis: s.nis }),
			meta: s.class_name ? t('common.class_of', { class: s.class_name }) : t('students.no_class'),
			extra: s.guardians.length
				? s.guardians.map((g) => g.name).join(', ')
				: t('students.no_guardian'),
			extraTone: s.guardians.length ? 'default' : 'warning',
			status: { label: t(`account.${s.status}`), tone: ACCOUNT_TONES[s.status as AccountStatus] }
		}))
	);
	const pendingInvite = $derived(
		notInvited.filter((s) => !classFilter || s.class_id === classFilter)
	);
	const gap = $derived(
		sectionGap(i18n.t, data.schoolProgress, 'students', resolve(APP_PATHS.SCHOOL_ADMIN_SETUP))
	);
	const current = $derived(items.find((s) => s.id === editor.editId) ?? null);
	const seatOffer = $derived(
		subscription?.can_add_seats
			? {
					trial: subscription.status === 'trial',
					unitPrice: subscription.unit_price_idr,
					months: subscription.prorata_months
				}
			: null
	);

	function openRecord(id: string | null) {
		quotaBlocked = false;
		const s = id ? items.find((x) => x.id === id) : null;
		form = s
			? {
					name: s.name,
					nis: s.nis,
					nisn: s.nisn,
					gender: s.gender || 'L',
					birth_date: s.birth_date,
					class_id: s.class_id ?? '',
					religion: s.religion,
					address: s.address,
					email: s.email,
					active: s.active
				}
			: blank();
		editor.show(id);
	}

	async function save() {
		const e: Record<string, string> = {};
		if (form.name.trim().length < 3) e.name = t('errors.required');
		if (!RE.nis.test(form.nis.trim())) e.nis = t('errors.nis_format');
		if (form.nisn && !RE.nisn.test(form.nisn.trim())) e.nisn = t('errors.nisn_format');
		if (!form.class_id) e.class_id = t('errors.required');
		if (form.email && !RE.email.test(form.email.trim())) e.email = t('errors.email_format');
		editor.setErrors(e);
		if (Object.keys(e).length) return;
		const ok = await editor.save(
			{
				...form,
				nis: form.nis.trim(),
				nisn: form.nisn.trim(),
				email: form.email.trim().toLowerCase()
			},
			{ added: t('common.added'), saved: t('common.saved') }
		);
		quotaBlocked = !ok && editor.lastCode === 'quota_students_exceeded';
	}

	async function refresh() {
		const fresh = await editor.run<SchoolStudentsView>('refresh', {});
		if (fresh) view = fresh;
	}

	async function invite(ids: string[]) {
		const out = await editor.run<SchoolInviteResult>('invite', { kind: 'students', ids });
		if (!out) return;
		if (out.queued) {
			// > 50 akun: diproses worker; progres & kode tampil di panel InviteJobProgress.
			inviteJobs = out.job_ids ?? [];
			editor.notify(t('invite_job.queued_toast', { count: out.queued }));
			return;
		}
		codes = out.codes;
		editor.notify(
			t('invite.result', {
				sent: out.sent + out.codes.length,
				linked: out.linked,
				skipped: out.skipped
			})
		);
		await refresh();
	}

	/** Tambah kursi dari impor: trial → langsung aktif; aktif → invoice prorata (kursi aktif setelah lunas). */
	async function buySeats(count: number): Promise<boolean> {
		const out = await editor.run<SchoolSeatsResult>('addSeats', { seats: count });
		if (!out) return false;
		subscription = out.subscription;
		editor.notify(
			out.applied ? t('students.seats_applied', { count }) : t('students.seats_invoiced')
		);
		await refresh();
		return out.applied;
	}
</script>

<svelte:head><title>{t('students.title')} · FLIXARE</title></svelte:head>

{#if !view}
	<StatePanel
		tone="error"
		title={t('common.load_failed')}
		description={t(`failure.${data.failure}`)}
	/>
{:else}
	<ModuleShell
		eyebrow={t('students.eyebrow')}
		title={t('students.title')}
		description={t('students.desc')}
		help="help.school_admin_students"
		{gap}
		{stats}
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
				disabled={!view?.classes.length}
				onclick={() => openRecord(null)}><Icon icon={Plus} size="sm" />{t('students.add')}</button
			>
		{/snippet}

		{#if seatFull}
			<div
				role="status"
				class="lms-tone-warning flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-[13px]"
			>
				<span class="flex-[1_1_300px]">{t('students.seat_full', { seats: seats.seats })}</span>
				<a
					href={resolve(APP_PATHS.SCHOOL_ADMIN_SUBSCRIPTION)}
					class="bg-lms-warning-text text-lms-surface lms-focus-ring inline-flex h-[34px] items-center rounded-lg px-3.5 font-bold"
					>{t('students.add_seats')}</a
				>
			</div>
		{/if}
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
				t('students.head_student'),
				t('students.head_class'),
				t('students.head_guardian'),
				t('students.head_account')
			]}
			{rows}
			{query}
			searchPlaceholder={t('students.search')}
			searchLabel={t('common.search')}
			{tabs}
			{tab}
			tabsLabel={t('common.filter')}
			bulk={pendingInvite.length
				? {
						text: t('students.bulk_text', { count: pendingInvite.length }),
						action: t('students.bulk_action', { count: pendingInvite.length }),
						busy: editor.busy,
						onclick: () => invite(pendingInvite.map((s) => s.id))
					}
				: null}
			emptyText={items.length ? t('common.no_match') : t('common.empty_import')}
			importLabel={t('common.import_from')}
			footNote={t('common.shown', { count: rows.length }) +
				(filtered.length > LIST_LIMIT ? ` ${t('students.limit_note', { limit: LIST_LIMIT })}` : '')}
			onquery={(v) => (query = v)}
			ontab={(k) => (tab = k)}
			onopen={(id) => openRecord(id)}
			onimport={() => (importOpen = true)}
		>
			{#snippet filters()}
				<select
					aria-label={t('students.class_filter')}
					class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-[38px] rounded-lg px-2 text-[13px]"
					bind:value={classFilter}
				>
					<option value="">{t('students.all_classes')}</option>
					{#each view?.classes ?? [] as c (c.value)}<option value={c.value}>{c.label}</option
						>{/each}
				</select>
			{/snippet}
		</ListPanel>
	</ModuleShell>

	<RecordDrawer
		open={editor.open}
		eyebrow={`${editor.editId ? t('common.edit') : t('common.new')} · ${t('students.title').toUpperCase()}`}
		title={editor.editId ? form.name || t('students.title') : t('students.add')}
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
		{#if quotaBlocked}
			<div
				role="alert"
				class="lms-tone-warning flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-[13px]"
			>
				<span class="flex-[1_1_240px]">{t('students.seat_full', { seats: seats.seats })}</span>
				<a
					href={resolve(APP_PATHS.SCHOOL_ADMIN_SUBSCRIPTION)}
					class="bg-lms-warning-text text-lms-surface lms-focus-ring inline-flex h-[34px] items-center rounded-lg px-3.5 font-bold"
					>{t('students.add_seats')}</a
				>
			</div>
		{/if}
		<div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
			<FieldBox label={t('fields.full_name')} for="s-name" required full error={editor.errors.name}>
				<input
					id="s-name"
					class={inputClass(editor.errors.name)}
					bind:value={form.name}
					oninput={() => editor.clearError('name')}
				/>
			</FieldBox>
			<FieldBox label={t('fields.nis')} for="s-nis" required error={editor.errors.nis}>
				<input
					id="s-nis"
					inputmode="numeric"
					class={inputClass(editor.errors.nis, true)}
					bind:value={form.nis}
					oninput={() => editor.clearError('nis')}
				/>
			</FieldBox>
			<FieldBox label={t('fields.nisn')} for="s-nisn" error={editor.errors.nisn}>
				<input
					id="s-nisn"
					inputmode="numeric"
					class={inputClass(editor.errors.nisn, true)}
					placeholder={t('students.nisn_ph')}
					bind:value={form.nisn}
					oninput={() => editor.clearError('nisn')}
				/>
			</FieldBox>
			<FieldBox label={t('fields.gender')} required>
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
			<FieldBox label={t('fields.birth_date')} for="s-birth" error={editor.errors.birth_date}>
				<input
					id="s-birth"
					type="date"
					class={inputClass(editor.errors.birth_date)}
					bind:value={form.birth_date}
				/>
			</FieldBox>
			<FieldBox label={t('fields.class')} for="s-class" required error={editor.errors.class_id}>
				<select id="s-class" class={inputClass(editor.errors.class_id)} bind:value={form.class_id}>
					{#each view.classes as c (c.value)}<option value={c.value}>{c.label}</option>{/each}
				</select>
			</FieldBox>
			<FieldBox label={t('fields.religion')} for="s-rel">
				<select id="s-rel" class={inputClass()} bind:value={form.religion}>
					<option value="">—</option>
					{#each view.religions as r (r.value)}<option value={r.value}>{r.label}</option>{/each}
				</select>
			</FieldBox>
			<FieldBox
				label={t('fields.student_email')}
				for="s-email"
				full
				note={t('students.email_note')}
				error={editor.errors.email}
			>
				<input
					id="s-email"
					type="email"
					class={inputClass(editor.errors.email)}
					disabled={current?.status === 'active' && Boolean(current?.email)}
					bind:value={form.email}
					oninput={() => editor.clearError('email')}
				/>
			</FieldBox>
			<FieldBox label={t('fields.address')} for="s-addr" full error={editor.errors.address}>
				<input id="s-addr" class={inputClass(editor.errors.address)} bind:value={form.address} />
			</FieldBox>
			{#if editor.editId}
				<FieldBox label={t('fields.status')} full note={t('students.inactive_note')}>
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
		{#if current}
			<div class="border-lms-border flex flex-col rounded-xl border">
				<span class="text-lms-muted px-3.5 py-2.5 font-mono text-[10px] tracking-[0.1em]"
					>{t('students.guardian_list')}</span
				>
				{#each current.guardians as g (g.id)}
					<div
						class="border-lms-border flex justify-between gap-2.5 border-t px-3.5 py-2 text-[13px]"
					>
						<span class="font-semibold">{g.name}</span>
						<span class="text-lms-muted"
							>{t(`relation.${g.relation}`)}{g.primary ? ` · ${t('guardians.primary')}` : ''}</span
						>
					</div>
				{:else}
					<span class="border-lms-border text-lms-muted border-t px-3.5 py-2 text-[13px]"
						>{t('students.no_guardian_hint')}
						<a class="text-lms-link underline" href={resolve(APP_PATHS.SCHOOL_ADMIN_GUARDIANS)}
							>{t('students.add_guardian')}</a
						></span
					>
				{/each}
			</div>
			<AccountBox
				kind="student"
				status={current.status as AccountStatus}
				hasEmail={Boolean(current.email)}
				busy={editor.busy}
				oninvite={() => invite([current.id])}
			/>
			{#if current.username}<p class="text-lms-muted text-xs">
					{t('students.username', { username: current.username })}
				</p>{/if}
		{/if}
	</RecordDrawer>

	<ConfirmDialog
		bind:open={confirmDelete}
		tone="danger"
		icon={Trash2}
		title={t('students.delete_title')}
		message={t('students.delete_message')}
		confirmLabel={t('common.delete')}
		busyLabel={t('common.deleting')}
		cancelLabel={t('common.cancel')}
		onconfirm={async () => {
			if (editor.editId) await editor.remove(editor.editId, t('common.deleted'));
		}}
	/>

	{#if importOpen}
		<ImportWizard
			kind="students"
			{seatOffer}
			onbuyseats={seatOffer ? buySeats : undefined}
			onclose={() => (importOpen = false)}
			ondone={async (n) => {
				if (n) editor.notify(t('common.imported', { count: n }));
				await refresh();
			}}
		/>
	{/if}
	<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
{/if}
