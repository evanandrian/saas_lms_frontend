/** Kelas bersama halaman Pengaturan Akun (referensi "10 Pengaturan Akun", token `lms-*`). */
export const card = 'bg-lms-surface border-lms-border flex flex-col rounded-xl border p-5';
export const cardTitle = 'text-base font-bold';
export const fieldLabel = 'text-[13px] font-semibold';
export const hint = 'text-xs';
export const eyebrow = 'font-mono text-[11px] tracking-[0.1em] text-lms-muted';

export function inputClass(error: boolean, locked = false, extra = ''): string {
	return [
		'lms-focus-ring h-[42px] w-full min-w-0 rounded-[10px] border-[1.5px] px-3 text-sm text-lms-foreground outline-none',
		error ? 'border-lms-danger-text' : 'border-lms-border-strong',
		locked ? 'bg-lms-surface-muted cursor-not-allowed' : 'bg-lms-surface',
		extra
	].join(' ');
}

export function groupClass(error: boolean, ok = false): string {
	return [
		'bg-lms-surface flex overflow-hidden rounded-[10px] border-[1.5px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--color-lms-focus)',
		error ? 'border-lms-danger-text' : ok ? 'border-lms-success-text' : 'border-lms-border-strong'
	].join(' ');
}

export const buttonPrimary =
	'lms-focus-ring bg-lms-interactive text-lms-on-interactive hover:bg-lms-interactive-hover inline-flex items-center justify-center gap-2 rounded-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-60';
export const buttonSecondary =
	'lms-focus-ring border-lms-border-strong bg-lms-surface text-lms-foreground hover:bg-lms-surface-muted inline-flex items-center justify-center gap-1.5 rounded-[10px] border font-semibold disabled:cursor-not-allowed disabled:opacity-60';
export const buttonDanger =
	'lms-focus-ring border-lms-danger-text text-lms-danger-text hover:bg-lms-danger-subtle inline-flex items-center justify-center gap-1.5 rounded-[10px] border bg-transparent font-semibold disabled:opacity-60';
export const segmented = 'bg-lms-surface-muted flex gap-0.5 rounded-[10px] p-[3px]';

export function segment(active: boolean): string {
	return [
		'lms-focus-ring rounded-lg text-xs font-semibold whitespace-nowrap',
		active ? 'bg-lms-surface text-lms-foreground shadow-sm' : 'text-lms-muted'
	].join(' ');
}

export const banner = 'flex flex-wrap items-center gap-3 rounded-xl px-4 py-3.5';
export const bannerButton =
	'lms-focus-ring h-[34px] rounded-lg px-3 text-xs font-bold disabled:opacity-60';
