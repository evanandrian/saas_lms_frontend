<script lang="ts">
	interface Props {
		label: string;
		name: string;
		checked?: boolean;
		disabled?: boolean;
		hint?: string;
	}

	let { label, name, checked = $bindable(false), disabled = false, hint }: Props = $props();

	const fieldId = $props.id();
	const inputId = `${fieldId}-input`;
	const hintId = `${fieldId}-hint`;
</script>

<div class="flex items-start gap-3">
	<input
		id={inputId}
		type="checkbox"
		class="checkbox lms-focus-ring mt-0.5"
		{name}
		{disabled}
		aria-describedby={hint ? hintId : undefined}
		bind:checked
	/>
	<div>
		<label for={inputId} class="text-lms-body-sm">{label}</label>
		{#if hint}
			<p id={hintId} class="lms-text-helper">{hint}</p>
		{/if}
	</div>
</div>
