<script lang="ts">
	export interface SelectOption {
		value: string;
		label: string;
	}

	interface Props {
		label: string;
		name: string;
		options: readonly SelectOption[];
		value?: string;
		required?: boolean;
		disabled?: boolean;
		hint?: string;
		error?: string;
	}

	let {
		label,
		name,
		options,
		value = $bindable(''),
		required = false,
		disabled = false,
		hint,
		error
	}: Props = $props();

	const fieldId = $props.id();
	const selectId = `${fieldId}-select`;
	const hintId = `${fieldId}-hint`;
	const errorId = `${fieldId}-error`;

	const describedBy = $derived(
		[hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="space-y-1">
	<label for={selectId} class="lms-text-label block">
		{label}
		{#if required}
			<span class="text-lms-danger-text" aria-hidden="true">*</span>
		{/if}
	</label>
	<select
		id={selectId}
		class="select lms-input lms-focus-ring"
		{name}
		{required}
		{disabled}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={describedBy}
		bind:value
	>
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
	{#if hint}
		<p id={hintId} class="lms-text-helper">{hint}</p>
	{/if}
	{#if error}
		<p id={errorId} class="lms-text-error">{error}</p>
	{/if}
</div>
