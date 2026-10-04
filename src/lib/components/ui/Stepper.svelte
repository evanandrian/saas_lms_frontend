<script lang="ts">
	export type StepState = 'done' | 'current' | 'upcoming';

	export interface Step {
		label: string;
		state: StepState;
	}

	interface Props {
		label: string;
		steps: readonly Step[];
		/** Teks status langkah untuk pembaca layar. */
		stateLabels: Record<StepState, string>;
	}

	let { label, steps, stateLabels }: Props = $props();

	const STEP_CLASSES: Record<StepState, string> = {
		done: 'lms-card',
		current: 'lms-tone-info border border-lms-interactive',
		upcoming: 'lms-card text-lms-muted'
	};
	const NUMBER_CLASSES: Record<StepState, string> = {
		done: 'bg-lms-brand-growth-green text-lms-brand-deep-neutral',
		current: 'lms-action-primary',
		upcoming: 'bg-lms-surface-muted text-lms-foreground'
	};
</script>

<ol class="flex flex-wrap gap-2" aria-label={label}>
	{#each steps as step, index (step.label)}
		<li
			class={['flex items-center gap-2 rounded-full py-1.5 ps-1.5 pe-4', STEP_CLASSES[step.state]]}
			aria-current={step.state === 'current' ? 'step' : undefined}
		>
			<span
				class={[
					'text-lms-caption flex size-6 items-center justify-center rounded-full font-semibold',
					NUMBER_CLASSES[step.state]
				]}
				aria-hidden="true"
			>
				{index + 1}
			</span>
			<span class="text-lms-body-sm font-semibold">{step.label}</span>
			<span class="sr-only">({stateLabels[step.state]})</span>
		</li>
	{/each}
</ol>
