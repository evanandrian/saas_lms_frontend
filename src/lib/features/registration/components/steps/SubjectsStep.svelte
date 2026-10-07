<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import Plus from '@lucide/svelte/icons/plus';
	import { RULES, onlyDigits } from '../../registration.model';
	import type { RegistrationWizard } from '../../registration.state.svelte';

	interface Props {
		wizard: RegistrationWizard;
	}

	let { wizard }: Props = $props();
	const i18n = useI18n();
	const uid = $props.id();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`register.${key}`, params);
	const MIN_NAME = 2;
	const bad = $derived(new Set(wizard.badKktp.map((s) => s.name)));

	function toggle(name: string) {
		wizard.setup.subjects = wizard.setup.subjects.map((s) =>
			s.name === name ? { ...s, enabled: !s.enabled } : s
		);
	}

	function setKktp(name: string, value: string) {
		wizard.setup.subjects = wizard.setup.subjects.map((s) =>
			s.name === name ? { ...s, kktp: onlyDigits(value, 3) } : s
		);
	}

	function applyAll() {
		const v = onlyDigits(wizard.setup.kktpAll, 3);
		wizard.setup.subjects = wizard.setup.subjects.map((s) => (s.enabled ? { ...s, kktp: v } : s));
	}

	function add() {
		const name = wizard.setup.newSubject.trim();
		if (
			name.length < MIN_NAME ||
			wizard.setup.subjects.some((s) => s.name.toLowerCase() === name.toLowerCase())
		)
			return;
		wizard.setup.subjects = [
			...wizard.setup.subjects,
			{
				name,
				enabled: true,
				kktp: wizard.setup.kktpAll || String(wizard.catalog.default_kktp),
				custom: true
			}
		];
		wizard.setup.newSubject = '';
	}
</script>

<section class="lms-card flex flex-col gap-4 rounded-[14px]! p-6 shadow-none!">
	<div class="bg-lms-background flex flex-wrap items-end gap-3 rounded-xl p-3.5">
		<label class="flex flex-col gap-1.5" for="{uid}-all">
			<span class="text-[0.8125rem] font-semibold">{t('subjects.kktp_all')}</span>
			<input
				id="{uid}-all"
				inputmode="numeric"
				bind:value={wizard.setup.kktpAll}
				class="input lms-input lms-focus-ring h-10 w-22.5 text-[0.9375rem]"
			/>
		</label>
		<button
			type="button"
			class="btn border-lms-input-border bg-lms-surface lms-focus-ring h-10 rounded-[10px] border px-3.5 text-[0.8125rem] font-semibold"
			onclick={applyAll}
		>
			{t('subjects.apply', { n: wizard.enabledSubjects.length })}
		</button>
		<span class="text-lms-muted ms-auto pb-2.5 text-[0.8125rem]"
			>{t('subjects.active_of', {
				on: wizard.enabledSubjects.length,
				total: wizard.setup.subjects.length
			})}</span
		>
	</div>
	<ul class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18.75rem),1fr))] gap-x-6">
		{#each wizard.setup.subjects as s (s.name)}
			<li
				class={[
					'border-lms-border flex items-center gap-3 border-t py-2.5 transition-opacity',
					!s.enabled && 'opacity-50'
				]}
			>
				<button
					type="button"
					role="switch"
					aria-checked={s.enabled}
					aria-label={s.name}
					class={[
						'lms-focus-ring relative h-5.5 w-9.5 flex-none rounded-full transition-colors',
						s.enabled ? 'bg-lms-interactive' : 'bg-lms-input-border'
					]}
					onclick={() => toggle(s.name)}
				>
					<span
						class={[
							'absolute top-0.75 left-0.75 size-4 rounded-full bg-white shadow transition-transform',
							s.enabled && 'translate-x-4'
						]}
					></span>
				</button>
				<span class="flex-1 text-sm font-semibold">{s.name}</span>
				<span class="text-lms-muted text-[11px]">KKTP</span>
				<input
					inputmode="numeric"
					value={s.kktp}
					disabled={!s.enabled}
					aria-label={t('subjects.kktp_for', { name: s.name })}
					oninput={(e) => setKktp(s.name, e.currentTarget.value)}
					maxlength={3}
					class={[
						'input lms-input lms-focus-ring h-8.5 w-14.5 text-center text-sm font-semibold',
						bad.has(s.name) && 'border-lms-danger-text!'
					]}
				/>
			</li>
		{/each}
	</ul>
	<div class="border-lms-border flex gap-2 border-t pt-3">
		<label class="min-w-0 flex-1" for="{uid}-new">
			<span class="sr-only">{t('subjects.add_ph')}</span>
			<input
				id="{uid}-new"
				bind:value={wizard.setup.newSubject}
				onkeydown={(e) => e.key === 'Enter' && add()}
				placeholder={t('subjects.add_ph')}
				class="input lms-input lms-focus-ring h-10 text-sm"
			/>
		</label>
		<button
			type="button"
			class="lms-action-deep lms-focus-ring flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 text-[0.8125rem] font-semibold"
			onclick={add}
		>
			<Icon icon={Plus} size="sm" />{t('subjects.add')}
		</button>
	</div>
	<span class="text-lms-muted text-xs">{t('subjects.kktp_range', { max: RULES.kktpMax })}</span>
</section>
