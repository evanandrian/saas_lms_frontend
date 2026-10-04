<script lang="ts">
	interface Props {
		/** Teks tautan sebagaimana di referensi (mis. "Tambah kursi"). */
		label: string;
		/** Keterangan untuk pembaca layar, mis. "belum tersedia". */
		note: string;
	}

	let { label, note }: Props = $props();
</script>

<!-- Tujuan belum dibangun (FE-04 D6): teks, bukan tautan — tidak menuju 404 dan tidak dapat difokus. -->
<span class="text-lms-body-sm text-lms-muted font-semibold whitespace-nowrap">
	{label}<span class="sr-only"> ({note})</span>
</span>
