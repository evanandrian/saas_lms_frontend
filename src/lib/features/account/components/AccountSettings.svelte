<script lang="ts">
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatePanel from '$lib/components/ui/StatePanel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { useI18n } from '$lib/i18n';
	import { onMount } from 'svelte';
	import type { LucideIcon } from '@lucide/svelte';
	import Bell from '@lucide/svelte/icons/bell';
	import Check from '@lucide/svelte/icons/check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import History from '@lucide/svelte/icons/history';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Link from '@lucide/svelte/icons/link';
	import Lock from '@lucide/svelte/icons/lock';
	import LogOut from '@lucide/svelte/icons/log-out';
	import MonitorSmartphone from '@lucide/svelte/icons/monitor-smartphone';
	import Send from '@lucide/svelte/icons/send';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import ShieldOff from '@lucide/svelte/icons/shield-off';
	import Unlink from '@lucide/svelte/icons/unlink';
	import UserRound from '@lucide/svelte/icons/user-round';
	import UserX from '@lucide/svelte/icons/user-x';
	import type { AccountOverview } from '$lib/api/generated/lms';
	import type { AccountFailure } from '../account.api';
	import { ACCOUNT_TABS, initials, type AccountTab } from '../account.model';
	import { AccountPageState } from '../account.state.svelte';
	import HistoryTab from './HistoryTab.svelte';
	import LinkedTab from './LinkedTab.svelte';
	import NotificationsTab from './NotificationsTab.svelte';
	import PasswordTab from './PasswordTab.svelte';
	import PrivacyTab from './PrivacyTab.svelte';
	import ProfileTab from './ProfileTab.svelte';
	import SecurityTab from './SecurityTab.svelte';
	import SessionsTab from './SessionsTab.svelte';

	export interface AccountPageData {
		overview: AccountOverview | null;
		failure: AccountFailure | null;
		initialTab: AccountTab;
		reset: { token: string; valid: boolean } | null;
		linked: string | null;
		linkError: string | null;
	}

	interface Props {
		data: AccountPageData;
		/** URL proxy foto profil & unduh data (rute SvelteKit, token tetap di cookie HttpOnly). */
		photoPath: string;
		exportPath: string;
	}

	let { data, photoPath, exportPath }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`account.${key}`, params);

	/** Kode error backend yang punya teks sendiri; lainnya → pesan umum. */
	const KNOWN_ERRORS = new Set([
		'version_conflict',
		'nothing_pending',
		'request_pending',
		'resend_too_soon',
		'not_configured',
		'phone_required',
		'two_factor_state',
		'challenge_expired',
		'current_session',
		'not_found',
		'forbidden',
		'unauthenticated',
		'unavailable'
	]);
	const errorText = (code: string) => t(`errors.${KNOWN_ERRORS.has(code) ? code : 'generic'}`);

	const TAB_ICON: Record<AccountTab, LucideIcon> = {
		profile: UserRound,
		password: KeyRound,
		security: ShieldCheck,
		sessions: MonitorSmartphone,
		history: History,
		notif: Bell,
		linked: Link,
		privacy: Lock
	};

	// svelte-ignore state_referenced_locally
	const pageState = data.overview ? new AccountPageState(data.overview, data.initialTab) : null;

	$effect(() => pageState?.start());

	// Layar sempit: daftar tab bergulir horizontal → tab aktif selalu terlihat.
	let tabNav = $state<HTMLElement | null>(null);
	$effect(() => {
		void pageState?.tab;
		tabNav
			?.querySelector('[aria-current="page"]')
			?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	});

	const LINK_ERRORS = new Set([
		'oauth_linked_elsewhere',
		'oauth_state_invalid',
		'oauth_cancelled',
		'service_unavailable'
	]);

	// Hasil callback OAuth (menghubungkan akun) dari cookie notifikasi sekali tampil.
	onMount(() => {
		if (!pageState || (!data.linked && !data.linkError)) return;
		if (data.linked) {
			const linked = pageState.overview.linked.find((l) => l.provider === data.linked);
			pageState.say(
				t('linked.connected_toast', {
					provider: t(`linked.name.${data.linked}`),
					email: linked?.email ?? ''
				})
			);
		} else if (data.linkError) {
			pageState.say(
				t(`linked.errors.${LINK_ERRORS.has(data.linkError) ? data.linkError : 'oauth_failed'}`),
				CircleX
			);
		}
	});

	const photoUrl = $derived(
		pageState?.overview.profile.has_photo
			? `${photoPath}?v=${pageState.overview.profile.photo_version}`
			: null
	);
	const approver = $derived(pageState ? t(`approver.${pageState.overview.context.approver}`) : '');

	const confirmContent = $derived.by(() => {
		const kind = pageState?.confirm;
		if (!pageState || !kind) return null;
		const none: Record<string, string | number> = {};
		if (kind === 'tfa') return { icon: ShieldOff, key: 'tfa', params: none };
		if (kind === 'sessions')
			return {
				icon: LogOut,
				key: 'sessions',
				params: { count: pageState.overview.sessions.filter((s) => !s.current).length } as Record<
					string,
					string | number
				>
			};
		if (kind === 'delete')
			return {
				icon: UserX,
				key: 'delete',
				params: { approver } as Record<string, string | number>
			};
		return { icon: Unlink, key: 'unlink', params: none };
	});

	async function doConfirm() {
		if (!pageState?.confirm) return;
		const kind = pageState.confirm;
		if (kind === 'tfa') {
			const outcome = await pageState.run('twoFactorDisable');
			pageState.say(
				outcome.ok ? t('security.disabled_toast') : errorText(outcome.code),
				outcome.ok ? ShieldOff : CircleX
			);
		} else if (kind === 'sessions') {
			const outcome = await pageState.run('sessionsRevokeOthers');
			pageState.say(
				outcome.ok ? t('sessions.all_kicked') : errorText(outcome.code),
				outcome.ok ? LogOut : CircleX
			);
		} else if (kind === 'delete') {
			const outcome = await pageState.run('deletionRequest');
			pageState.say(
				outcome.ok ? t('privacy.deletion_sent_toast', { approver }) : errorText(outcome.code),
				outcome.ok ? Send : CircleX
			);
		} else {
			const provider = kind.split(':')[1];
			const outcome = await pageState.run('unlink', { provider });
			pageState.say(
				outcome.ok ? t('linked.disconnected_toast') : errorText(outcome.code),
				outcome.ok ? Unlink : CircleX
			);
		}
		pageState.confirm = null;
	}

	const hasDot = (tab: AccountTab) =>
		pageState !== null &&
		((tab === 'security' && !pageState.overview.security.two_factor_enabled) ||
			(tab === 'profile' &&
				(Boolean(pageState.overview.pending_email) ||
					pageState.overview.requests.some(
						(r) => r.status === 'need_docs' || r.status === 'declined'
					))));
</script>

<svelte:head>
	<title>{t('head_title')} · FLIXARE</title>
</svelte:head>

{#if !pageState}
	<div class="flex flex-col gap-4 pb-24">
		<StatePanel
			title={t(`failure.${data.failure ?? 'unavailable'}.title`)}
			description={t(`failure.${data.failure ?? 'unavailable'}.text`)}
			tone={data.failure === 'unavailable' ? 'error' : 'warning'}
			headingLevel={1}
		/>
	</div>
{:else}
	{@const ov = pageState.overview}
	<div class="text-lms-foreground flex flex-col gap-4 pb-24" data-screen-label="10 Pengaturan Akun">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div class="flex flex-col gap-1.5">
				<span class="text-lms-link font-mono text-xs font-semibold tracking-[0.1em]"
					>{t('eyebrow')}</span
				>
				<h1 class="text-[26px] leading-[34px] font-bold">{t('title')}</h1>
				<span class="text-lms-muted text-sm">{t('subtitle')}</span>
			</div>
			<div class="flex items-center gap-2.5">
				<span
					class="bg-lms-interactive text-lms-on-interactive flex size-10 items-center justify-center overflow-hidden rounded-full bg-cover bg-center text-[13px] font-bold"
					style:background-image={photoUrl ? `url(${photoUrl})` : undefined}
					aria-hidden="true">{photoUrl ? '' : initials(ov.profile.full_name)}</span
				>
				<span class="flex flex-col">
					<span class="text-sm font-bold">{ov.profile.full_name}</span>
					<span class="text-lms-muted text-xs"
						>{ov.context.role_name} · {ov.context.tenant_name}</span
					>
				</span>
			</div>
		</div>

		<div class="flex flex-col items-start gap-4 min-[1000px]:flex-row">
			<nav
				bind:this={tabNav}
				class="bg-lms-surface border-lms-border flex w-full flex-row gap-0.5 overflow-x-auto rounded-xl border p-2 min-[1000px]:sticky min-[1000px]:top-21 min-[1000px]:w-[250px] min-[1000px]:flex-none min-[1000px]:flex-col"
				aria-label={t('title')}
			>
				{#each ACCOUNT_TABS as tab (tab)}
					{@const active = pageState.tab === tab}
					<button
						type="button"
						aria-current={active ? 'page' : undefined}
						class="lms-focus-ring flex min-h-[42px] flex-none items-center gap-2.5 rounded-lg px-3 text-start text-sm whitespace-nowrap {active
							? 'bg-lms-interactive-subtle text-lms-foreground font-bold min-[1000px]:shadow-[inset_3px_0_0_var(--color-lms-interactive)]'
							: 'text-lms-muted font-medium'}"
						onclick={() => (pageState.tab = tab)}
					>
						<span class={active ? 'text-lms-link' : ''}
							><Icon icon={TAB_ICON[tab]} size="sm" /></span
						>
						<span class="flex-1">{t(`tabs.${tab}`)}</span>
						{#if hasDot(tab)}<span
								class="bg-lms-warning-text size-2 rounded-full"
								aria-label={t('attention')}
							></span>{/if}
					</button>
				{/each}
			</nav>

			<div class="flex w-full min-w-0 flex-[1_1_auto] flex-col gap-3.5">
				{#if pageState.tab === 'profile'}
					<ProfileTab page={pageState} {photoUrl} {errorText} />
				{:else if pageState.tab === 'password'}
					<PasswordTab page={pageState} reset={data.reset} {errorText} />
				{:else if pageState.tab === 'security'}
					<SecurityTab page={pageState} {errorText} />
				{:else if pageState.tab === 'sessions'}
					<SessionsTab page={pageState} {errorText} />
				{:else if pageState.tab === 'history'}
					<HistoryTab page={pageState} />
				{:else if pageState.tab === 'notif'}
					<NotificationsTab page={pageState} {errorText} />
				{:else if pageState.tab === 'linked'}
					<LinkedTab page={pageState} {errorText} />
				{:else}
					<PrivacyTab
						page={pageState}
						exportUrl={(id) => `${exportPath}?id=${encodeURIComponent(id)}`}
						{errorText}
					/>
				{/if}
			</div>
		</div>
	</div>

	{#if confirmContent}
		<ConfirmDialog
			bind:open={
				() => pageState.confirm !== null,
				(open) => {
					if (!open) pageState.confirm = null;
				}
			}
			tone="danger"
			icon={confirmContent.icon}
			title={t(`confirm.${confirmContent.key}.title`)}
			message={t(`confirm.${confirmContent.key}.message`, confirmContent.params)}
			confirmLabel={t(`confirm.${confirmContent.key}.label`)}
			confirmIcon={Check}
			busyLabel={t('confirm.busy')}
			cancelLabel={t('confirm.cancel')}
			onconfirm={doConfirm}
		/>
	{/if}
	<Toast message={pageState.toast?.text ?? null} icon={pageState.toast?.icon} />
{/if}
