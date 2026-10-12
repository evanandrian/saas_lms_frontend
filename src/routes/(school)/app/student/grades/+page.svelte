<script lang="ts">
	import HeroBanner from '$lib/components/ui/HeroBanner.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import LearnerReports from '$lib/features/learner-reports/components/LearnerReports.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = useI18n();
</script>

<svelte:head><title>{i18n.t('learner_reports.title_student')} · FLIXARE</title></svelte:head>

{#if data.view}
	<LearnerReports view={data.view} pdfPath={APP_PATHS.STUDENT_REPORT_PDF} />
{:else}
	<div class="flex flex-col gap-4 pb-24">
		<HeroBanner
			title={i18n.t('learner_reports.title_student')}
			description={i18n.t('learner_reports.desc_student')}
			help="help.learner_reports_student"
		/>
		<StatePanel
			headingLevel={2}
			tone="error"
			title={i18n.t('learner_reports.load_failed')}
			description={i18n.t(`learner_reports.failure.${data.failure}`)}
		/>
	</div>
{/if}
