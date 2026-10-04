<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Icon from './Icon.svelte';

	type TextFieldType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';

	interface Props {
		label: string;
		name: string;
		value?: string;
		type?: TextFieldType;
		required?: boolean;
		disabled?: boolean;
		/** Teks bantuan; dihubungkan lewat `aria-describedby`. */
		hint?: string;
		/** Pesan error; mengaktifkan `aria-invalid` dan dihubungkan lewat `aria-describedby`. */
		error?: string;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		placeholder?: string;
		/** `lg`: tinggi 46px untuk formulir autentikasi (referensi FLIXARE App.html). */
		size?: 'md' | 'lg';
		/** Ikon dekoratif di awal field. */
		icon?: LucideIcon;
		/** Konten di sisi kanan label (mis. tautan pemulihan). */
		labelAside?: Snippet;
		/** Kontrol di ujung kanan field (mis. tombol tampilkan kata sandi). */
		trailing?: Snippet;
		/** State: nilai dikenali/terverifikasi (batas berwarna interaktif). */
		highlighted?: boolean;
		/** Fokus awal; hanya untuk alur yang dimulai pengguna (mis. "Masuk kembali" → kata sandi). */
		autofocus?: boolean;
		onkeydown?: HTMLInputAttributes['onkeydown'];
		onkeyup?: HTMLInputAttributes['onkeyup'];
	}

	let {
		label,
		name,
		value = $bindable(''),
		type = 'text',
		required = false,
		disabled = false,
		hint,
		error,
		autocomplete,
		placeholder,
		size = 'md',
		icon,
		labelAside,
		trailing,
		highlighted = false,
		autofocus = false,
		onkeydown,
		onkeyup
	}: Props = $props();

	const fieldId = $props.id();
	const inputId = `${fieldId}-input`;
	const hintId = `${fieldId}-hint`;
	const errorId = `${fieldId}-error`;

	const describedBy = $derived(
		[hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="space-y-1">
	<div class="flex items-baseline justify-between gap-3">
		<label for={inputId} class="lms-text-label block">
			{label}
			{#if required}
				<span class="text-lms-danger-text" aria-hidden="true">*</span>
			{/if}
		</label>
		{#if labelAside}{@render labelAside()}{/if}
	</div>
	<div class="relative">
		{#if icon}
			<span
				class="text-lms-muted pointer-events-none absolute inset-y-0 start-3.5 flex items-center"
			>
				<Icon {icon} size="sm" />
			</span>
		{/if}
		<!-- svelte-ignore a11y_autofocus -->
		<input
			id={inputId}
			class={[
				'input lms-input lms-focus-ring',
				size === 'lg' && 'h-11.5',
				highlighted && 'border-lms-interactive!',
				icon && 'ps-10',
				trailing && 'pe-11'
			]}
			{name}
			{type}
			{required}
			{disabled}
			{autocomplete}
			{placeholder}
			{autofocus}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={describedBy}
			{onkeydown}
			{onkeyup}
			bind:value
		/>
		{#if trailing}
			<span class="absolute inset-y-0 end-1.5 flex items-center">{@render trailing()}</span>
		{/if}
	</div>
	{#if hint}
		<p id={hintId} class="lms-text-helper">{hint}</p>
	{/if}
	{#if error}
		<p id={errorId} class="lms-text-error">{error}</p>
	{/if}
</div>
