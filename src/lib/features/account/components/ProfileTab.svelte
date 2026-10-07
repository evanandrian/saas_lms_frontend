<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Info from '@lucide/svelte/icons/info';
	import Lock from '@lucide/svelte/icons/lock';
	import MailWarning from '@lucide/svelte/icons/mail-warning';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Save from '@lucide/svelte/icons/save';
	import Send from '@lucide/svelte/icons/send';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import Upload from '@lucide/svelte/icons/upload';
	import type { ProfileResult } from '$lib/api/generated/lms';
	import type { AccountPageState } from '../account.state.svelte';
	import RequestList from './RequestList.svelte';
	import {
		MAX_PHOTO_BYTES,
		PHOTO_TYPES,
		initials,
		profileDirty,
		profileDraft,
		profileErrors,
		profileRequest,
		sanitizeIdentity,
		sanitizePhone,
		splitDataUrl,
		todayIso,
		type ProfileDraft,
		type ProfileField
	} from '../account.model';
	import {
		banner,
		bannerButton,
		buttonPrimary,
		buttonSecondary,
		card,
		cardTitle,
		fieldLabel,
		inputClass,
		segment,
		segmented
	} from './styles';

	interface Props {
		page: AccountPageState;
		photoUrl: string | null;
		errorText: (code: string) => string;
	}

	let { page, photoUrl, errorText }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`account.profile.${key}`, params);

	const ctx = $derived(page.overview.context);
	const student = $derived(ctx.restricted);
	const approver = $derived(i18n.t(`account.approver.${ctx.approver}`));
	const idLabel = $derived(i18n.t(`account.identity.${ctx.identity_kind}.label`));
	const idRule = $derived(i18n.t(`account.identity.${ctx.identity_kind}.rule`));

	// svelte-ignore state_referenced_locally
	let saved = $state<ProfileDraft>(profileDraft(page.overview));
	// svelte-ignore state_referenced_locally
	let draft = $state<ProfileDraft>(profileDraft(page.overview));
	let tried = $state(false);
	let saving = $state(false);
	let photoError = $state('');
	let serverErrors = $state<Partial<Record<string, string>>>({});

	const today = $derived(todayIso(new Date(page.now)));
	const errors = $derived(profileErrors(draft, saved, ctx.identity_kind, today));
	const errorCount = $derived(Object.keys(errors).length);
	const dirty = $derived(profileDirty(draft, saved));

	function fieldError(field: ProfileField): string {
		const server = serverErrors[field];
		if (server) return t(`errors.${field}.${server}`);
		const code = errors[field];
		if (!code || (!tried && draft[field] === saved[field])) return '';
		return t(`errors.${field}.${code}`);
	}

	function set(field: ProfileField, value: string) {
		if (student && field !== 'phone') return;
		draft[field] = value;
		delete serverErrors[field];
	}

	/** Foto saat ini: draf baru (data URL), dihapus (null), atau tersimpan. */
	const draftPhoto = $derived(
		draft.photo === undefined ? (page.overview.profile.has_photo ? photoUrl : null) : draft.photo
	);

	function onPhoto(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) {
			photoError = t('photo_format');
			return;
		}
		if (file.size > MAX_PHOTO_BYTES) {
			photoError = t('photo_size');
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			draft.photo = String(reader.result);
			photoError = '';
			delete serverErrors.photo;
		};
		reader.readAsDataURL(file);
	}

	const hints = $derived({
		full_name: student
			? t('managed_by_school')
			: draft.full_name !== saved.full_name
				? t('sent_for_approval', { approver })
				: t('official_name'),
		email: student
			? t('managed_by_school')
			: draft.email !== saved.email
				? t('email_link_hint')
				: t('email_hint'),
		phone: t('phone_hint'),
		identity_number: student
			? t('managed_by_school')
			: draft.identity_number !== saved.identity_number
				? t('sent_for_approval', { approver })
				: idRule
	});
	const changedTone = (field: ProfileField) =>
		fieldError(field)
			? 'text-lms-danger-text'
			: draft[field] !== saved[field] && !student
				? 'text-lms-warning-text'
				: 'text-lms-muted';

	const bar = $derived(
		tried && errorCount
			? {
					text: t('bar.errors', { count: errorCount }),
					tone: 'text-lms-danger-text',
					icon: CircleAlert
				}
			: dirty
				? { text: t('bar.dirty'), tone: 'text-lms-warning-text', icon: Pencil }
				: { text: t('bar.saved'), tone: 'text-lms-muted', icon: CircleCheck }
	);

	function reset() {
		draft = { ...saved };
		tried = false;
		photoError = '';
		serverErrors = {};
	}

	function adopt() {
		saved = profileDraft(page.overview);
		draft = { ...saved };
		tried = false;
		serverErrors = {};
	}

	async function save() {
		if (saving) return;
		if (errorCount) {
			tried = true;
			return;
		}
		if (!dirty) {
			page.say(t('toast.no_changes'), Info);
			return;
		}
		saving = true;
		const photo = typeof draft.photo === 'string' ? splitDataUrl(draft.photo) : null;
		const outcome = await page.call<ProfileResult>(
			'profile',
			profileRequest(draft, page.overview.profile.updated_at, photo)
		);
		saving = false;
		if (!outcome.ok) {
			if (outcome.code === 'validation_failed') {
				serverErrors = Object.fromEntries(outcome.issues.map((i) => [i.field, i.code]));
				if (serverErrors.photo) photoError = t(`errors.photo.${serverErrors.photo}`);
				tried = true;
				return;
			}
			page.say(errorText(outcome.code), CircleX);
			return;
		}
		page.apply(outcome.data.overview);
		adopt();
		const notes = [
			outcome.data.verification_sent
				? t('toast.note_email', { email: page.overview.pending_email ?? '' })
				: '',
			outcome.data.approval_requested ? t('toast.note_approval', { approver }) : ''
		].filter(Boolean);
		page.say(notes.length ? t('toast.saved_with', { notes: notes.join('; ') }) : t('toast.saved'));
	}

	let pendingBusy = $state(false);
	async function pending(action: 'emailResend' | 'emailCancel') {
		if (pendingBusy) return;
		pendingBusy = true;
		const email = page.overview.pending_email ?? '';
		const outcome = await page.run(action);
		pendingBusy = false;
		if (!outcome.ok) {
			page.say(errorText(outcome.code), CircleX);
			return;
		}
		adopt();
		if (action === 'emailResend') page.say(t('toast.resent', { email }), Send);
		else page.say(t('toast.email_cancelled'), Undo2);
	}

	const nickShow = $derived(draft.nickname || draft.full_name.split(' ')[0] || '');
</script>

{#if student}
	<div class="lms-tone-info flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] leading-5">
		<span class="mt-0.5"><Icon icon={Info} size="sm" /></span>
		<span>{t('student_info')}</span>
	</div>
{/if}

{#if page.overview.pending_email}
	<div class="{banner} lms-tone-warning">
		<Icon icon={MailWarning} />
		<span class="flex-[1_1_240px] text-[13px] leading-5">
			<b>{t('pending_email_title')}</b>
			{t('pending_email_text', {
				pending: page.overview.pending_email,
				current: page.overview.profile.email
			})}
		</span>
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class="{bannerButton} border border-current bg-transparent font-semibold"
				disabled={pendingBusy}
				onclick={() => pending('emailResend')}>{t('resend')}</button
			>
			<button
				type="button"
				class="lms-focus-ring h-[34px] px-3 text-xs font-semibold underline"
				disabled={pendingBusy}
				onclick={() => pending('emailCancel')}>{t('cancel')}</button
			>
		</div>
	</div>
{/if}

<RequestList {page} {errorText} />

<section class="{card} flex-row flex-wrap items-center gap-5">
	<span
		class="bg-lms-interactive text-lms-on-interactive border-lms-surface ring-lms-border flex size-22 flex-none items-center justify-center rounded-full border-[3px] bg-cover bg-center text-[28px] font-bold ring-1"
		style:background-image={draftPhoto ? `url(${draftPhoto})` : undefined}
		aria-hidden="true">{draftPhoto ? '' : initials(draft.full_name || '?')}</span
	>
	<div class="flex flex-[1_1_220px] flex-col gap-2">
		<h2 class={cardTitle}>{t('photo_title')}</h2>
		<span class="text-lms-muted text-xs">{t('photo_hint')}</span>
		<div class="flex flex-wrap gap-2">
			<label class="{buttonSecondary} h-9 cursor-pointer px-3.5 text-[13px] focus-within:outline-2">
				<Icon icon={Upload} size="sm" />
				{draftPhoto ? t('photo_change') : t('photo_upload')}
				<input type="file" accept="image/png,image/jpeg" class="sr-only" onchange={onPhoto} />
			</label>
			{#if draftPhoto}
				<button
					type="button"
					class="lms-focus-ring text-lms-danger-text h-9 px-3.5 text-[13px] font-semibold"
					onclick={() => (draft.photo = null)}>{t('photo_remove')}</button
				>
			{/if}
		</div>
		<span class="text-lms-danger-text text-xs" role="alert">{photoError}</span>
	</div>
</section>

<section class="{card} gap-4">
	<h2 class={cardTitle}>{t('personal_title')}</h2>
	<div
		class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] items-start gap-x-4 gap-y-3.5"
	>
		<label class="flex flex-col gap-1.5">
			<span class="{fieldLabel} flex items-center gap-1.5"
				>{t('full_name')}
				{#if !student}<span
						class="bg-lms-surface-muted text-lms-muted rounded-full px-1.5 py-px text-[10px] font-bold"
						>{t('needs_approval')}</span
					>{/if}</span
			>
			<input
				class={inputClass(Boolean(fieldError('full_name')), student)}
				value={draft.full_name}
				readonly={student}
				oninput={(e) => set('full_name', e.currentTarget.value)}
			/>
			<span class="text-xs {changedTone('full_name')}"
				>{fieldError('full_name') || hints.full_name}</span
			>
		</label>
		<label class="flex flex-col gap-1.5">
			<span class={fieldLabel}>{t('nickname')}</span>
			<input
				class={inputClass(false, student)}
				value={draft.nickname}
				readonly={student}
				oninput={(e) => set('nickname', e.currentTarget.value)}
			/>
			<span class="text-lms-muted text-xs">{t('nickname_hint', { name: nickShow })}</span>
		</label>
		<div class="flex flex-col gap-1.5">
			<span class={fieldLabel} id="account-gender">{t('gender')}</span>
			<div class={segmented} role="radiogroup" aria-labelledby="account-gender">
				{#each ['L', 'P'] as g (g)}
					<button
						type="button"
						role="radio"
						aria-checked={draft.gender === g}
						class="{segment(draft.gender === g)} h-9 flex-1 {student ? 'cursor-not-allowed' : ''}"
						onclick={() => set('gender', g)}>{t(`gender_${g}`)}</button
					>
				{/each}
			</div>
		</div>
		<label class="flex flex-col gap-1.5">
			<span class={fieldLabel}>{t('birth_date')}</span>
			<input
				type="date"
				max={today}
				class={inputClass(Boolean(fieldError('birth_date')), student)}
				value={draft.birth_date}
				readonly={student}
				oninput={(e) => set('birth_date', e.currentTarget.value)}
			/>
			<span class="text-lms-danger-text text-xs">{fieldError('birth_date')}</span>
		</label>
		<label class="col-span-full flex flex-col gap-1.5">
			<span class={fieldLabel}>{t('address')}</span>
			<textarea
				rows="2"
				class="{inputClass(false, student)} h-auto resize-y py-2.5 leading-[21px]"
				value={draft.address}
				readonly={student}
				oninput={(e) => set('address', e.currentTarget.value)}></textarea>
		</label>
	</div>
</section>

<section class="{card} gap-4">
	<h2 class={cardTitle}>{t('contact_title')}</h2>
	<div
		class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] items-start gap-x-4 gap-y-3.5"
	>
		<label class="flex flex-col gap-1.5">
			<span class={fieldLabel}>{t('email')}</span>
			<input
				type="email"
				class={inputClass(Boolean(fieldError('email')), student)}
				value={draft.email}
				readonly={student}
				oninput={(e) => set('email', e.currentTarget.value)}
			/>
			<span class="text-xs {changedTone('email')}">{fieldError('email') || hints.email}</span>
		</label>
		<label class="flex flex-col gap-1.5">
			<span class={fieldLabel}>{t('phone')}</span>
			<span
				class="bg-lms-surface flex overflow-hidden rounded-[10px] border-[1.5px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--color-lms-focus) {fieldError(
					'phone'
				)
					? 'border-lms-danger-text'
					: 'border-lms-border-strong'}"
			>
				<span class="bg-lms-surface-muted text-lms-muted flex items-center px-2.5 text-[13px]"
					>+62</span
				>
				<input
					inputmode="tel"
					placeholder={t('phone_placeholder')}
					class="h-[39px] min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
					value={draft.phone}
					oninput={(e) => {
						const v = sanitizePhone(e.currentTarget.value);
						e.currentTarget.value = v;
						set('phone', v);
					}}
				/>
			</span>
			<span class="text-xs {fieldError('phone') ? 'text-lms-danger-text' : 'text-lms-muted'}"
				>{fieldError('phone') || hints.phone}</span
			>
		</label>
		<label class="flex flex-col gap-1.5">
			<span class="{fieldLabel} flex items-center gap-1.5"
				>{idLabel}
				{#if !student}<span
						class="bg-lms-surface-muted text-lms-muted rounded-full px-1.5 py-px text-[10px] font-bold"
						>{t('needs_approval')}</span
					>{/if}</span
			>
			<input
				inputmode={ctx.identity_kind === 'employee_id' ? 'text' : 'numeric'}
				class={inputClass(Boolean(fieldError('identity_number')), student, 'font-mono')}
				value={draft.identity_number}
				readonly={student}
				oninput={(e) => {
					const v = sanitizeIdentity(e.currentTarget.value, ctx.identity_kind);
					e.currentTarget.value = v;
					set('identity_number', v);
				}}
			/>
			<span class="text-xs {changedTone('identity_number')}"
				>{fieldError('identity_number') || hints.identity_number}</span
			>
		</label>
		<div class="flex flex-col gap-1.5">
			<span class={fieldLabel}>{t('role')}</span>
			<span
				class="border-lms-border bg-lms-surface-muted text-lms-muted flex min-h-[42px] items-center gap-2 rounded-[10px] border-[1.5px] px-3 py-2 text-sm"
				><Icon icon={Lock} size="sm" />{ctx.role_name} · {ctx.tenant_name}</span
			>
			<span class="text-lms-muted text-xs">{t('managed_by', { approver })}</span>
		</div>
	</div>
</section>

<div
	class="bg-lms-surface border-lms-border sticky bottom-19 z-5 flex flex-wrap items-center gap-2.5 rounded-xl border py-3 ps-4 pe-3 shadow-[0_18px_40px_-24px_rgba(15,24,56,0.4)]"
>
	<span class="flex flex-[1_1_200px] items-center gap-2 text-[13px] {bar.tone}"
		><Icon icon={bar.icon} size="sm" />{bar.text}</span
	>
	<button type="button" class="{buttonSecondary} h-[42px] px-4 text-sm" onclick={reset}
		>{t('discard')}</button
	>
	<button
		type="button"
		class="{buttonPrimary} h-[42px] px-4.5 text-sm"
		disabled={saving}
		onclick={save}><Icon icon={Save} size="sm" />{t('save')}</button
	>
</div>
