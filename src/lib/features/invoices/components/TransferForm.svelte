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
	 * Isian transfer manual: tenant mengirim bukti (wajib berkas) atau staf keuangan mencatat transfer
	 * yang sudah masuk rekening (berkas opsional). Nominal = total invoice (tanpa pembayaran sebagian).
	 */
	interface Props {
		total: number;
		banks: BankAccount[];
		proofRequired: boolean;
		tried: boolean;
		/** Isian valid → payload; belum valid → null. */
		onchange: (value: TransferPayload | null) => void;
	}

	let { total, banks, proofRequired, tried, onchange }: Props = $props();
	const i18n = useI18n();
	const uid = $props.id();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`invoices.transfer.${key}`, params);

	let paidDate = $state(todayJakarta());
	// svelte-ignore state_referenced_locally
	let bankId = $state(banks.find((b) => b.is_default)?.id ?? banks[0]?.id ?? '');
	let sender = $state('');
	let reference = $state('');
	let proof = $state<{ name: string; type: string; data: string } | null>(null);
	let fileError = $state<string | null>(null);

	const proofMissing = $derived(proofRequired && !proof);
	const valid = $derived(!!paidDate && paidDate <= todayJakarta() && !!bankId && !proofMissing);

	$effect(() => {
		onchange(
			valid
				? {
						amount_idr: total,
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
							: null
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
	<div class="bg-lms-surface-muted flex items-baseline justify-between rounded-xl px-3.5 py-3">
		<span class="text-lms-muted text-[13px]">{t('amount')}</span>
		<span class="text-lg font-bold tabular-nums">{rupiah(total, i18n.locale)}</span>
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
				>{t('sender')} <span class="text-lms-muted font-normal">({t('optional')})</span></span
			>
			<input
				id="{uid}-sender"
				bind:value={sender}
				maxlength={200}
				placeholder={t('sender_ph')}
				class="input lms-input lms-focus-ring h-10.5 text-sm"
			/>
		</label>
		<label class="flex flex-col gap-1.5" for="{uid}-ref">
			<span class="text-[13px] font-semibold"
				>{t('reference')} <span class="text-lms-muted font-normal">({t('optional')})</span></span
			>
			<input
				id="{uid}-ref"
				bind:value={reference}
				maxlength={200}
				placeholder={t('reference_ph')}
				class="input lms-input lms-focus-ring h-10.5 text-sm"
			/>
		</label>
	</div>
	<div class="flex flex-col gap-1.5">
		<span class="text-[13px] font-semibold">
			{t('proof')}
			{#if !proofRequired}<span class="text-lms-muted font-normal">({t('optional')})</span>{/if}
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
