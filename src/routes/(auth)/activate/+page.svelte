<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import PageContainer from '$lib/components/layout/PageContainer.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import { PREFIX, credentialFailureMessage } from '$lib/features/school-admin/school-admin.model';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string>) =>
		i18n.t(`${PREFIX}.activate_page.${key}`, params);
	const MIN_PASSWORD = 8;

	// svelte-ignore state_referenced_locally
	let username = $state(form && 'username' in form ? String(form.username ?? '') : '');
	let code = $state('');
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
				description={t('done_text', { username: String(form.username ?? '') })}
			>
				{#snippet actions()}<a
						class="btn lms-action-primary lms-focus-ring"
						href={resolve(APP_PATHS.LOGIN)}>{t('login')}</a
					>{/snippet}
			</StatePanel>
		{:else}
			<form
				method="POST"
				class="lms-card mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl p-6"
				use:enhance={() => {
					busy = true;
					return async ({ update }) => {
						await update({ reset: false });
						busy = false;
					};
				}}
			>
				<span class="text-lms-muted text-sm">{t('intro')}</span>
				<TextField
					label={t('username')}
					name="username"
					autocomplete="username"
					required
					bind:value={username}
					placeholder={t('username_ph')}
				/>
				<TextField
					label={t('code')}
					name="code"
					autocomplete="one-time-code"
					required
					bind:value={code}
					hint={t('code_hint')}
				/>
				<TextField
					label={t('password')}
					name="password"
					type="password"
					autocomplete="new-password"
					required
					bind:value={password}
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
					disabled={busy || tooShort || mismatch || !username || !code || !password}
					>{t('submit')}</button
				>
			</form>
		{/if}
	</PageContainer>
</AppShell>
