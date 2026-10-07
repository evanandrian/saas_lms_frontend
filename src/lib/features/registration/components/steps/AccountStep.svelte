<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import Check from '@lucide/svelte/icons/check';
	import Dot from '@lucide/svelte/icons/dot';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Presentation from '@lucide/svelte/icons/presentation';
	import School from '@lucide/svelte/icons/school';
	import Ticket from '@lucide/svelte/icons/ticket';
	import type { LucideIcon } from '@lucide/svelte';
	import {
		RULES,
		TENANT_TYPES,
		onlyDigits,
		passwordScore,
		type TenantType
	} from '../../registration.model';
	import type { RegistrationWizard } from '../../registration.state.svelte';
	import Field from '../Field.svelte';

	interface Props {
		wizard: RegistrationWizard;
		tried: boolean;
	}

	let { wizard, tried }: Props = $props();
	const i18n = useI18n();
	const uid = $props.id();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`register.${key}`, params);
	const ICONS: Record<TenantType, LucideIcon> = {
		school: School,
		personal: Presentation,
		event: Ticket
	};
	const SCORE_CLASSES = [
		'bg-lms-border',
		'bg-lms-danger-text',
		'bg-lms-scale-mid',
		'bg-lms-progress',
		'bg-lms-success-text'
	];

	const errors = $derived(wizard.errors);
	const show = (key: string, value: string) =>
		tried || value.length > 0 ? errors[key] : undefined;
	const errorText = (key: string, value: string) => {
		const code = show(key, value);
		return code ? t(`errors.${code}`) : undefined;
	};
	const score = $derived(passwordScore(wizard.password));
	const rules = $derived([
		{ key: 'rule_length', ok: wizard.password.length >= 8 },
		{ key: 'rule_case', ok: /[a-z]/.test(wizard.password) && /[A-Z]/.test(wizard.password) },
		{ key: 'rule_digit', ok: /\d/.test(wizard.password) }
	]);
	const locked = $derived(
		Boolean(wizard.server?.application && wizard.server.application.status !== 'draft')
	);

	function trialMeta(type: TenantType) {
		const plan = wizard.defaultPlan(type);
		if (type === 'event' || !plan?.trial_enabled) return t('type.meta_no_trial');
		const unit =
			plan.trial_unit === 'business_day'
				? 'business_day'
				: plan.trial_unit === 'hour'
					? 'hour'
					: 'day';
		return (
			t(`type.meta_trial_${unit}`, { n: plan.trial_length ?? 0 }) +
			' · ' +
			t(plan.trial_auto_approve ? 'type.auto' : 'type.reviewed')
		);
	}
</script>

<section class="lms-card flex flex-col gap-5.5 rounded-[14px]! p-6 shadow-none!">
	<div class="flex flex-col gap-2.5">
		<span class="text-[0.8125rem] font-semibold">{t('type.label')}</span>
		<div
			class="grid grid-cols-[repeat(auto-fit,minmax(11.875rem,1fr))] gap-2.5"
			role="radiogroup"
			aria-label={t('type.label')}
		>
			{#each TENANT_TYPES as type (type)}
				{@const selected = wizard.type === type}
				<button
					type="button"
					role="radio"
					aria-checked={selected}
					disabled={locked && !selected}
					class={[
						'lms-focus-ring flex flex-col gap-2 rounded-xl p-4 text-left transition-colors',
						selected
							? 'border-lms-interactive bg-lms-interactive-subtle border-2'
							: 'border-lms-border bg-lms-surface border'
					]}
					onclick={() => wizard.pickType(type)}
				>
					<span class="flex w-full items-center justify-between">
						<span class={selected ? 'text-lms-interactive' : 'text-lms-muted'}
							><Icon icon={ICONS[type]} /></span
						>
						<span
							class={[
								'bg-lms-surface size-4.5 rounded-full',
								selected
									? 'border-lms-interactive border-[6px]'
									: 'border-lms-input-border border-2'
							]}
						></span>
					</span>
					<span class="text-[0.9375rem] font-bold">{t(`type.${type}.name`)}</span>
					<span class="text-lms-muted text-xs leading-4.5">{t(`type.${type}.desc`)}</span>
					<span class="font-mono text-[11px]">{trialMeta(type)}</span>
				</button>
			{/each}
		</div>
	</div>
	<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-x-4.5 gap-y-4">
		<Field
			label={t('account.full_name')}
			for="{uid}-name"
			error={errorText('fullName', wizard.fullName)}
			wide
		>
			<input
				id="{uid}-name"
				bind:value={wizard.fullName}
				placeholder={t('account.full_name_ph')}
				autocomplete="name"
				class="input lms-input lms-focus-ring h-11 text-[0.9375rem]"
				aria-invalid={Boolean(show('fullName', wizard.fullName))}
			/>
		</Field>
		<Field
			label={t('account.email')}
			for="{uid}-email"
			error={errorText('email', wizard.email)}
			hint={wizard.type === 'school' ? t('account.email_hint_school') : t('account.email_hint')}
		>
			<input
				id="{uid}-email"
				type="email"
				bind:value={wizard.email}
				placeholder="nama@sekolah.sch.id"
				autocomplete="email"
				class="input lms-input lms-focus-ring h-11 text-[0.9375rem]"
				aria-invalid={Boolean(show('email', wizard.email))}
			/>
		</Field>
		<Field label={t('account.whatsapp')} for="{uid}-wa" error={errorText('phone', wizard.phone)}>
			<span
				class="border-lms-input-border bg-lms-surface flex overflow-hidden rounded-[10px] border-[1.5px]"
			>
				<span
					class="bg-lms-surface-muted text-lms-muted border-lms-border flex items-center border-e px-3 text-sm"
					>+62</span
				>
				<input
					id="{uid}-wa"
					inputmode="numeric"
					value={wizard.phone}
					oninput={(e) => {
						wizard.phone = onlyDigits(e.currentTarget.value, RULES.phoneMax);
						e.currentTarget.value = wizard.phone;
					}}
					placeholder="812 3456 7890"
					autocomplete="tel-national"
					class="lms-focus-ring h-10.25 min-w-0 flex-1 bg-transparent px-3.5 text-[0.9375rem] outline-none"
				/>
			</span>
		</Field>
		<div class="col-span-full flex flex-col gap-2">
			<label for="{uid}-pw" class="text-[0.8125rem] font-semibold">{t('account.password')}</label>
			<span class="relative block">
				<input
					id="{uid}-pw"
					type={wizard.showPassword ? 'text' : 'password'}
					bind:value={wizard.password}
					placeholder={t('account.password_ph')}
					autocomplete="new-password"
					class="input lms-input lms-focus-ring h-11 pe-11 text-[0.9375rem]"
					aria-invalid={Boolean(show('password', wizard.password))}
				/>
				<button
					type="button"
					class="text-lms-muted lms-focus-ring absolute top-1.25 right-1.25 flex size-8.5 items-center justify-center"
					aria-label={t('account.show_password')}
					aria-pressed={wizard.showPassword}
					onclick={() => (wizard.showPassword = !wizard.showPassword)}
				>
					<Icon icon={wizard.showPassword ? EyeOff : Eye} size="sm" />
				</button>
			</span>
			<span class="grid grid-cols-4 gap-1" aria-hidden="true">
				{#each [1, 2, 3, 4] as i (i)}
					<span
						class={[
							'h-1.25 rounded-full transition-colors',
							i <= score ? SCORE_CLASSES[score] : 'bg-lms-border'
						]}
					></span>
				{/each}
			</span>
			<span class="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
				<span class="font-bold"
					>{wizard.password ? t(`account.strength_${score}`) : t('account.strength')}</span
				>
				{#each rules as rule (rule.key)}
					<span
						class={[
							'flex items-center gap-1.25',
							rule.ok ? 'text-lms-success-text' : 'text-lms-muted'
						]}
					>
						<Icon icon={rule.ok ? Check : Dot} size="sm" />{t(`account.${rule.key}`)}
					</span>
				{/each}
			</span>
			{#if show('password', wizard.password) && tried}
				<span class="text-lms-danger-text text-xs" role="alert">{t('errors.password_weak')}</span>
			{/if}
		</div>
	</div>
	<label class="flex cursor-pointer items-start gap-3 text-sm leading-5.25">
		<input
			type="checkbox"
			bind:checked={wizard.agree}
			class={[
				'accent-lms-interactive mt-0.5 size-5 flex-none',
				tried && !wizard.agree && 'outline-lms-danger-text outline-2'
			]}
		/>
		<span>{t('account.agree')}</span>
	</label>
</section>
