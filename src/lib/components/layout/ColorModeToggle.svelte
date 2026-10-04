<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import { applyColorMode, isColorMode, type ColorMode } from '$lib/utils/color-mode';
	import type { LucideIcon } from '@lucide/svelte';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';

	// Preferensi tersimpan dari SSR (`locals.colorMode`, data root layout); tersedia di semua halaman.
	const initialMode: ColorMode = isColorMode(page.data.colorMode) ? page.data.colorMode : 'system';

	type ExplicitColorMode = Exclude<ColorMode, 'system'>;

	const i18n = useI18n();
	const MEDIA_DARK = '(prefers-color-scheme: dark)';
	const OPTIONS = [
		{ mode: 'light', icon: Sun, labelKey: 'common.color_mode.light' },
		{ mode: 'dark', icon: Moon, labelKey: 'common.color_mode.dark' }
	] as const satisfies readonly { mode: ExplicitColorMode; icon: LucideIcon; labelKey: string }[];

	// Pilihan pengguna dimulai dari preferensi SSR, lalu dikelola lokal.
	let selectedMode = $state<ColorMode>(initialMode);
	let isSystemDark = $state(false);

	// Mode `system`: tombol aktif mengikuti preferensi OS saat ini.
	$effect(() => {
		const query = window.matchMedia(MEDIA_DARK);
		isSystemDark = query.matches;
		const handleChange = (event: MediaQueryListEvent) => (isSystemDark = event.matches);
		query.addEventListener('change', handleChange);
		return () => query.removeEventListener('change', handleChange);
	});

	const effectiveMode = $derived<ExplicitColorMode>(
		selectedMode === 'system' ? (isSystemDark ? 'dark' : 'light') : selectedMode
	);

	function handleSelect(mode: ExplicitColorMode) {
		selectedMode = mode;
		applyColorMode(mode);
	}
</script>

<div
	role="group"
	aria-label={i18n.t('common.color_mode.label')}
	class="bg-lms-surface-muted border-lms-border flex shrink-0 gap-0.5 rounded-full border p-0.5"
>
	{#each OPTIONS as option (option.mode)}
		<button
			type="button"
			class={[
				'lms-focus-ring inline-flex h-7.5 w-8.5 items-center justify-center rounded-full',
				effectiveMode === option.mode
					? 'bg-lms-surface text-lms-foreground shadow-sm'
					: 'text-lms-muted hover:text-lms-foreground'
			]}
			aria-label={i18n.t(option.labelKey)}
			aria-pressed={effectiveMode === option.mode}
			onclick={() => handleSelect(option.mode)}
		>
			<Icon icon={option.icon} size="sm" />
		</button>
	{/each}
</div>
