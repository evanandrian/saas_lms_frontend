<!-- Ekstrakurikuler & pembina; hanya dipakai wizard (PlanningDrawer); halaman Ekskul memakai kartu sendiri. -->
<script lang="ts">
	import type { SchoolPlanningView } from '$lib/api/generated/lms';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { onMount } from 'svelte';
	import type { PlanningDrawerState } from '../../planning-drawer.state.svelte';
	import {
		EXTRA_NAME_MAX,
		PREFIX,
		extraDeleteMessage,
		inputMaxLength
	} from '../../school-admin.model';

	interface Props {
		planner: PlanningDrawerState;
		planning: SchoolPlanningView;
	}
	let { planner, planning }: Props = $props();
	// Bagian dibuka (ulang): error nama dari kunjungan sebelumnya tidak boleh tetap tampil.
	onMount(() => planner.resetExtraError());
	const uid = $props.id();
	const nameErrorId = `${uid}-extra-name-error`;

	const i18n = useI18n();
	const t = (k: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.planning.${k}`, params);

	/** Ekskul yang menunggu konfirmasi hapus (anggota = tahun ajaran aktif). */
	let pendingDelete = $state<{ id: string; name: string; members: number } | null>(null);
</script>

<div class="border-lms-border flex flex-col rounded-xl border">
	{#each planning.extras as x (x.id)}
		<div class="border-lms-border flex items-center gap-3 border-t px-4 py-2.5 first:border-t-0">
			<span class="flex flex-1 flex-col"
				><span class="text-sm font-semibold">{x.name}</span><span class="text-lms-muted text-xs"
					>{t('coach', { name: x.coach_name || '—' })}</span
				></span
			>
			<button
				type="button"
				aria-label={t('delete')}
				class="lms-action-ghost lms-focus-ring flex size-7 items-center justify-center rounded-md"
				disabled={planner.busy}
				onclick={() => (pendingDelete = { id: x.id, name: x.name, members: x.member_count ?? 0 })}
				><Icon icon={Trash2} size="sm" /></button
			>
		</div>
	{:else}<p class="text-lms-muted p-4 text-sm">{t('extras_empty')}</p>{/each}
</div>
<div class="flex flex-wrap gap-2">
	<input
		class="lms-input lms-focus-ring border-[1.5px] h-10 flex-[1_1_200px] rounded-[10px] px-3 text-sm {planner.exNameError
			? 'border-lms-danger-text'
			: 'border-lms-input-border'}"
		aria-label={t('extra_ph')}
		placeholder={t('extra_ph')}
		maxlength={inputMaxLength(EXTRA_NAME_MAX)}
		aria-invalid={planner.exNameError ? 'true' : undefined}
		aria-describedby={planner.exNameError ? nameErrorId : undefined}
		bind:value={planner.exName}
		oninput={() => (planner.exNameError = '')}
	/>
	<select
		aria-label={t('coach_label')}
		class="lms-input lms-focus-ring border-[1.5px] border-lms-input-border h-10 rounded-[10px] px-2 text-sm"
		bind:value={planner.exCoach}
	>
		<option value="">{t('coach_none')}</option>
		{#each planner.teacherOptions as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
	</select>
	<button
		type="button"
		class="lms-action-primary lms-focus-ring h-10 rounded-[10px] px-4 text-sm font-semibold disabled:opacity-50"
		disabled={planner.busy}
		onclick={() => planner.addExtra()}>{t('extra_add')}</button
	>
	{#if planner.exNameError}
		<span id={nameErrorId} class="text-lms-danger-text w-full text-xs leading-[17px]" role="alert"
			>{planner.exNameError}</span
		>
	{/if}
</div>
<ConfirmDialog
	bind:open={
		() => pendingDelete !== null,
		(v) => {
			if (!v) pendingDelete = null;
		}
	}
	tone="danger"
	icon={Trash2}
	title={t('extra_delete_title', { name: pendingDelete?.name ?? '' })}
	message={extraDeleteMessage(i18n.t, pendingDelete?.members)}
	confirmLabel={i18n.t(`${PREFIX}.common.delete`)}
	busyLabel={i18n.t(`${PREFIX}.common.deleting`)}
	cancelLabel={i18n.t(`${PREFIX}.common.cancel`)}
	onconfirm={async () => {
		if (pendingDelete) await planner.removeExtra(pendingDelete.id);
		pendingDelete = null;
	}}
/>
