<script lang="ts">
	import PageContainer from '$lib/components/layout/PageContainer.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ChoiceGroup from '$lib/components/ui/ChoiceGroup.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Stepper from '$lib/components/ui/Stepper.svelte';
	import { useI18n } from '$lib/i18n';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const pageId = $props.id();
	const reasonId = `${pageId}-reason`;
	const seatsId = `${pageId}-seats`;
	const stateLabels = $derived({
		done: i18n.t('common.steps.done'),
		current: i18n.t('common.steps.current'),
		upcoming: i18n.t('common.steps.upcoming')
	});
</script>

{#if data.plan}
	{@const p = data.plan}
	<PageContainer heading={p.title}>
		<p class="text-lms-muted max-w-prose">{p.description}</p>
		<Stepper label={i18n.t('onboarding.steps_label')} steps={p.steps} {stateLabels} />
		<p id={reasonId} class="sr-only">{i18n.t('common.state.action_unavailable')}</p>

		<div class="grid gap-6 xl:grid-cols-3">
			<div class="space-y-6 xl:col-span-2">
				<ChoiceGroup
					legend={i18n.t('onboarding.plan.plan_legend')}
					name="plan"
					layout="grid"
					options={p.plans}
					value={p.selectedPlan}
				/>
				<Card
					title={i18n.t('onboarding.plan.seats_label')}
					description={i18n.t('onboarding.plan.seats_hint')}
				>
					<!-- Perubahan kursi memicu perhitungan ulang di backend; kontrol nonaktif sampai API tersedia (D6). -->
					<div class="space-y-2">
						<div class="flex items-center justify-between gap-4">
							<label for={seatsId} class="sr-only">{i18n.t('onboarding.plan.seats_label')}</label>
							<input
								id={seatsId}
								type="range"
								class="accent-lms-interactive w-full"
								min={p.seats.min}
								max={p.seats.max}
								value={p.seats.value}
								disabled
								aria-describedby={reasonId}
							/>
							<output for={seatsId} class="text-lms-h3 shrink-0">{p.seats.display}</output>
						</div>
						<p class="lms-text-caption flex justify-between" aria-hidden="true">
							<span>{p.seats.minDisplay}</span><span>{p.seats.maxDisplay}</span>
						</p>
					</div>
				</Card>
				<ChoiceGroup
					legend={i18n.t('onboarding.plan.payment_legend')}
					name="payment_method"
					options={p.paymentMethods}
					value={p.selectedPayment}
				/>
			</div>

			<div class="xl:self-start">
				<Card tone="hero" title={i18n.t('onboarding.plan.summary_title')}>
					<div class="space-y-5">
						<dl class="space-y-2">
							{#each p.summary.rows as row (row.label)}
								<div class="flex justify-between gap-3">
									<dt class="text-lms-on-hero-muted">{row.label}</dt>
									<dd class="font-semibold">{row.value}</dd>
								</div>
							{/each}
						</dl>
						<div class="border-t border-(--color-lms-hero-raised) pt-4">
							<p class="text-lms-body-sm text-lms-on-hero-muted">{p.summary.totalLabel}</p>
							<p class="text-lms-h2">{p.summary.total}</p>
						</div>
						<div class="lms-hero-raised space-y-1 p-4">
							<p class="font-semibold">{p.summary.trialTitle}</p>
							<p class="text-lms-body-sm text-lms-on-hero-muted">{p.summary.trialBody}</p>
						</div>
						<Button disabled aria-describedby={reasonId}>{i18n.t('onboarding.plan.submit')}</Button>
						<p class="text-lms-body-sm text-lms-on-hero-muted">{p.summary.note}</p>
					</div>
				</Card>
			</div>
		</div>
	</PageContainer>
{:else}
	<div class="lms-container py-8">
		<StatePanel
			headingLevel={1}
			title={i18n.t('common.state.no_data_title')}
			description={i18n.t('common.state.no_data_description')}
		/>
	</div>
{/if}
