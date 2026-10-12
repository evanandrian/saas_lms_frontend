<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import Mail from '@lucide/svelte/icons/mail';
	import { PREFIX, type AccountStatus } from '../school-admin.model';

	interface Props {
		status: AccountStatus;
		hasEmail: boolean;
		/** Murid tanpa email → username + kode aktivasi; orang tua tanpa email tidak bisa diundang. */
		kind?: 'teacher' | 'student' | 'guardian';
		busy?: boolean;
		oninvite: () => void;
	}
	let { status, hasEmail, kind = 'teacher', busy = false, oninvite }: Props = $props();

	const i18n = useI18n();
	const t = (key: string) => i18n.t(`${PREFIX}.account.${key}`);

	const note = $derived(
		status === 'active'
			? t('note_active')
			: status === 'invited'
				? t('note_invited')
				: status === 'inactive'
					? t('note_inactive')
					: !hasEmail && kind === 'student'
						? t('note_code')
						: !hasEmail
							? t('note_no_email')
							: t('note_not_invited')
	);
	const label = $derived(
		status === 'active' ? t('reset') : status === 'invited' ? t('resend') : t('send')
	);
	const disabled = $derived(busy || status === 'inactive' || (!hasEmail && kind === 'guardian'));
</script>

<!-- Status akun di drawer (referensi v4): aktif / diundang / belum diundang + aksi undangan. -->
<div class="bg-lms-surface-muted flex flex-wrap items-center gap-3 rounded-xl p-3.5">
	<span class="text-lms-interactive"><Icon icon={Mail} size="sm" /></span>
	<span class="flex flex-[1_1_200px] flex-col gap-0.5 text-[13px]">
		<span class="font-semibold"
			>{i18n.t(`${PREFIX}.account.status_label`, { status: t(status) })}</span
		>
		<span class="text-lms-muted">{note}</span>
	</span>
	<button
		type="button"
		class="lms-action-secondary lms-focus-ring h-9 rounded-lg px-3.5 text-xs font-semibold disabled:opacity-50"
		{disabled}
		onclick={oninvite}>{label}</button
	>
</div>
