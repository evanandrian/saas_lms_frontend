<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import Spinner from './Spinner.svelte';

	type ButtonVariant =
		| 'primary'
		| 'secondary'
		| 'outline'
		| 'ghost'
		| 'destructive'
		| 'on-hero'
		| 'on-hero-outline'
		| 'on-hero-subtle';
	type ButtonSize = 'sm' | 'md' | 'lg';
	type ButtonWidth = 'auto' | 'full';

	type PassthroughAttributes = Pick<
		HTMLButtonAttributes,
		| 'onclick'
		| 'form'
		| 'name'
		| 'value'
		| 'aria-label'
		| 'aria-expanded'
		| 'aria-controls'
		| 'aria-describedby'
		| 'aria-pressed'
	>;

	interface Props extends PassthroughAttributes {
		variant?: ButtonVariant;
		size?: ButtonSize;
		/** `full`: selebar kontainer (mis. aksi utama formulir autentikasi). */
		width?: ButtonWidth;
		/** Default `button` agar tidak men-submit form secara tidak sengaja. */
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		/** Menonaktifkan tombol, menandai `aria-busy`, dan menampilkan spinner; label tetap terbaca. */
		loading?: boolean;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		width = 'auto',
		type = 'button',
		disabled = false,
		loading = false,
		children,
		...attributes
	}: Props = $props();

	const VARIANT_CLASSES: Record<ButtonVariant, string> = {
		primary: 'lms-action-primary',
		secondary: 'lms-action-secondary',
		// Permukaan + batas input (≥ 3:1); hover hanya mengubah warna batas, tanpa filter.
		outline:
			'bg-lms-surface text-lms-foreground border border-lms-input-border hover:border-lms-interactive',
		ghost: 'lms-action-ghost',
		destructive: 'lms-action-destructive',
		// Di atas hero (referensi): putih + teks Deep Neutral (14.69:1), atau garis putih transparan.
		'on-hero': 'bg-lms-on-hero text-lms-brand-deep-neutral hover:bg-lms-on-hero/90',
		'on-hero-outline': 'border border-lms-on-hero/25 text-lms-on-hero hover:bg-lms-on-hero/10',
		// Status aktif di atas hero (mis. "Tutup lobi", referensi v3): putih 14% + teks putih.
		'on-hero-subtle': 'bg-lms-on-hero/14 text-lms-on-hero hover:bg-lms-on-hero/20'
	};

	const SIZE_CLASSES: Record<ButtonSize, string> = {
		sm: 'btn-sm',
		md: 'btn-base',
		lg: 'btn-lg h-12'
	};
</script>

<button
	{...attributes}
	{type}
	class={[
		'btn lms-focus-ring',
		VARIANT_CLASSES[variant],
		SIZE_CLASSES[size],
		width === 'full' && 'w-full'
	]}
	disabled={disabled || loading}
	aria-busy={loading ? 'true' : undefined}
>
	{#if loading}
		<Spinner />
	{/if}
	{@render children()}
</button>
