<script lang="ts">
	interface Props {
		tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
		label: string;
	}
	let { tone = 'neutral', label }: Props = $props();
	const TONE = {
		neutral: 'bg-lms-surface-muted text-lms-muted',
		info: 'lms-tone-info',
		success: 'lms-tone-success',
		warning: 'lms-tone-warning',
		danger: 'lms-tone-danger'
	} as const;
</script>

<span
	class="justify-self-start rounded-full px-2 py-[3px] text-[10px] font-bold tracking-[0.04em] whitespace-nowrap {TONE[
		tone
	]}">{label}</span
>
