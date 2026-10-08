<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import { runPageAction } from '$lib/utils/page-action';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { BillingSettings } from '../invoices.model';
	import InvoiceModal from './InvoiceModal.svelte';

	/** Pengaturan penerbit invoice (kop, NPWP, penandatangan) & rekening tujuan transfer. */
	interface Props {
		open: boolean;
		settings: BillingSettings;
		onclose: () => void;
		onsaved: (settings: BillingSettings) => void;
	}

	let { open, settings, onclose, onsaved }: Props = $props();
	const i18n = useI18n();
	const uid = $props.id();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`invoices.settings.${key}`, params);

	const clone = (s: BillingSettings) => ({
		issuer: { ...s.issuer },
		default_terms_days: s.default_terms_days,
		default_va_channel: s.default_va_channel,
		default_note: s.default_note,
		bank_accounts: s.bank_accounts.map((b) => ({ ...b }))
	});
	// svelte-ignore state_referenced_locally
	let form = $state(clone(settings));
	let busy = $state(false);
	let failure = $state<string | null>(null);

	$effect(() => {
		if (open) {
			form = clone(settings);
			failure = null;
		}
	});

	const ISSUER_FIELDS = [
		['company_name', 'company'],
		['address', 'address'],
		['npwp', 'npwp'],
		['email', 'email'],
		['phone', 'phone'],
		['city', 'city'],
		['signer_name', 'signer'],
		['signer_title', 'signer_title']
	] as const;

	function addBank() {
		form.bank_accounts = [
			...form.bank_accounts,
			{
				id: '',
				bank_name: '',
				account_number: '',
				account_name: form.issuer.company_name,
				is_default: !form.bank_accounts.length
			}
		];
	}

	function setDefault(i: number) {
		form.bank_accounts = form.bank_accounts.map((b, j) => ({ ...b, is_default: i === j }));
	}

	function removeBank(i: number) {
		const wasDefault = form.bank_accounts[i]?.is_default;
		form.bank_accounts = form.bank_accounts.filter((_, j) => j !== i);
		if (wasDefault && form.bank_accounts[0]) form.bank_accounts[0].is_default = true;
	}

	async function save() {
		busy = true;
		failure = null;
		const result = await runPageAction<BillingSettings>('settings', form);
		busy = false;
		if (result.ok) {
			onsaved(result.data);
			onclose();
		} else {
			failure = result.code === 'validation_failed' ? t('invalid') : t('failed');
		}
	}
</script>

<InvoiceModal {open} title={t('title')} closeLabel={t('close')} wide {onclose}>
	<div class="flex flex-col gap-5">
		{#if settings.issuer.is_sample}
			<p class="lms-tone-warning rounded-xl px-3.5 py-3 text-[13px] leading-5">
				{t('sample_note')}
			</p>
		{/if}
		<section class="flex flex-col gap-3">
			<h3 class="text-sm font-bold">{t('issuer')}</h3>
			<div class="grid gap-3 sm:grid-cols-2">
				{#each ISSUER_FIELDS as [key, label] (key)}
					<label
						class={['flex flex-col gap-1.5', key === 'address' && 'sm:col-span-2']}
						for="{uid}-{key}"
					>
						<span class="text-[13px] font-semibold">{t(label)}</span>
						<input
							id="{uid}-{key}"
							bind:value={form.issuer[key]}
							class="input lms-input lms-focus-ring h-10 text-sm"
						/>
					</label>
				{/each}
			</div>
		</section>
		<section class="flex flex-col gap-3">
			<h3 class="text-sm font-bold">{t('defaults')}</h3>
			<div class="grid gap-3 sm:grid-cols-2">
				<label class="flex flex-col gap-1.5" for="{uid}-terms">
					<span class="text-[13px] font-semibold">{t('terms')}</span>
					<select
						id="{uid}-terms"
						bind:value={form.default_terms_days}
						class="input lms-input lms-focus-ring h-10 text-sm"
					>
						{#each settings.terms_options as d (d)}<option value={d}
								>{i18n.t('invoices.editor.terms_days', { n: d })}</option
							>{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1.5" for="{uid}-va">
					<span class="text-[13px] font-semibold">{t('va_bank')}</span>
					<select
						id="{uid}-va"
						bind:value={form.default_va_channel}
						class="input lms-input lms-focus-ring h-10 text-sm"
					>
						{#each settings.va_channels as c (c)}<option value={c}
								>{c.replace('va_', '').toUpperCase()}</option
							>{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1.5 sm:col-span-2" for="{uid}-note">
					<span class="text-[13px] font-semibold">{t('default_note')}</span>
					<textarea
						id="{uid}-note"
						bind:value={form.default_note}
						rows="2"
						maxlength={500}
						class="input lms-input lms-focus-ring py-2 text-sm"></textarea>
				</label>
			</div>
		</section>
		<section class="flex flex-col gap-3">
			<h3 class="text-sm font-bold">{t('banks')}</h3>
			{#each form.bank_accounts as bank, i (i)}
				<div
					class="border-lms-border grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_1.2fr_1.6fr_auto]"
				>
					<input
						bind:value={bank.bank_name}
						placeholder={t('bank_name')}
						aria-label={t('bank_name')}
						class="input lms-input lms-focus-ring h-9.5 text-sm"
					/>
					<input
						bind:value={bank.account_number}
						placeholder={t('account_number')}
						aria-label={t('account_number')}
						class="input lms-input lms-focus-ring h-9.5 font-mono text-sm"
					/>
					<input
						bind:value={bank.account_name}
						placeholder={t('account_name')}
						aria-label={t('account_name')}
						class="input lms-input lms-focus-ring h-9.5 text-sm"
					/>
					<span class="flex items-center gap-2">
						<label class="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap">
							<input
								type="radio"
								name="{uid}-default"
								checked={bank.is_default}
								onchange={() => setDefault(i)}
								class="accent-lms-interactive"
							/>{t('default')}
						</label>
						<button
							type="button"
							class="lms-focus-ring text-lms-muted flex size-8 items-center justify-center rounded-lg"
							aria-label={t('remove_bank')}
							onclick={() => removeBank(i)}><Icon icon={Trash2} size="sm" /></button
						>
					</span>
				</div>
			{/each}
			<button
				type="button"
				class="text-lms-interactive lms-focus-ring flex h-9 items-center gap-1.5 self-start rounded-lg border border-dashed px-3 text-[13px] font-semibold"
				onclick={addBank}
			>
				<Icon icon={Plus} size="sm" />{t('add_bank')}
			</button>
		</section>
		{#if failure}<p class="text-lms-danger-text text-[13px]" role="alert">{failure}</p>{/if}
	</div>
	{#snippet footer()}
		<button
			type="button"
			class="lms-focus-ring border-lms-border-strong h-10 rounded-[10px] border px-4 text-sm font-semibold"
			onclick={onclose}>{t('cancel')}</button
		>
		<button
			type="button"
			disabled={busy}
			class="bg-lms-interactive text-lms-on-interactive lms-focus-ring h-10 rounded-[10px] px-4 text-sm font-bold disabled:opacity-60"
			onclick={save}>{busy ? t('saving') : t('save')}</button
		>
	{/snippet}
</InvoiceModal>
