<script lang="ts">
	import type { RegistrationState } from '$lib/api/generated/lms';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import type { PageActionOutcome } from '$lib/utils/page-action';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import FilePen from '@lucide/svelte/icons/file-pen';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Mail from '@lucide/svelte/icons/mail';
	import SearchCheck from '@lucide/svelte/icons/search-check';
	import Send from '@lucide/svelte/icons/send';
	import type { RegistrationWizard } from '../../registration.state.svelte';

	interface Props {
		wizard: RegistrationWizard;
		act: <T>(name: string, body?: unknown) => Promise<PageActionOutcome<T>>;
		onEdit: () => void;
	}

	let { wizard, act, onEdit }: Props = $props();
	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`register.${key}`, params);

	const app = $derived(wizard.server?.application ?? null);
	const approved = $derived(app?.status === 'approved');
	const manual = $derived(wizard.type === 'school');
	const locale = $derived(i18n.locale === 'en' ? 'en-US' : 'id-ID');
	const stage = $derived(
		approved ? 3 : manual && app?.status === 'submitted' && app.reviewed_at ? 2 : manual ? 1 : 2
	);
	const submittedAt = $derived(app?.submitted_at ? new Date(app.submitted_at) : null);
	const nodes = $derived([
		{
			key: 'submitted',
			icon: Send,
			sub: submittedAt
				? t('approval.submitted_at', {
						time: submittedAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
					})
				: '—'
		},
		{
			key: 'review',
			icon: SearchCheck,
			sub: manual ? t('approval.review_manual') : t('approval.review_auto')
		},
		{
			key: 'approved',
			icon: BadgeCheck,
			sub: approved ? t('approval.db_created') : t('approval.waiting')
		}
	]);
	const checks = $derived([
		{ key: 'npsn', label: t('approval.check_npsn', { npsn: app?.npsn || '—' }), ok: approved },
		{ key: 'trial', label: t('approval.check_trial'), ok: approved },
		{ key: 'email', label: t('approval.check_email'), ok: true },
		{ key: 'match', label: t('approval.check_match'), ok: approved }
	]);

	async function restart() {
		await act<RegistrationState>('institution', { tenant_type: wizard.type, partial: true });
		onEdit();
	}
</script>

{#if app?.status === 'rejected'}
	<section class="lms-tone-danger flex flex-wrap items-start gap-3 rounded-xl px-4 py-3.5">
		<Icon icon={CircleX} />
		<span class="flex flex-[1_1_15rem] flex-col gap-0.75">
			<span class="text-sm font-bold">{t('approval.rejected_title')}</span>
			<span class="text-[0.8125rem] leading-5"
				>{app.rejection_reason}{app.rejection_note ? `. ${app.rejection_note}` : ''}</span
			>
		</span>
		<button
			type="button"
			class="lms-focus-ring h-9 rounded-lg border border-current px-3.5 text-[0.8125rem] font-semibold"
			onclick={restart}>{t('approval.restart')}</button
		>
	</section>
{:else if app?.status === 'revision_requested'}
	<section class="lms-tone-info flex flex-wrap items-start gap-3 rounded-xl px-4 py-3.5">
		<Icon icon={FilePen} />
		<span class="flex flex-[1_1_15rem] flex-col gap-0.75">
			<span class="text-sm font-bold">{t('approval.revision_title')}</span>
			<span class="text-[0.8125rem] leading-5"
				>{t('approval.revision_fields', { fields: app.revision_fields.join(', ') })} “{app.revision_note}”</span
			>
		</span>
		<button
			type="button"
			class="lms-focus-ring h-9 rounded-lg border border-current px-3.5 text-[0.8125rem] font-semibold"
			onclick={onEdit}>{t('approval.revise')}</button
		>
	</section>
{/if}

<section class="lms-card flex flex-col gap-5.5 rounded-[14px]! p-6 shadow-none!">
	<ol class="grid grid-cols-3">
		{#each nodes as node, i (node.key)}
			{@const done = i + 1 < stage || (i === 2 && approved)}
			{@const current = i + 1 === stage && !approved}
			<li class="flex flex-col gap-2.5">
				<div class="flex items-center">
					<span
						class={[
							'text-lms-on-interactive flex size-8.5 flex-none items-center justify-center rounded-full transition-colors',
							done
								? 'bg-lms-progress'
								: current
									? 'bg-lms-interactive ring-lms-interactive/25 ring-6'
									: 'bg-lms-input-border'
						]}><Icon icon={node.icon} size="sm" /></span
					>
					{#if i < 2}<span
							class={[
								'mx-2 h-0.75 flex-1 rounded-full',
								i + 1 < stage ? 'bg-lms-progress' : 'bg-lms-border'
							]}
						></span>{/if}
				</div>
				<span class="flex flex-col gap-0.5 pe-3">
					<span
						class={[
							'text-sm font-bold',
							done || current ? 'text-lms-foreground' : 'text-lms-muted'
						]}>{t(`approval.node_${node.key}`)}</span
					>
					<span class="text-lms-muted text-xs">{node.sub}</span>
				</span>
			</li>
		{/each}
	</ol>
	{#if manual}
		<div class="bg-lms-background flex flex-col gap-2 rounded-xl p-4">
			<span class="text-[0.8125rem] font-bold">{t('approval.checked')}</span>
			{#each checks as check (check.key)}
				<span
					class={[
						'flex items-center gap-2.5 text-[0.8125rem]',
						check.ok ? 'text-lms-success-text' : 'text-lms-muted'
					]}
				>
					<Icon icon={check.ok ? CircleCheck : LoaderCircle} size="sm" />{check.label}
				</span>
			{/each}
		</div>
	{/if}
	{#if approved}
		<div class="border-lms-border overflow-hidden rounded-xl border">
			<div
				class="bg-lms-surface-muted text-lms-muted flex items-center gap-2 px-3.5 py-2.5 text-xs"
			>
				<Icon icon={Mail} size="sm" />{t('approval.mail_sent', { email: app?.contact_email ?? '' })}
			</div>
			<div class="flex flex-col gap-1 p-3.5">
				<span class="text-sm font-bold"
					>{t('approval.mail_title', { institution: app?.institution_name ?? '' })}</span
				>
				<span class="text-lms-muted text-[0.8125rem] leading-5">{t('approval.mail_body')}</span>
			</div>
		</div>
	{/if}
	<span class="text-lms-muted text-xs">{t(`approval.eta_${wizard.type}`)}</span>
</section>
