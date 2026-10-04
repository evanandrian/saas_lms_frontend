<script lang="ts">
	import PageContainer from '$lib/components/layout/PageContainer.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import ChoiceGroup from '$lib/components/ui/ChoiceGroup.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Stepper from '$lib/components/ui/Stepper.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import { useI18n } from '$lib/i18n';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const i18n = useI18n();
	const reasonId = $props.id();
	const stateLabels = $derived({
		done: i18n.t('common.steps.done'),
		current: i18n.t('common.steps.current'),
		upcoming: i18n.t('common.steps.upcoming')
	});
</script>

{#if data.onboarding}
	{@const o = data.onboarding}
	<PageContainer heading={i18n.t('onboarding.register.title')}>
		<p class="text-lms-muted max-w-prose">{i18n.t('onboarding.register.subtitle')}</p>
		<Stepper label={i18n.t('onboarding.steps_label')} steps={o.steps} {stateLabels} />
		<p id={reasonId} class="sr-only">{i18n.t('common.state.action_unavailable')}</p>

		<form
			class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
			onsubmit={(event) => event.preventDefault()}
		>
			<ChoiceGroup
				legend={i18n.t('onboarding.register.type_legend')}
				name="institution_type"
				options={o.institutionTypes}
				value={o.defaults.type}
			/>
			<Card title={i18n.t('onboarding.register.account_title')}>
				<div class="grid gap-4 md:grid-cols-2">
					<div class="md:col-span-2">
						<TextField
							label={i18n.t('onboarding.register.institution_name')}
							name="institution_name"
							value={o.defaults.institutionName}
							required
						/>
					</div>
					<TextField
						label={i18n.t('onboarding.register.npsn')}
						name="npsn"
						value={o.defaults.npsn}
					/>
					<Select
						label={i18n.t('onboarding.register.level')}
						name="level"
						options={o.levels}
						value={o.defaults.level}
					/>
					<TextField
						label={i18n.t('onboarding.register.students_estimate')}
						name="students_estimate"
						value={o.defaults.studentsEstimate}
					/>
					<TextField
						label={i18n.t('onboarding.register.pic_name')}
						name="pic_name"
						value={o.defaults.picName}
						autocomplete="name"
						required
					/>
					<TextField
						label={i18n.t('onboarding.register.email')}
						name="email"
						type="email"
						value={o.defaults.email}
						autocomplete="email"
						required
					/>
					<TextField
						label={i18n.t('onboarding.register.whatsapp')}
						name="whatsapp"
						type="tel"
						value={o.defaults.whatsapp}
						autocomplete="tel"
					/>
					<div class="md:col-span-2">
						<ChoiceGroup
							legend={i18n.t('onboarding.register.timezone')}
							name="timezone"
							layout="inline"
							options={o.timezones}
							value={o.defaults.timezone}
							hint={o.timezoneHint}
						/>
					</div>
					<div class="md:col-span-2">
						<Checkbox label={i18n.t('onboarding.register.trial')} name="trial" hint={o.trialHint} />
					</div>
				</div>
				<div
					class="border-lms-border mt-6 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
				>
					<p class="lms-text-helper max-w-sm">{i18n.t('onboarding.register.terms')}</p>
					<Button type="submit" disabled aria-describedby={reasonId}>
						{i18n.t('onboarding.register.submit')}
						<Icon icon={ArrowRight} size="sm" />
					</Button>
				</div>
			</Card>
		</form>
		<p class="text-lms-body-sm">{i18n.t('onboarding.register.have_account')}</p>
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
