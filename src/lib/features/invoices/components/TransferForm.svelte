<script lang="ts" module>
	import type { InvoiceTransferInput } from '$lib/api/generated/lms';

	export type TransferPayload = InvoiceTransferInput;
</script>

<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import FileUp from '@lucide/svelte/icons/file-up';
	import {
		PROOF_MAX_BYTES,
		PROOF_TYPES,
		rupiah,
		todayJakarta,
		type BankAccount
	} from '../invoices.model';

	/**
	 * Isian transfer manual: tenant mengirim bukti atau staf keuangan mencatat transfer yang sudah masuk
	 * rekening. Nominal boleh sebagian (≤ sisa tagihan); staf (`strict`) wajib mengisi pengirim & referensi
	 * (aturan 04f Pembayaran). Staf boleh tanpa bukti bila menyatakan sudah dicek di mutasi rekening.
	 */
	interface Props {
		/** Sisa tagihan (total − pembayaran berhasil). */
		remaining: number;
		banks: BankAccount[];
		proofRequired: boolean;
		strict?: boolean;
		tried: boolean;
		/** Isian valid → payload; belum valid → null. */
		onchange: (value: TransferPayload | null) => void;
	}

	let { remaining, banks, proofRequired, strict = false, tried, onchange }: Props = $props();
	const MIN_SENDER = 3;
	const MIN_REFERENCE = 4;
	const i18n = useI18n();
	const uid = $props.id();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`invoices.transfer.${key}`, params);

	let paidDate = $state(todayJakarta());
	// svelte-ignore state_referenced_locally
	let amount = $state(String(remaining));
	// svelte-ignore state_referenced_locally
	let bankId = $state(banks.find((b) => b.is_default)?.id ?? banks[0]?.id ?? '');
	let sender = $state('');
	let reference = $state('');
	let proof = $state<{ name: string; type: string; data: string } | null>(null);
	let mutationChecked = $state(false);
	let fileError = $state<string | null>(null);

	const proofMissing = $derived(proofRequired && !proof && !(strict && mutationChecked));
	const amountValue = $derived(Number(amount.replace(/\D/g, '')) || 0);
	const amountInvalid = $derived(amountValue <= 0 || amountValue > remaining);
	const senderMissing = $derived(strict && sender.trim().length < MIN_SENDER);
	const referenceMissing = $derived(strict && reference.trim().length < MIN_REFERENCE);
	const valid = $derived(
		!!paidDate &&
			paidDate <= todayJakarta() &&
			!!bankId &&
			!proofMissing &&
			!amountInvalid &&
			!senderMissing &&
			!referenceMissing
	);

	$effect(() => {
		onchange(
			valid
				? {
						channel: 'transfer',
						amount_idr: amountValue,
						paid_date: paidDate,
						bank_account_id: bankId,
						sender_name: sender.trim(),
						reference: reference.trim(),
						proof: proof
							? {
									file_name: proof.name,
									content_type: proof.type as 'image/png',
									data_base64: proof.data
								}
							: null,
						...(strict ? { mutation_checked: mutationChecked } : {})
					}
				: null
		);
	});

	async function pick(event: Event & { currentTarget: HTMLInputElement }) {
		fileError = null;
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file) return;
		if (!(PROOF_TYPES as readonly string[]).includes(file.type) || file.size > PROOF_MAX_BYTES) {
			fileError = t('file_invalid');
			return;
		}
		const buffer = new Uint8Array(await file.arrayBuffer());
		let binary = '';
		for (const byte of buffer) binary += String.fromCharCode(byte);
		proof = { name: file.name, type: file.type, data: btoa(binary) };
	}
</script>

<div class="flex flex-col gap-3.5">
	<div class="flex flex-col gap-1.5">
		<label class="text-[13px] font-semibold" for="{uid}-amount">{t('amount')}</label>
		<div
			class={[
				'bg-lms-surface flex overflow-hidden rounded-[10px] border-[1.5px]',
				tried && amountInvalid ? 'border-lms-danger-text' : 'border-lms-input-border'
			]}
		>
			<span
				class="bg-lms-surface-muted text-lms-muted flex items-center px-3 text-[13px] font-semibold"
				>Rp</span
			>
			<input
				id="{uid}-amount"
				inputmode="numeric"
				value={amountValue
					? amountValue.toLocaleString(i18n.locale === 'en' ? 'en-US' : 'id-ID')
					: ''}
				oninput={(e) => (amount = e.currentTarget.value)}
				class="lms-focus-ring h-10.5 min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold tabular-nums"
			/>
			<button
				type="button"
				class="border-lms-border text-lms-link lms-focus-ring border-l px-3 text-xs font-bold"
				onclick={() => (amount = String(remaining))}>{t('pay_full')}</button
			>
		</div>
		<span
			class={[
				'text-xs',
				tried && amountInvalid
					? 'text-lms-danger-text'
					: amountValue === remaining
						? 'text-lms-success-text'
						: 'text-lms-muted'
			]}
			>{tried && amountInvalid
				? t('amount_invalid', { remaining: rupiah(remaining, i18n.locale) })
				: amountValue === remaining
					? t('amount_full')
					: t('amount_partial', {
							left: rupiah(Math.max(0, remaining - amountValue), i18n.locale)
						})}</span
		>
	</div>
	<div class="grid gap-3.5 sm:grid-cols-2">
		<label class="flex flex-col gap-1.5" for="{uid}-date">
			<span class="text-[13px] font-semibold">{t('date')}</span>
			<input
				id="{uid}-date"
				type="date"
				max={todayJakarta()}
				bind:value={paidDate}
				class="input lms-input lms-focus-ring h-10.5 text-sm"
			/>
		</label>
		<label class="flex flex-col gap-1.5" for="{uid}-bank">
			<span class="text-[13px] font-semibold">{t('bank')}</span>
			<select
				id="{uid}-bank"
				bind:value={bankId}
				class={[
					'input lms-input lms-focus-ring h-10.5 text-sm',
					tried && !bankId && 'border-lms-danger-text!'
				]}
			>
				{#each banks as b (b.id)}<option value={b.id}>{b.bank_name} · {b.account_number}</option
					>{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1.5" for="{uid}-sender">
			<span class="text-[13px] font-semibold"
				>{t('sender')}
				{#if !strict}<span class="text-lms-muted font-normal">({t('optional')})</span>{/if}</span
			>
			<input
				id="{uid}-sender"
				bind:value={sender}
				maxlength={200}
				placeholder={t('sender_ph')}
				class={[
					'input lms-input lms-focus-ring h-10.5 text-sm',
					tried && senderMissing && 'border-lms-danger-text!'
				]}
			/>
			{#if tried && senderMissing}<span class="text-lms-danger-text text-xs"
					>{t('sender_required')}</span
				>{/if}
		</label>
		<label class="flex flex-col gap-1.5" for="{uid}-ref">
			<span class="text-[13px] font-semibold"
				>{t('reference')}
				{#if !strict}<span class="text-lms-muted font-normal">({t('optional')})</span>{/if}</span
			>
			<input
				id="{uid}-ref"
				bind:value={reference}
				maxlength={200}
				placeholder={t('reference_ph')}
				class={[
					'input lms-input lms-focus-ring h-10.5 font-mono text-sm',
					tried && referenceMissing && 'border-lms-danger-text!'
				]}
			/>
			{#if tried && referenceMissing}<span class="text-lms-danger-text text-xs"
					>{t('reference_required')}</span
				>{/if}
		</label>
	</div>
	{#if strict}
		<label class="flex items-start gap-2.5 text-[13px]">
			<input
				type="checkbox"
				class="lms-focus-ring mt-0.5 size-4 accent-current"
				bind:checked={mutationChecked}
			/>
			<span class="flex flex-col gap-0.5">
				<span class="font-semibold">{t('mutation_checked')}</span>
				<span class="text-lms-muted text-xs">{t('mutation_checked_hint')}</span>
			</span>
		</label>
	{/if}
	<div class="flex flex-col gap-1.5">
		<span class="text-[13px] font-semibold">
			{t('proof')}
			{#if !proofRequired || (strict && mutationChecked)}<span class="text-lms-muted font-normal"
					>({t('optional')})</span
				>{/if}
		</span>
		<label
			class={[
				'lms-focus-ring flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-dashed px-3.5 py-3',
				tried && proofMissing ? 'border-lms-danger-text' : 'border-lms-border-strong'
			]}
		>
			<span class="text-lms-interactive"><Icon icon={FileUp} /></span>
			<span class="flex min-w-0 flex-1 flex-col">
				<span class="truncate text-sm font-semibold">{proof?.name ?? t('pick')}</span>
				<span class="text-lms-muted text-xs">{t('file_hint')}</span>
			</span>
			<input type="file" accept={PROOF_TYPES.join(',')} class="sr-only" onchange={pick} />
		</label>
		{#if fileError || (tried && proofMissing)}<span
				class="text-lms-danger-text text-xs"
				role="alert">{fileError ?? t('proof_required')}</span
			>{/if}
	</div>
</div>
