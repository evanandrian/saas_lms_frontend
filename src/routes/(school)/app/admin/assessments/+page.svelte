<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import ModuleShell from '$lib/features/school-admin/components/ModuleShell.svelte';
	import AssessmentsPanel from '$lib/features/school-admin/components/planning/AssessmentsPanel.svelte';
	import { PlanningDrawerState } from '$lib/features/school-admin/planning-drawer.state.svelte';
	import { createRecordEditor } from '$lib/features/school-admin/record-editor.svelte';
	import {
		PREFIX,
		PROGRESS_DEPENDENCY_KEY,
		sectionGap
	} from '$lib/features/school-admin/school-admin.model';
	import type { SchoolPlanningView } from '$lib/features/school-admin/school-admin.types';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`${PREFIX}.${key}`, params);

	// svelte-ignore state_referenced_locally
	let planning = $state<SchoolPlanningView | null>(data.planning);
	const editor = createRecordEditor<SchoolPlanningView>(i18n.t, (v) => (planning = v));

	// Dibuat sekali; data perencanaan mengalir lewat getter (alasan & draf tidak ter-reset).
	const planner = new PlanningDrawerState({
		planning: () => planning!,
		key: () => 'assess',
		t: i18n.t,
		onplanning: (v) => {
			planning = v;
			void invalidate(PROGRESS_DEPENDENCY_KEY);
		},
		onnotify: (m) => editor.notify(m)
	});

	const stats = $derived([
		{ label: t('assessments.stat_types'), value: planning?.assessments.length ?? 0 },
		{ label: t('assessments.stat_total'), value: `${planning?.weight_total ?? 0}%` },
		{
			label: t('assessments.stat_decimals'),
			value: t(`planning.decimals_${planning?.decimal_places ?? 0}`)
		}
	]);
	const gap = $derived(
		sectionGap(i18n.t, data.schoolProgress, 'assess', resolve(APP_PATHS.SCHOOL_ADMIN_SETUP))
	);
</script>

<svelte:head><title>{t('assessments.title')} · FLIXARE</title></svelte:head>

{#if !planning}
	<StatePanel
		tone="error"
		title={t('common.load_failed')}
		description={t(`failure.${data.failure}`)}
	/>
{:else}
	<ModuleShell
		eyebrow={t('assessments.eyebrow')}
		title={t('assessments.title')}
		description={t('assessments.desc')}
		{gap}
		{stats}
		help="help.school_admin_assessments"
	>
		<div class="flex flex-col gap-4">
			<AssessmentsPanel {planner} />
		</div>
	</ModuleShell>
	<Toast message={editor.toast} icon={editor.toastError ? CircleAlert : undefined} />
{/if}
