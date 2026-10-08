<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import Download from '@lucide/svelte/icons/download';
	import FileText from '@lucide/svelte/icons/file-text';
	import Printer from '@lucide/svelte/icons/printer';
	import X from '@lucide/svelte/icons/x';
	import InvoicePaper, { type PaperData } from './InvoicePaper.svelte';

	/**
	 * Pratinjau A4 + cetak (referensi overlay #inv-overlay). "Simpan PDF" membuka dialog cetak browser
	 * (pilih "Simpan sebagai PDF"); nama berkas = nomor invoice lewat judul dokumen sementara.
	 */
	interface Props {
		open: boolean;
		data: PaperData;
		onclose: () => void;
	}

	let { open, data, onclose }: Props = $props();
	const i18n = useI18n();
	const t = (key: string) => i18n.t(`invoices.print.${key}`);
	const PRINT_TITLE_RESTORE_MS = 1500;

	function print() {
		const previous = document.title;
		document.title = (data.number ?? t('draft_file')).replaceAll('/', '-');
		window.print();
		setTimeout(() => (document.title = previous), PRINT_TITLE_RESTORE_MS);
	}

	function onkeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') onclose();
	}
</script>

<svelte:window {onkeydown} />

{#if open}
	<div
		id="inv-overlay"
		class="fixed inset-0 z-[95] flex flex-col items-center overflow-auto bg-[rgba(10,16,41,0.72)] px-4 pb-10"
		role="dialog"
		aria-modal="true"
		aria-label={t('label')}
	>
		<div class="sticky top-0 z-[2] flex w-full max-w-[794px] flex-wrap items-center gap-2.5 py-3.5">
			<span class="flex flex-[1_1_200px] items-center gap-2 text-sm font-semibold text-white">
				<Icon icon={FileText} size="sm" />{data.number ?? t('draft_file')} · A4
			</span>
			<button
				type="button"
				class="lms-focus-ring flex h-10 items-center gap-1.5 rounded-[10px] border border-white/30 px-3.5 text-[13px] font-semibold text-white"
				onclick={onclose}
			>
				<Icon icon={X} size="sm" />{t('close')}
			</button>
			<button
				type="button"
				class="lms-focus-ring flex h-10 items-center gap-1.5 rounded-[10px] border border-white/30 px-3.5 text-[13px] font-semibold text-white"
				onclick={print}
			>
				<Icon icon={Download} size="sm" />{t('save_pdf')}
			</button>
			<button
				type="button"
				class="lms-focus-ring flex h-10 items-center gap-1.5 rounded-[10px] bg-white px-4 text-[13px] font-bold text-[#172554]"
				onclick={print}
			>
				<Icon icon={Printer} size="sm" />{t('print')}
			</button>
		</div>
		<InvoicePaper {data} />
	</div>
{/if}

<style>
	@media print {
		:global(body *) {
			visibility: hidden !important;
		}
		:global(#inv-paper),
		:global(#inv-paper *) {
			visibility: visible !important;
		}
		:global(#inv-overlay) {
			position: static !important;
			overflow: visible !important;
			background: none !important;
			padding: 0 !important;
		}
		:global(#inv-paper) {
			position: absolute !important;
			left: 0;
			top: 0;
		}
		@page {
			size: A4;
			margin: 12mm;
		}
	}
</style>
