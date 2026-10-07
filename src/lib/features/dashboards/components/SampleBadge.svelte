<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';

	/**
	 * Penanda "Data contoh" pada bagian dashboard yang modul backend-nya belum tersedia (keputusan
	 * pemilik produk 7 Okt 2026: data contoh tampil di dev & produksi, selalu berlabel).
	 */
	interface Props {
		/** `on-hero` untuk dipakai di atas latar hero gelap. */
		tone?: 'default' | 'on-hero';
	}

	let { tone = 'default' }: Props = $props();
	const i18n = useI18n();
</script>

<span
	class={[
		'inline-flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
		tone === 'on-hero'
			? 'bg-lms-on-hero/10 text-lms-on-hero-muted border-lms-on-hero/20 border'
			: 'bg-lms-background text-lms-muted border-lms-border border'
	]}
	title={i18n.t('dashboard.sample.hint')}
>
	<Icon icon={FlaskConical} size="sm" />{i18n.t('dashboard.sample.label')}
</span>
