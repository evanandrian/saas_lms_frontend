<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import { RULES, onlyDigits } from '../../registration.model';
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
	const s = $derived(wizard.setup);
	const errors = $derived(wizard.errors);
	const err = (key: string, value: string) => {
		const code = tried || value.length > 0 ? errors[key] : undefined;
		return code ? t(`errors.${code}`) : undefined;
	};
	const app = $derived(wizard.server?.application ?? null);
	const zone = $derived(
		wizard.catalog.timezones.find((z) => z.code === wizard.timezone)?.label ?? ''
	);
	const cityName = $derived(wizard.cities.find((c) => c.code === wizard.city)?.name ?? '—');
	const initials = $derived(
		(
			wizard.institutionName
				.trim()
				.split(/\s+/)
				.filter((w) => /^[A-Za-z]/.test(w))
				.slice(0, 2)
				.map((w) => w[0])
				.join('') || 'F'
		).toUpperCase()
	);
	const meta = $derived(
		wizard.type === 'school'
			? t('profile.meta_school', {
					npsn: app?.npsn || '—',
					level: wizard.level,
					ownership: t(`institution.${wizard.ownership}`),
					city: cityName
				})
			: wizard.type === 'personal'
				? t('profile.meta_personal', { city: cityName })
				: t('profile.meta_event', { kind: wizard.organizerKind, city: cityName })
	);
</script>

<section class="lms-card flex flex-col gap-5 rounded-[14px]! p-6 shadow-none!">
	<div class="bg-lms-background flex items-center gap-3.5 rounded-xl p-3.5">
		<span
			class="bg-lms-surface border-lms-border text-lms-interactive flex size-13 flex-none items-center justify-center rounded-xl border text-base font-bold"
			>{initials}</span
		>
		<span class="flex min-w-0 flex-col gap-0.5">
			<span class="text-base font-bold">{wizard.institutionName}</span>
			<span class="text-lms-muted text-xs">{meta} · {zone}</span>
		</span>
		<span class="lms-tone-success ms-auto rounded-full px-2.5 py-1 text-[11px] font-bold"
			>{t('profile.active')}</span
		>
	</div>
	<div
		class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] items-start gap-x-4.5 gap-y-4"
	>
		{#if wizard.type === 'school'}
			<Field
				label={t('profile.principal')}
				for="{uid}-kepsek"
				error={err('principalName', s.principalName)}
			>
				<input
					id="{uid}-kepsek"
					bind:value={wizard.setup.principalName}
					placeholder={t('profile.principal_ph')}
					class="input lms-input lms-focus-ring h-11 text-[0.9375rem]"
				/>
			</Field>
			<Field
				label={t('profile.nip')}
				optional={t('optional')}
				for="{uid}-nip"
				error={err('principalNip', s.principalNip)}
				hint={t('profile.nip_hint')}
			>
				<input
					id="{uid}-nip"
					inputmode="numeric"
					value={s.principalNip}
					oninput={(e) => {
						wizard.setup.principalNip = onlyDigits(e.currentTarget.value, RULES.nipDigits);
						e.currentTarget.value = wizard.setup.principalNip;
					}}
					placeholder={t('profile.nip_ph')}
					class="input lms-input lms-focus-ring h-11 font-mono text-[0.9375rem]"
				/>
			</Field>
			<div class="col-span-full pt-1 pb-2">
				<label class="flex items-start gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={wizard.setup.isPrincipal}
						onchange={() => {
							if (wizard.setup.isPrincipal) {
								wizard.setup.principalName = wizard.fullName;
							} else if (wizard.setup.principalName === wizard.fullName) {
								wizard.setup.principalName = '';
							}
						}}
						class="accent-lms-interactive mt-0.5 size-5 flex-none"
					/>
					<span class="text-[0.9375rem] leading-6">Saya juga menjabat sebagai Kepala Sekolah pada lembaga ini</span>
				</label>
			</div>
		{/if}
		{#if wizard.type === 'personal'}
			<div class="col-span-full flex flex-col gap-1.5">
				<label for="{uid}-bio" class="text-[0.8125rem] font-semibold"
					>{t('profile.about')}
					<span class="text-lms-muted font-normal">({t('optional')})</span></label
				>
				<textarea
					id="{uid}-bio"
					bind:value={wizard.setup.about}
					rows="3"
					maxlength={RULES.bioMax}
					placeholder={t('profile.about_ph')}
					class="input lms-input lms-focus-ring resize-y py-2.5 text-[0.9375rem] leading-5.5"
				></textarea>
				<span class="text-lms-muted text-right text-xs">{s.about.length}/{RULES.bioMax}</span>
			</div>
		{/if}
		{#if wizard.type === 'event'}
			<Field
				label={t('profile.coordinator')}
				for="{uid}-pj"
				error={err('coordinator', s.coordinator)}
			>
				<input
					id="{uid}-pj"
					bind:value={wizard.setup.coordinator}
					placeholder={t('profile.coordinator_ph')}
					class="input lms-input lms-focus-ring h-11 text-[0.9375rem]"
				/>
			</Field>
		{/if}
		<Field
			label={wizard.type === 'school' ? t('profile.phone_school') : t('profile.phone_other')}
			for="{uid}-telp"
			error={err('telp', s.phone)}
		>
			<input
				id="{uid}-telp"
				inputmode="tel"
				value={s.phone}
				oninput={(e) => {
					wizard.setup.phone = onlyDigits(e.currentTarget.value, RULES.phoneMax);
					e.currentTarget.value = wizard.setup.phone;
				}}
				placeholder={t('profile.phone_ph')}
				class="input lms-input lms-focus-ring h-11 text-[0.9375rem]"
			/>
		</Field>
		<Field label={t('profile.website')} optional={t('optional')} for="{uid}-web">
			<input
				id="{uid}-web"
				bind:value={wizard.setup.website}
				placeholder="https://"
				class="input lms-input lms-focus-ring h-11 text-[0.9375rem]"
			/>
		</Field>
	</div>
</section>
