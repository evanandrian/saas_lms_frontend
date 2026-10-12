<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import PageContainer from '$lib/components/layout/PageContainer.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import {
		PREFIX,
		RATE_LIMITED_CODE,
		credentialFailureMessage
	} from '$lib/features/school-admin/school-admin.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import { formatDateTime } from '$lib/utils/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string>) =>
		i18n.t(`${PREFIX}.invite_page.${key}`, params);
	const MIN_PASSWORD = 8;

	let password = $state('');
	let confirm = $state('');
	let busy = $state(false);
	const mismatch = $derived(confirm.length > 0 && confirm !== password);
	const tooShort = $derived(password.length > 0 && password.length < MIN_PASSWORD);
	const error = $derived(
		form && 'code' in form && form.code
			? credentialFailureMessage(
					i18n.t,
					String(form.code),
					'minutes' in form && typeof form.minutes === 'number' ? form.minutes : null
				)
			: ''
	);
</script>

<svelte:head><title>{t('heading')} · FLIXARE</title></svelte:head>

<AppShell>
	<PageContainer heading={t('heading')}>
		{#if form && 'done' in form && form.done}
			<StatePanel
				title={t('done_title')}
				description={t('done_text', { email: String(form.email ?? '') })}
			>
				{#snippet actions()}<a
						class="btn lms-action-primary lms-focus-ring"
						href={resolve(APP_PATHS.LOGIN)}>{t('login')}</a
					>{/snippet}
			</StatePanel>
		{:else if data.rateLimited}
			<StatePanel
				tone="warning"
				title={t('rate_limited_title')}
				description={credentialFailureMessage(i18n.t, RATE_LIMITED_CODE, data.minutes)}
			/>
		{:else if !data.invitation}
			<StatePanel tone="warning" title={t('invalid_title')} description={t('invalid_text')} />
		{:else}
			<form
				method="POST"
				class="lms-card mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl p-6"
				use:enhance={() => {
					busy = true;
					return async ({ update }) => {
						// Tanpa invalidateAll: load ulang setelah berhasil akan memanggil GET undangan dengan token
						// yang sudah dipakai → 410 dan tercatat sebagai kegagalan rate limit IP (satu per undangan sah).
						await update({ reset: false, invalidateAll: false });
						busy = false;
					};
				}}
			>
				<div class="flex flex-col gap-1">
					<span class="text-lg font-bold">{t('welcome', { name: data.invitation.name })}</span>
					<span class="text-lms-muted text-sm"
						>{t('intro', { school: data.invitation.school, email: data.invitation.email })}</span
					>
				</div>
				<input type="hidden" name="tenant" value={data.tenant} />
				<input type="hidden" name="token" value={data.token} />
				<TextField
					label={t('password')}
					name="password"
					type="password"
					autocomplete="new-password"
					required
					bind:value={password}
					hint={t('password_hint')}
					error={tooShort ? t('password_short') : ''}
				/>
				<TextField
					label={t('confirm')}
					name="confirm"
					type="password"
					autocomplete="new-password"
					required
					bind:value={confirm}
					error={mismatch ? t('mismatch') : ''}
				/>
				{#if error}<p role="alert" class="lms-tone-danger rounded-lg px-3 py-2 text-sm">
						{error}
					</p>{/if}
				<button
					type="submit"
					class="btn lms-action-primary lms-focus-ring"
					disabled={busy || tooShort || mismatch || !password || !confirm}>{t('submit')}</button
				>
				<span class="text-lms-muted text-xs"
					>{t('expires', {
						date: formatDateTime(data.invitation.expires_at, i18n.locale, {
							dateStyle: 'medium',
							timeStyle: 'short'
						})
					})}</span
				>
			</form>
		{/if}
	</PageContainer>
</AppShell>
