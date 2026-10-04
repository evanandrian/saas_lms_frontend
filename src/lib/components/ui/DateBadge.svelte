<script lang="ts">
	interface Props {
		day: string;
		month: string;
		/** Tanggal lengkap untuk pembaca layar, mis. "6 Oktober". */
		label: string;
	}

	let { day, month, label }: Props = $props();
</script>

<span
	class="lms-tone-info flex size-11 flex-col items-center justify-center rounded-base leading-none"
>
	<span class="sr-only">{label}</span>
	<span class="font-semibold" aria-hidden="true">{day}</span>
	<span class="text-lms-caption uppercase" aria-hidden="true">{month}</span>
</span>
