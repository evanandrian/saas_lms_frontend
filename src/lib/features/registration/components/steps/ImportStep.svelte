<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import Info from '@lucide/svelte/icons/info';
	import type { RegistrationWizard } from '../../registration.state.svelte';

	/** Impor guru/murid dari Excel: tampil sesuai referensi, modul impor menyusul (keputusan pemilik 7 Okt 2026). */
	interface Props {
		wizard: RegistrationWizard;
		kind: 'guru' | 'murid';
	}

	let { wizard, kind }: Props = $props();
	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`register.${key}`, params);
</script>

<section class="lms-card flex flex-col gap-4.5 rounded-[14px]! p-6 shadow-none!">
	<div
		class="border-lms-input-border bg-lms-background flex cursor-not-allowed flex-col items-center gap-2.5 rounded-[14px] border-2 border-dashed px-5 py-8 text-center opacity-70"
		aria-disabled="true"
	>
		<span
			class="bg-lms-interactive-subtle text-lms-interactive-subtle-text flex size-13 items-center justify-center rounded-[14px]"
			><Icon icon={FileSpreadsheet} /></span
		>
		<span class="text-[0.9375rem] font-bold">{t('import.pick')}</span>
		<span class="text-lms-muted text-xs">{t(`import.cols_${kind}`)}</span>
	</div>
	<p class="lms-tone-info flex gap-2 rounded-xl px-3.5 py-3 text-[0.8125rem] leading-5">
		<span class="mt-0.5"><Icon icon={Info} size="sm" /></span>{t('import.later', {
			noun: t(`import.noun_${kind}`),
			count: wizard.rombel,
			unit: t(wizard.type === 'school' ? 'classes.unit_rombel' : 'classes.unit_group')
		})}
	</p>
</section>
