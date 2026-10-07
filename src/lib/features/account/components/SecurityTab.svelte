<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Download from '@lucide/svelte/icons/download';
	import KeySquare from '@lucide/svelte/icons/key-square';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import ShieldPlus from '@lucide/svelte/icons/shield-plus';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import type { AccountOverview, BackupCodesResult, TwoFactorSetup } from '$lib/api/generated/lms';
	import type { AccountPageState } from '../account.state.svelte';
	import { OTP_LENGTH } from '../account.model';
	import Switch from './Switch.svelte';
	import {
		buttonDanger,
		buttonPrimary,
		buttonSecondary,
		card,
		cardTitle,
		eyebrow,
		fieldLabel
	} from './styles';

	interface Props {
		page: AccountPageState;
		errorText: (code: string) => string;
	}

	let { page, errorText }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`account.security.${key}`, params);

	type Method = 'app' | 'whatsapp';
	type Step = 'method' | 'verify' | 'codes' | null;
	let step = $state<Step>(null);
	let method = $state<Method>('app');
	let setup = $state<TwoFactorSetup | null>(null);
	let code = $state('');
	let codeError = $state('');
	let busy = $state(false);
	let codes = $state<string[]>([]);
	/** Overview setelah verifikasi; diterapkan saat "Selesai & aktifkan" (urutan referensi). */
	let pendingOverview = $state<AccountOverview | null>(null);
	let alertBusy = $state(false);

	const security = $derived(page.overview.security);
	const enabled = $derived(security.two_factor_enabled);
	const phone = $derived(page.overview.profile.phone);
	const waTarget = $derived(
		phone ? i18n.t('account.channel.whatsapp', { target: maskPhone(phone) }) : ''
	);
	const waUsable = $derived(Boolean(phone) && security.whatsapp_available);

	function maskPhone(d: string) {
		return d.length < 6 ? `+62 ${d}` : `+62 ${d.slice(0, 3)}••••${d.slice(-3)}`;
	}

	const sub = $derived(
		enabled
			? t('active_sub', {
					method:
						security.two_factor_method === 'app'
							? t('method_app_short')
							: t('method_wa_short', { target: waTarget })
				})
			: t('inactive_sub')
	);

	async function next() {
		if (busy) return;
		busy = true;
		const outcome = await page.call<TwoFactorSetup>('twoFactorSetup', { method });
		busy = false;
		if (!outcome.ok) {
			page.say(errorText(outcome.code), CircleX);
			return;
		}
		setup = outcome.data;
		code = '';
		codeError = '';
		step = 'verify';
	}

	async function verify() {
		if (busy) return;
		if (code.length < OTP_LENGTH) {
			codeError = t('code_short');
			return;
		}
		busy = true;
		const outcome = await page.call<BackupCodesResult>('twoFactorVerify', { code });
		busy = false;
		if (!outcome.ok) {
			codeError =
				outcome.code === 'validation_failed' || outcome.code === 'invalid_code'
					? t('code_wrong')
					: errorText(outcome.code);
			return;
		}
		codes = outcome.data.codes;
		pendingOverview = outcome.data.overview;
		step = 'codes';
	}

	async function regenerate() {
		if (busy) return;
		busy = true;
		const outcome = await page.call<BackupCodesResult>('backupCodes');
		busy = false;
		if (!outcome.ok) {
			page.say(errorText(outcome.code), CircleX);
			return;
		}
		codes = outcome.data.codes;
		pendingOverview = outcome.data.overview;
		step = 'codes';
	}

	function finish() {
		const first = !enabled;
		page.apply(pendingOverview ?? undefined);
		pendingOverview = null;
		step = null;
		setup = null;
		if (first) page.say(t('enabled_toast'), ShieldCheck);
	}

	function download() {
		const text = `${t('file_title', { email: page.overview.profile.email })}\n\n${codes.join('\n')}\n\n${t('file_note')}`;
		const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = 'flixare-kode-cadangan.txt';
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	}

	async function toggleAlert(key: 'new_device_alert' | 'lockout_enabled') {
		if (alertBusy) return;
		alertBusy = true;
		const body = {
			new_device_alert: security.new_device_alert,
			lockout_enabled: security.lockout_enabled,
			[key]: !security[key]
		};
		const outcome = await page.run('securityAlerts', body);
		alertBusy = false;
		page.say(
			outcome.ok ? t('alerts_saved') : errorText(outcome.code),
			outcome.ok ? undefined : CircleX
		);
	}

	const METHODS = $derived([
		{
			key: 'app' as const,
			icon: Smartphone,
			label: t('method_app'),
			sub: t('method_app_sub'),
			disabled: false
		},
		{
			key: 'whatsapp' as const,
			icon: MessageCircle,
			label: t('method_wa'),
			sub: waUsable
				? t('method_wa_sub', { target: waTarget })
				: t(phone ? 'method_wa_unavailable' : 'method_wa_no_phone'),
			disabled: !waUsable
		}
	]);
</script>

<section class="{card} gap-4">
	<div class="flex flex-wrap items-center gap-3.5">
		<span
			class="flex size-11 flex-none items-center justify-center rounded-xl {enabled
				? 'lms-tone-success'
				: 'bg-lms-surface-muted text-lms-muted'}"><Icon icon={ShieldCheck} /></span
		>
		<span class="flex flex-[1_1_220px] flex-col gap-0.5">
			<h2 class={cardTitle}>{t('title')}</h2>
			<span class="text-lms-muted text-[13px]">{sub}</span>
		</span>
		<span
			class="rounded-full px-2.5 py-1 text-[11px] font-bold {enabled
				? 'lms-tone-success'
				: 'lms-tone-warning'}">{enabled ? t('chip_on') : t('chip_off')}</span
		>
	</div>

	{#if !enabled && !step}
		<button
			type="button"
			class="{buttonPrimary} h-[42px] self-start px-4.5 text-sm"
			onclick={() => (step = 'method')}><Icon icon={ShieldPlus} size="sm" />{t('start')}</button
		>
	{/if}

	{#if step === 'method'}
		<div class="border-lms-border flex flex-col gap-2.5 border-t pt-4">
			<span class={eyebrow}>{t('step_method')}</span>
			{#each METHODS as m (m.key)}
				{@const active = method === m.key}
				<button
					type="button"
					role="radio"
					aria-checked={active}
					disabled={m.disabled}
					class="lms-focus-ring flex items-center gap-3 rounded-[10px] border-[1.5px] px-3.5 py-3 text-start disabled:cursor-not-allowed disabled:opacity-60 {active
						? 'border-lms-interactive bg-lms-interactive-subtle'
						: 'border-lms-border bg-lms-surface'}"
					onclick={() => (method = m.key)}
				>
					<span
						class="bg-lms-surface size-4.5 flex-none rounded-full {active
							? 'border-lms-interactive border-[6px]'
							: 'border-lms-border-strong border-2'}"
					></span>
					<span class="text-lms-foreground"><Icon icon={m.icon} /></span>
					<span class="flex flex-col gap-0.5">
						<span class="text-sm font-bold">{m.label}</span>
						<span class="text-lms-muted text-xs">{m.sub}</span>
					</span>
				</button>
			{/each}
			<div class="flex justify-end gap-2.5">
				<button
					type="button"
					class="{buttonSecondary} h-10 px-4 text-[13px]"
					onclick={() => (step = null)}>{t('cancel')}</button
				>
				<button
					type="button"
					class="{buttonPrimary} h-10 px-4 text-[13px]"
					disabled={busy}
					onclick={next}>{t('next')}</button
				>
			</div>
		</div>
	{/if}

	{#if step === 'verify' && setup}
		<div class="border-lms-border flex flex-col gap-3.5 border-t pt-4">
			<span class={eyebrow}>{t('step_verify')}</span>
			<div class="flex flex-wrap items-center gap-4">
				{#if setup.method === 'app' && setup.qr_code}
					<img
						src={setup.qr_code}
						alt={t('qr_alt')}
						class="border-lms-border size-33 flex-none rounded-[10px] border bg-lms-on-interactive p-1 [image-rendering:pixelated]"
					/>
				{/if}
				<span class="text-lms-muted flex flex-[1_1_220px] flex-col gap-1.5 text-[13px] leading-5">
					<span
						>{setup.method === 'app' ? t('instr_app') : t('instr_wa', { target: waTarget })}</span
					>
					{#if setup.manual_key}
						<span
							>{t('manual_key')}
							<b class="text-lms-foreground font-mono">{setup.manual_key}</b></span
						>
					{/if}
				</span>
			</div>
			<label class="flex max-w-65 flex-col gap-1.5">
				<span class={fieldLabel}>{t('code_label')}</span>
				<input
					inputmode="numeric"
					autocomplete="one-time-code"
					maxlength={OTP_LENGTH}
					placeholder="••••••"
					class="bg-lms-surface lms-focus-ring h-12 rounded-[10px] border-[1.5px] px-3.5 font-mono text-xl tracking-[0.4em] outline-none {codeError
						? 'border-lms-danger-text'
						: 'border-lms-border-strong'}"
					value={code}
					oninput={(e) => {
						code = e.currentTarget.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
						e.currentTarget.value = code;
						codeError = '';
					}}
					onkeydown={(e) => e.key === 'Enter' && verify()}
				/>
				<span class="text-lms-danger-text text-xs" role="alert">{codeError}</span>
			</label>
			<div class="flex justify-end gap-2.5">
				<button
					type="button"
					class="{buttonSecondary} h-10 px-4 text-[13px]"
					onclick={() => (step = 'method')}>{t('back')}</button
				>
				<button
					type="button"
					class="{buttonPrimary} h-10 px-4 text-[13px]"
					disabled={busy}
					onclick={verify}>{t('verify')}</button
				>
			</div>
		</div>
	{/if}

	{#if step === 'codes'}
		<div class="border-lms-border flex flex-col gap-3.5 border-t pt-4">
			<span class={eyebrow}>{enabled ? t('codes_new') : t('step_codes')}</span>
			<span class="text-lms-muted text-[13px] leading-5">{t('codes_text')}</span>
			<div
				class="bg-lms-surface-muted grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2 rounded-[10px] p-3.5"
			>
				{#each codes as c (c)}
					<span class="text-center font-mono text-sm font-semibold">{c}</span>
				{/each}
			</div>
			<div class="flex flex-wrap justify-end gap-2.5">
				<button type="button" class="{buttonSecondary} h-10 px-4 text-[13px]" onclick={download}
					><Icon icon={Download} size="sm" />{t('download')}</button
				>
				<button type="button" class="{buttonPrimary} h-10 px-4 text-[13px]" onclick={finish}
					>{enabled ? t('close') : t('finish')}</button
				>
			</div>
		</div>
	{/if}

	{#if enabled && !step}
		<div class="border-lms-border flex flex-wrap gap-2.5 border-t pt-4">
			<button
				type="button"
				class="{buttonSecondary} h-10 px-4 text-[13px]"
				disabled={busy}
				onclick={regenerate}><Icon icon={KeySquare} size="sm" />{t('regenerate')}</button
			>
			<button
				type="button"
				class="{buttonDanger} h-10 px-4 text-[13px]"
				onclick={() => (page.confirm = 'tfa')}>{t('disable')}</button
			>
		</div>
	{/if}
</section>

<section class="{card} gap-3.5">
	<h2 class={cardTitle}>{t('alerts_title')}</h2>
	{#each ['new_device_alert', 'lockout_enabled'] as const as key (key)}
		<button
			type="button"
			role="switch"
			aria-checked={security[key]}
			class="lms-focus-ring flex items-center gap-3 text-start"
			disabled={alertBusy}
			onclick={() => toggleAlert(key)}
		>
			<Switch on={security[key]} />
			<span class="flex flex-col gap-0.5">
				<span class="text-sm font-semibold">{t(`${key}.label`)}</span>
				<span class="text-lms-muted text-xs">{t(`${key}.sub`)}</span>
			</span>
		</button>
	{/each}
</section>
