<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import Upload from '@lucide/svelte/icons/upload';
	import { DOCUMENT_ACCEPT } from '../account.requests';

	interface Props {
		label: string;
		busy?: boolean;
		size?: 'sm' | 'md';
		onfile: (file: File) => void;
	}

	let { label, busy = false, size = 'sm', onfile }: Props = $props();
</script>

<!-- Tombol unggah dokumen (referensi "Unggah dokumen"): label + input file tersembunyi. -->
<label
	class="bg-lms-interactive text-lms-on-interactive flex cursor-pointer items-center gap-1.5 font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--color-lms-focus) {size ===
	'sm'
		? 'h-[34px] rounded-lg px-3 text-xs'
		: 'h-[42px] rounded-[10px] px-4 text-sm'} {busy ? 'pointer-events-none opacity-60' : ''}"
>
	<Icon icon={Upload} size="sm" />{label}
	<input
		type="file"
		accept={DOCUMENT_ACCEPT}
		class="sr-only"
		disabled={busy}
		onchange={(e) => {
			const input = e.currentTarget;
			const file = input.files?.[0];
			input.value = '';
			if (file) onfile(file);
		}}
	/>
</label>
