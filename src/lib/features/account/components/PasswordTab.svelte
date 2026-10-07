<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Link from '@lucide/svelte/icons/link';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Mail from '@lucide/svelte/icons/mail';
	import MessageSquareLock from '@lucide/svelte/icons/message-square-lock';
	import Minus from '@lucide/svelte/icons/minus';
	import Send from '@lucide/svelte/icons/send';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import X from '@lucide/svelte/icons/x';
	import type { PasswordChallenge, PasswordChangeResult } from '$lib/api/generated/lms';
	import type { AccountPageState } from '../account.state.svelte';
	import {
		OTP_LENGTH,
		PASSWORD_RULES,
		clientLabel,
		formatDateTime,
		passwordChecks,
		passwordScore,
		secondsUntil
	} from '../account.model';
	import {
		buttonPrimary,
		buttonSecondary,
		card,
		cardTitle,
		fieldLabel,
		groupClass
	} from './styles';

	interface Props {
		page: AccountPageState;
		reset: { token: string; valid: boolean } | null;
		errorText: (code: string) => string;
	}

	let { page, reset, errorText }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`account.password.${key}`, params);

	type Field = 'cur' | 'nw' | 'cf';
	let pw = $state<Record<Field, string>>({ cur: '', nw: '', cf: '' });
	let visible = $state<Record<Field, boolean>>({ cur: false, nw: false, cf: false });
	let others = $state(true);
	let tried = $state(false);
	let pwError = $state('');
	let caps = $state(false);
	let busy = $state(false);
	let done = $state<{ others: boolean } | null>(null);
	// svelte-ignore state_referenced_locally
	let resetMode = $state(Boolean(reset?.valid));
	// svelte-ignore state_referenced_locally
	let resetInvalid = $state(Boolean(reset && !reset.valid));
	let linkBusy = $state(false);

	let challenge = $state<PasswordChallenge | null>(null);
	let otp = $state('');
	let otpError = $state('');
	let otpBusy = $state(false);

	const overview = $derived(page.overview);
	const fullName = $derived(overview.profile.full_name);
	const checks = $derived(passwordChecks(pw.nw, fullName));
	const met = $derived(PASSWORD_RULES.filter((r) => checks[r]).length);
	const score = $derived(passwordScore(pw.nw, met));
	const same = $derived(!resetMode && Boolean(pw.nw) && pw.nw === pw.cur);
	const cfMatch = $derived(Boolean(pw.cf) && pw.cf === pw.nw);
	const ready = $derived(
		(resetMode || Boolean(pw.cur)) && met === PASSWORD_RULES.length && cfMatch && !same
	);
	const curMissing = $derived(tried && !pw.cur && !resetMode);
	const otherCount = $derived(Math.max(0, overview.sessions.length - 1));
	const otpTarget = $derived(
		i18n.t(`account.channel.${overview.password.otp_channel.channel}`, {
			target: overview.password.otp_channel.target
		})
	);
	const challengeTarget = $derived(
		challenge ? i18n.t(`account.channel.${challenge.channel}`, { target: challenge.target }) : ''
	);
	const resendLeft = $derived(secondsUntil(challenge?.resend_available_at ?? null, page.now));

	const STRENGTH = [
		{ key: 'empty', tone: 'text-lms-muted', bar: 'bg-lms-surface-muted' },
		{ key: 'weak', tone: 'text-lms-danger-text', bar: 'bg-lms-danger-text' },
		{ key: 'fair', tone: 'text-lms-warning-text', bar: 'bg-lms-warning-text' },
		{ key: 'strong', tone: 'text-lms-foreground', bar: 'bg-lms-interactive' },
		{ key: 'very_strong', tone: 'text-lms-success-text', bar: 'bg-lms-success-text' }
	] as const;
	const strength = $derived(STRENGTH[score]);

	function clear() {
		pw = { cur: '', nw: '', cf: '' };
		tried = false;
		pwError = '';
	}

	async function submit() {
		if (busy) return;
		if (!ready) {
			tried = true;
			pwError = '';
			return;
		}
		busy = true;
		pwError = '';
		const outcome = await page.call<PasswordChallenge>('passwordStart', {
			current_password: resetMode ? '' : pw.cur,
			reset_token: resetMode ? (reset?.token ?? '') : '',
			new_password: pw.nw,
			confirm_password: pw.cf,
			logout_others: others
		});
		busy = false;
		if (outcome.ok) {
			challenge = outcome.data;
			otp = '';
			otpError = '';
			return;
		}
		tried = true;
		if (outcome.code === 'wrong_current_password') {
			pwError = t('wrong_current', { count: outcome.remaining ?? 0 });
		} else if (outcome.code === 'password_change_locked') {
			pwError = t('locked');
		} else if (outcome.code === 'challenge_expired') {
			resetMode = false;
			resetInvalid = true;
		} else if (outcome.code === 'validation_failed') {
			pwError = outcome.issues.map((i) => t(`issues.${i.code}`)).join(' ');
		} else {
			pwError = errorText(outcome.code);
		}
	}

	async function verify() {
		if (!challenge || otpBusy) return;
		if (otp.length < OTP_LENGTH) {
			otpError = t('otp.too_short');
			return;
		}
		otpBusy = true;
		const outcome = await page.call<PasswordChangeResult>('passwordVerify', {
			challenge_id: challenge.challenge_id,
			code: otp
		});
		otpBusy = false;
		if (outcome.ok) {
			page.apply(outcome.data.overview);
			challenge = null;
			done = { others: outcome.data.logged_out_others };
			resetMode = false;
			clear();
			visible = { cur: false, nw: false, cf: false };
			return;
		}
		if (outcome.code === 'invalid_code') {
			otpError = t('otp.wrong', { count: outcome.remaining ?? 0 });
		} else {
			challenge = null;
			pwError = outcome.code === 'challenge_expired' ? t('otp.expired') : errorText(outcome.code);
		}
	}

	async function resend() {
		if (!challenge || resendLeft) return;
		const outcome = await page.call<PasswordChallenge>('passwordResend', {
			challenge_id: challenge.challenge_id
		});
		if (outcome.ok) {
			challenge = outcome.data;
			otpError = '';
			page.say(t('otp.resent', { target: challengeTarget }), Send);
		} else {
			otpError = errorText(outcome.code);
		}
	}

	async function forgot() {
		if (linkBusy) return;
		linkBusy = true;
		const outcome = await page.run('resetLink');
		linkBusy = false;
		if (outcome.ok) page.say(t('reset_sent_toast', { email: overview.profile.email }), Mail);
		else page.say(errorText(outcome.code), CircleX);
	}

	const keydown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') void submit();
	};
	const onCaps = (e: KeyboardEvent) => (caps = e.getModifierState?.('CapsLock') ?? false);

	const borders = $derived({
		cur: curMissing || Boolean(pwError && !resetMode),
		nw: tried && (met < PASSWORD_RULES.length || same),
		cf: (tried && !cfMatch) || (Boolean(pw.cf) && pw.cf.length >= pw.nw.length && !cfMatch)
	});

	const historyIcon = (method: string) =>
		method === 'reset_link' ? Mail : method === 'initial' ? UserPlus : KeyRound;
</script>

{#snippet secret(
	field: Field,
	label: string,
	autocomplete: 'current-password' | 'new-password',
	extra?: { ok?: boolean; placeholder?: string; paste?: boolean }
)}
	<span class={groupClass(borders[field], extra?.ok)}>
		<input
			type={visible[field] ? 'text' : 'password'}
			{autocomplete}
			aria-label={label}
			placeholder={extra?.placeholder}
			class="h-[43px] min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
			bind:value={pw[field]}
			oninput={() => field === 'cur' && (pwError = '')}
			onkeydown={keydown}
			onkeyup={field === 'nw' ? onCaps : undefined}
			onpaste={extra?.paste === false ? (e) => e.preventDefault() : undefined}
		/>
		<button
			type="button"
			class="bg-lms-surface-muted text-lms-muted lms-focus-ring w-11"
			aria-label={visible[field] ? t('hide') : t('show')}
			onclick={() => (visible[field] = !visible[field])}
			><span class="inline-flex"><Icon icon={visible[field] ? EyeOff : Eye} size="sm" /></span
			></button
		>
	</span>
{/snippet}

{#if overview.password.reset_link_sent && !resetMode && !done}
	<div class="lms-tone-info flex flex-wrap items-center gap-3 rounded-xl px-4 py-3.5">
		<Icon icon={Mail} />
		<span class="flex-[1_1_240px] text-[13px] leading-5"
			><b>{t('reset_sent_title')}</b>
			{t('reset_sent_text', { email: overview.profile.email })}</span
		>
	</div>
{/if}
{#if resetMode}
	<div class="lms-tone-success flex flex-wrap items-center gap-3 rounded-xl px-4 py-3.5">
		<Icon icon={Link} />
		<span class="flex-[1_1_240px] text-[13px] leading-5"
			><b>{t('reset_valid_title')}</b> {t('reset_valid_text')}</span
		>
		<button
			type="button"
			class="lms-focus-ring h-[34px] rounded-lg border border-current px-3 text-xs font-semibold"
			onclick={() => {
				resetMode = false;
				clear();
			}}>{t('reset_exit')}</button
		>
	</div>
{/if}
{#if resetInvalid}
	<div
		class="lms-tone-danger flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] leading-5"
		role="alert"
	>
		<span class="mt-0.5"><Icon icon={CircleAlert} size="sm" /></span>{t('reset_invalid')}
	</div>
{/if}

{#if done}
	<section class="{card} items-center gap-3 px-6 py-7 text-center">
		<span class="lms-tone-success flex size-14 items-center justify-center rounded-full"
			><Icon icon={ShieldCheck} size="lg" /></span
		>
		<h2 class="text-[19px] font-bold">{t('done_title')}</h2>
		<p class="text-lms-muted max-w-110 text-sm leading-[22px]">
			{done.others
				? t('done_others', { email: overview.profile.email })
				: t('done_text', { email: overview.profile.email })}
		</p>
		<button
			type="button"
			class="{buttonSecondary} h-10 px-4 text-[13px]"
			onclick={() => (done = null)}>{t('done_close')}</button
		>
	</section>
{:else}
	<div class="flex flex-wrap items-start gap-3.5">
		<section class="{card} min-w-0 flex-[1_1_360px] gap-4">
			<div class="flex flex-wrap items-baseline justify-between gap-3">
				<h2 class={cardTitle}>{t('title')}</h2>
				<span class="text-lms-muted text-xs"
					>{t('last_changed', { date: formatDateTime(overview.password.last_changed_at) })}</span
				>
			</div>
			{#if !resetMode}
				<div class="flex flex-col gap-1.5">
					<span class="flex items-baseline justify-between gap-2">
						<span class={fieldLabel}>{t('current')}</span>
						<button
							type="button"
							class="text-lms-link lms-focus-ring text-xs font-semibold"
							disabled={linkBusy}
							onclick={forgot}>{t('forgot')}</button
						>
					</span>
					{@render secret('cur', t('current'), 'current-password')}
					<span class="text-xs {curMissing ? 'text-lms-danger-text' : 'text-lms-muted'}"
						>{curMissing ? t('current_required') : t('current_hint')}</span
					>
				</div>
			{/if}
			<div class="flex flex-col gap-1.5">
				<span class={fieldLabel}>{t('new')}</span>
				{@render secret('nw', t('new'), 'new-password', { placeholder: t('new_placeholder') })}
				<span class="grid grid-cols-4 gap-1" aria-hidden="true">
					{#each [1, 2, 3, 4] as i (i)}
						<span class="h-[5px] rounded-full {i <= score ? strength.bar : 'bg-lms-surface-muted'}"
						></span>
					{/each}
				</span>
				<span class="flex justify-between gap-2 text-xs">
					<span class="font-semibold {same ? 'text-lms-danger-text' : strength.tone}"
						>{same ? t('same') : t('strength', { level: t(`strength_${strength.key}`) })}</span
					>
					{#if caps}<span class="text-lms-warning-text">{t('caps')}</span>{/if}
				</span>
			</div>
			<div class="flex flex-col gap-1.5">
				<span class={fieldLabel}>{t('confirm')}</span>
				{@render secret('cf', t('confirm'), 'new-password', { ok: cfMatch, paste: false })}
				<span
					class="text-xs {!pw.cf
						? 'text-lms-muted'
						: cfMatch
							? 'text-lms-success-text'
							: 'text-lms-danger-text'}"
					>{!pw.cf ? t('confirm_hint') : cfMatch ? t('confirm_match') : t('confirm_mismatch')}</span
				>
			</div>
			<button
				type="button"
				class="lms-focus-ring flex items-center gap-3 text-start"
				role="checkbox"
				aria-checked={others}
				onclick={() => (others = !others)}
			>
				<span
					class="text-lms-on-interactive flex size-5 flex-none items-center justify-center rounded-[5px] border-[1.5px] {others
						? 'bg-lms-interactive border-lms-interactive'
						: 'border-lms-border-strong'}"
					><span class={others ? 'opacity-100' : 'opacity-0'}><Icon icon={Check} size="sm" /></span
					></span
				>
				<span class="flex flex-col gap-0.5">
					<span class="text-sm font-semibold">{t('others')}</span>
					<span class="text-lms-muted text-xs">{t('others_count', { count: otherCount })}</span>
				</span>
			</button>
			{#if pwError}
				<div
					class="lms-tone-danger flex items-start gap-2.5 rounded-[10px] px-3.5 py-3 text-[13px] leading-5"
					role="alert"
				>
					<span class="mt-0.5"><Icon icon={CircleAlert} size="sm" /></span><span>{pwError}</span>
				</div>
			{/if}
			<div class="flex flex-wrap justify-end gap-2.5">
				<button type="button" class="{buttonSecondary} h-11 px-4 text-sm" onclick={clear}
					>{t('clear')}</button
				>
				<button
					type="button"
					class="lms-focus-ring inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-bold {ready
						? 'bg-lms-interactive text-lms-on-interactive'
						: 'bg-lms-surface-muted text-lms-muted'}"
					onclick={submit}
				>
					<span class={busy ? 'animate-spin' : ''}
						><Icon icon={busy ? LoaderCircle : ShieldCheck} size="sm" /></span
					>
					{busy ? t('checking') : t('submit')}
				</button>
			</div>
		</section>
		<div class="flex min-w-60 flex-[0_1_280px] flex-col gap-3.5">
			<section class="{card} gap-2.5 p-4.5">
				<h2 class="text-[15px] font-bold">{t('rules_title')}</h2>
				{#each PASSWORD_RULES as rule (rule)}
					{@const ok = checks[rule]}
					<span
						class="flex items-center gap-2.5 text-[13px] {ok
							? 'text-lms-foreground'
							: tried
								? 'text-lms-danger-text'
								: 'text-lms-muted'}"
					>
						<span
							class="flex size-5 flex-none items-center justify-center rounded-full border-[1.5px] {ok
								? 'bg-lms-success-text border-lms-success-text text-lms-on-interactive'
								: tried
									? 'border-lms-danger-text'
									: 'border-lms-border-strong'}"
							><Icon icon={ok ? Check : tried ? X : Minus} size="sm" /></span
						>
						{t(`rules.${rule}`)}
					</span>
				{/each}
			</section>
			<div
				class="bg-lms-surface-muted text-lms-muted flex items-start gap-2.5 rounded-xl p-3.5 text-xs leading-[18px]"
			>
				<span class="text-lms-foreground mt-0.5"><Icon icon={MessageSquareLock} size="sm" /></span>
				<span>{t('otp_info', { target: otpTarget })}</span>
			</div>
		</div>
	</div>
{/if}

<section class="{card} gap-1">
	<h2 class="{cardTitle} mb-2">{t('history_title')}</h2>
	{#each overview.password.history as h, i (i)}
		<div
			class="border-lms-border flex flex-wrap items-center gap-3 border-b py-2.5 last:border-b-0"
		>
			<span
				class="bg-lms-surface-muted text-lms-muted flex size-8 flex-none items-center justify-center rounded-lg"
				><Icon icon={historyIcon(h.method)} size="sm" /></span
			>
			<span class="flex flex-[1_1_200px] flex-col gap-0.5">
				<span class="text-sm font-semibold">{t(`history.${h.method}`)}</span>
				<span class="text-lms-muted text-xs"
					>{h.method === 'initial'
						? t('history.initial_device')
						: [clientLabel(h.client, i18n.t('account.unknown_device')), h.ip]
								.filter(Boolean)
								.join(' · ')}</span
				>
			</span>
			<span class="text-lms-muted text-xs">{formatDateTime(h.created_at)}</span>
		</div>
	{/each}
</section>

{#if challenge}
	<div
		class="fixed inset-0 z-90 flex items-center justify-center bg-[rgba(10,16,41,0.55)] p-4"
		role="presentation"
	>
		<div
			class="bg-lms-surface border-lms-border flex w-[min(100%,420px)] flex-col gap-4 rounded-2xl border p-6 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="otp-title"
		>
			<span class="lms-tone-info flex size-11 items-center justify-center rounded-xl"
				><Icon icon={MessageSquareLock} /></span
			>
			<span class="flex flex-col gap-1.5">
				<h2 id="otp-title" class="text-lg font-bold">{t('otp.title')}</h2>
				<span class="text-lms-muted text-sm leading-[21px]"
					>{t('otp.text', { target: challengeTarget })}</span
				>
			</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				autofocus
				inputmode="numeric"
				autocomplete="one-time-code"
				maxlength={OTP_LENGTH}
				placeholder="••••••"
				aria-label={t('otp.title')}
				class="bg-lms-surface lms-focus-ring h-[52px] rounded-[10px] border-[1.5px] px-3.5 text-center font-mono text-[22px] tracking-[0.5em] outline-none {otpError
					? 'border-lms-danger-text'
					: 'border-lms-border-strong'}"
				value={otp}
				oninput={(e) => {
					otp = e.currentTarget.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
					e.currentTarget.value = otp;
					otpError = '';
				}}
				onkeydown={(e) => e.key === 'Enter' && verify()}
			/>
			<span
				class="-mt-2 text-xs {otpError ? 'text-lms-danger-text' : 'text-lms-muted'}"
				role="status">{otpError || t('otp.valid')}</span
			>
			<div class="flex flex-wrap items-center justify-between gap-2.5">
				<button
					type="button"
					class="lms-focus-ring text-[13px] font-semibold {resendLeft
						? 'text-lms-muted cursor-default'
						: 'text-lms-link'}"
					onclick={resend}
					>{resendLeft ? t('otp.resend_in', { seconds: resendLeft }) : t('otp.resend')}</button
				>
				<div class="flex gap-2">
					<button
						type="button"
						class="{buttonSecondary} h-10 px-3.5 text-[13px]"
						onclick={() => (challenge = null)}>{t('otp.cancel')}</button
					>
					<button type="button" class="{buttonPrimary} h-10 px-4 text-[13px]" onclick={verify}>
						<span class={otpBusy ? 'animate-spin' : ''}
							><Icon icon={otpBusy ? LoaderCircle : Check} size="sm" /></span
						>
						{t('otp.verify')}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
