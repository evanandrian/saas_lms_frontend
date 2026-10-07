<script lang="ts">
	import type { RegistrationState } from '$lib/api/generated/lms';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import type { PageActionOutcome } from '$lib/utils/page-action';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Clock from '@lucide/svelte/icons/clock';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Mail from '@lucide/svelte/icons/mail';
	import MailCheck from '@lucide/svelte/icons/mail-check';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import { RULES } from '../../registration.model';
	import type { Challenge, RegistrationWizard } from '../../registration.state.svelte';

	interface Props {
		wizard: RegistrationWizard;
		act: <T>(name: string, body?: unknown) => Promise<PageActionOutcome<T>>;
		onBack: () => void;
		onVerified: () => void;
	}

	let { wizard, act, onBack, onVerified }: Props = $props();
	const i18n = useI18n();
	const uid = $props.id();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`register.${key}`, params);
	const SLOTS = Array.from({ length: RULES.otpDigits }, (_, i) => i);

	let now = $state(Date.now());
	let checking = $state(false);
	let focused = $state(false);
	const verified = $derived(Boolean(wizard.server?.application));
	const resendIn = $derived(
		wizard.challenge
			? Math.max(0, Math.ceil((new Date(wizard.challenge.resendAt).getTime() - now) / 1000))
			: 0
	);
	const isWhatsapp = $derived(wizard.challenge?.channel === 'whatsapp');

	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	async function onInput(e: Event & { currentTarget: HTMLInputElement }) {
		const v = e.currentTarget.value.replace(/\D/g, '').slice(0, RULES.otpDigits);
		e.currentTarget.value = v;
		wizard.otp = v;
		wizard.otpError = null;
		if (v.length !== RULES.otpDigits || verified) return;
		checking = true;
		const result = await act<RegistrationState>('otpVerify', { code: v });
		checking = false;
		if (result.ok) onVerified();
		else wizard.otpError = result.code;
	}

	async function resend(channel: 'email' | 'whatsapp') {
		const result = await act<Challenge>('otpResend', { channel });
		if (result.ok) {
			wizard.challenge = result.data;
			wizard.otp = '';
			wizard.otpError = null;
		} else if (result.code === 'challenge_expired') {
			onBack();
		}
	}

	const mmss = (s: number) =>
		`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
</script>

<section class="lms-card flex max-w-140 flex-col gap-5 rounded-[14px]! p-7 shadow-none!">
	<div class="flex items-center gap-3.5">
		<span
			class="bg-lms-interactive-subtle text-lms-interactive-subtle-text flex size-12 flex-none items-center justify-center rounded-[14px]"
		>
			<Icon icon={isWhatsapp ? MessageCircle : MailCheck} />
		</span>
		<span class="flex min-w-0 flex-col gap-0.5">
			<span class="text-lms-muted text-sm">{t('otp.sent_to')}</span>
			<span class="truncate text-[0.9375rem] font-bold"
				>{wizard.challenge?.target ?? wizard.email}</span
			>
		</span>
		<button
			type="button"
			class="text-lms-link lms-focus-ring ms-auto text-[0.8125rem] font-semibold whitespace-nowrap"
			onclick={onBack}>{t('otp.change')}</button
		>
	</div>
	<label class="relative block cursor-text" for="{uid}-otp">
		<span class="grid grid-cols-6 gap-2" aria-hidden="true">
			{#each SLOTS as i (i)}
				{@const active = focused && i === wizard.otp.length && !checking && !verified}
				<span
					class={[
						'flex h-15.5 items-center justify-center rounded-xl font-mono text-[1.625rem] font-semibold transition-colors',
						verified
							? 'border-lms-progress bg-lms-progress/10 border-2'
							: wizard.otpError
								? 'border-lms-danger-text bg-lms-danger-subtle border-2'
								: active
									? 'border-lms-interactive border-2'
									: wizard.otp[i]
										? 'border-lms-foreground border-[1.5px]'
										: 'border-lms-input-border border-[1.5px]'
					]}>{wizard.otp[i] ?? ''}</span
				>
			{/each}
		</span>
		<input
			id="{uid}-otp"
			value={wizard.otp}
			oninput={onInput}
			onfocus={() => (focused = true)}
			onblur={() => (focused = false)}
			inputmode="numeric"
			autocomplete="one-time-code"
			maxlength={RULES.otpDigits}
			aria-label={t('otp.label')}
			class="absolute inset-0 h-full w-full text-base opacity-0"
		/>
	</label>
	<p
		class={[
			'flex items-center gap-2 text-[0.8125rem]',
			verified
				? 'text-lms-success-text'
				: wizard.otpError
					? 'text-lms-danger-text'
					: 'text-lms-muted'
		]}
		aria-live="polite"
	>
		<Icon
			icon={verified ? CircleCheck : checking ? LoaderCircle : wizard.otpError ? CircleX : Clock}
			size="sm"
		/>
		{verified
			? t('otp.verified')
			: checking
				? t('otp.checking')
				: wizard.otpError
					? t(wizard.otpError === 'too_many_attempts' ? 'otp.too_many' : 'otp.wrong')
					: t('otp.validity')}
	</p>
	<div
		class="border-lms-border flex flex-wrap justify-between gap-3 border-t pt-4 text-[0.8125rem]"
	>
		{#if resendIn > 0 && !verified}
			<span class="text-lms-muted"
				>{t('otp.resend_in')}
				<span class="text-lms-foreground font-mono font-semibold">{mmss(resendIn)}</span></span
			>
		{:else if !verified}
			<button
				type="button"
				class="text-lms-link lms-focus-ring font-semibold"
				onclick={() => resend(isWhatsapp ? 'whatsapp' : 'email')}>{t('otp.resend')}</button
			>
		{/if}
		{#if !verified}
			<button
				type="button"
				class="text-lms-link lms-focus-ring flex items-center gap-1.5 font-semibold"
				disabled={resendIn > 0}
				onclick={() => resend(isWhatsapp ? 'email' : 'whatsapp')}
			>
				<Icon icon={isWhatsapp ? Mail : MessageCircle} size="sm" />{isWhatsapp
					? t('otp.via_email')
					: t('otp.via_whatsapp')}
			</button>
		{/if}
	</div>
</section>
