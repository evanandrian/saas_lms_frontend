<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Info from '@lucide/svelte/icons/info';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Save from '@lucide/svelte/icons/save';
	import Send from '@lucide/svelte/icons/send';
	import type { AccountPageState } from '../account.state.svelte';
	import { NOTIFICATION_CHANNELS, type NotificationChannel } from '../account.model';
	import Switch from './Switch.svelte';
	import { buttonPrimary, buttonSecondary, card, fieldLabel } from './styles';

	interface Props {
		page: AccountPageState;
		errorText: (code: string) => string;
	}

	let { page, errorText }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`account.notif.${key}`, params);

	const FIELD: Record<NotificationChannel, 'email' | 'whatsapp' | 'in_app'> = {
		email: 'email',
		whatsapp: 'whatsapp',
		in_app: 'in_app'
	};

	const snapshot = () => $state.snapshot(page.overview.notifications);
	let draft = $state(snapshot());
	let saving = $state(false);
	let testing = $state(false);

	const saved = $derived(JSON.stringify(page.overview.notifications));
	const dirty = $derived(JSON.stringify(draft) !== saved);
	const bar = $derived(
		dirty
			? { text: t('bar_dirty'), tone: 'text-lms-warning-text', icon: Pencil }
			: { text: t('bar_saved'), tone: 'text-lms-muted', icon: CircleCheck }
	);
	const zone = $derived(
		page.overview.context.area === 'platform' ? t('zone_platform') : t('zone_tenant')
	);

	async function save() {
		if (saving) return;
		if (!dirty) {
			page.say(t('no_changes'), Info);
			return;
		}
		saving = true;
		const outcome = await page.run('notifications', {
			events: draft.events.map((e) => ({
				code: e.code,
				email: e.email,
				whatsapp: e.whatsapp,
				in_app: e.in_app
			})),
			quiet: draft.quiet
		});
		saving = false;
		if (!outcome.ok) {
			page.say(errorText(outcome.code), CircleX);
			return;
		}
		draft = snapshot();
		page.say(t('saved'));
	}

	async function test() {
		if (testing) return;
		testing = true;
		const outcome = await page.run('notificationsTest');
		testing = false;
		const phone = page.overview.profile.phone;
		page.say(
			outcome.ok
				? phone && page.overview.security.whatsapp_available
					? t('test_sent_both', {
							email: page.overview.profile.email,
							phone: `+62 ${phone.slice(0, 3)}••••${phone.slice(-3)}`
						})
					: t('test_sent_email', { email: page.overview.profile.email })
				: errorText(outcome.code),
			outcome.ok ? Send : CircleX
		);
	}
</script>

<section class="{card} gap-1.5">
	<div class="mb-2 flex flex-wrap items-center justify-between gap-3">
		<h2 class="text-base font-bold">{t('title')}</h2>
		<button
			type="button"
			class="{buttonSecondary} h-[34px] rounded-lg px-3 text-xs"
			disabled={testing}
			onclick={test}><Icon icon={Send} size="sm" />{t('test')}</button
		>
	</div>
	<div class="overflow-x-auto">
		<div class="min-w-130" role="table" aria-label={t('title')}>
			<div
				class="border-lms-border text-lms-muted grid grid-cols-[minmax(0,1fr)_repeat(3,90px)] gap-2 border-b py-2 font-mono text-[11px] tracking-[0.08em]"
				role="row"
			>
				<span role="columnheader">{t('col_event')}</span>
				{#each NOTIFICATION_CHANNELS as ch (ch)}
					<span class="text-center" role="columnheader">{t(`col_${ch}`)}</span>
				{/each}
			</div>
			{#each draft.events as ev (ev.code)}
				<div
					class="border-lms-border grid grid-cols-[minmax(0,1fr)_repeat(3,90px)] items-center gap-2 border-b py-3"
					role="row"
				>
					<span class="flex flex-col gap-0.5" role="rowheader">
						<span class="text-sm font-semibold">{ev.label}</span>
						<span class="text-lms-muted text-xs">{ev.description}</span>
					</span>
					{#each NOTIFICATION_CHANNELS as ch (ch)}
						{@const locked = ev.email_locked && ch === 'email'}
						<span class="flex justify-center" role="cell">
							<button
								type="button"
								role="switch"
								aria-checked={ev[FIELD[ch]]}
								aria-label="{ev.label} · {t(`col_${ch}`)}"
								title={locked ? t('locked') : ''}
								class="lms-focus-ring rounded-full {locked ? 'cursor-not-allowed' : ''}"
								onclick={() => {
									if (!locked) ev[FIELD[ch]] = !ev[FIELD[ch]];
								}}><Switch on={ev[FIELD[ch]]} {locked} /></button
							>
						</span>
					{/each}
				</div>
			{/each}
		</div>
	</div>
	<span class="text-lms-muted mt-1.5 text-xs">{t('security_note')}</span>
</section>

<section class="{card} gap-3.5">
	<button
		type="button"
		role="switch"
		aria-checked={draft.quiet.enabled}
		class="lms-focus-ring flex items-center gap-3 text-start"
		onclick={() => (draft.quiet.enabled = !draft.quiet.enabled)}
	>
		<Switch on={draft.quiet.enabled} />
		<span class="flex flex-col gap-0.5">
			<span class="text-base font-bold">{t('quiet_title')}</span>
			<span class="text-lms-muted text-xs">{t('quiet_sub')}</span>
		</span>
	</button>
	{#if draft.quiet.enabled}
		<div class="flex flex-wrap items-end gap-3">
			<label class="flex flex-col gap-1.5">
				<span class={fieldLabel}>{t('quiet_from')}</span>
				<input
					type="time"
					class="bg-lms-surface border-lms-border-strong lms-focus-ring h-[42px] rounded-[10px] border-[1.5px] px-3 text-sm"
					bind:value={draft.quiet.from}
				/>
			</label>
			<label class="flex flex-col gap-1.5">
				<span class={fieldLabel}>{t('quiet_to')}</span>
				<input
					type="time"
					class="bg-lms-surface border-lms-border-strong lms-focus-ring h-[42px] rounded-[10px] border-[1.5px] px-3 text-sm"
					bind:value={draft.quiet.to}
				/>
			</label>
			<span class="text-lms-muted pb-3 text-xs"
				>{t('quiet_note', { from: draft.quiet.from, to: draft.quiet.to, zone })}</span
			>
		</div>
	{/if}
</section>

<div
	class="bg-lms-surface border-lms-border sticky bottom-19 z-5 flex flex-wrap items-center gap-2.5 rounded-xl border py-3 ps-4 pe-3 shadow-[0_18px_40px_-24px_rgba(15,24,56,0.4)]"
>
	<span class="flex flex-[1_1_200px] items-center gap-2 text-[13px] {bar.tone}"
		><Icon icon={bar.icon} size="sm" />{bar.text}</span
	>
	<button
		type="button"
		class="{buttonSecondary} h-[42px] px-4 text-sm"
		onclick={() => (draft = snapshot())}>{t('discard')}</button
	>
	<button
		type="button"
		class="{buttonPrimary} h-[42px] px-4.5 text-sm"
		disabled={saving}
		onclick={save}><Icon icon={Save} size="sm" />{t('save')}</button
	>
</div>
