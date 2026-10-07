<script lang="ts">
	import logogram from '$lib/assets/brand/flixare-logogram-color.png';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import Check from '@lucide/svelte/icons/check';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import FileQuestion from '@lucide/svelte/icons/file-question';
	import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
	import TicketIcon from '@lucide/svelte/icons/ticket';
	import UserCheck from '@lucide/svelte/icons/user-check';
	import type { LucideIcon } from '@lucide/svelte';
	import type { RegistrationWizard } from '../../registration.state.svelte';

	interface Props {
		wizard: RegistrationWizard;
	}

	let { wizard }: Props = $props();
	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`register.${key}`, params);
	const locale = $derived(i18n.locale === 'en' ? 'en-US' : 'id-ID');
	const trial = $derived(Boolean(wizard.server?.application?.trial));
	const planName = $derived(
		wizard.server?.application?.quote?.plan_name ?? wizard.plan?.name ?? ''
	);
	const stats = $derived(
		wizard.type === 'school'
			? [
					{ n: wizard.rombel, label: t('done.rombel') },
					{ n: wizard.enabledSubjects.length, label: t('done.subjects') },
					{ n: 0, label: t('done.teachers') },
					{ n: 0, label: t('done.students') }
				]
			: wizard.type === 'personal'
				? [
						{ n: wizard.rombel, label: t('done.groups') },
						{ n: 0, label: t('done.students') },
						{ n: trial ? t('done.trial_24h') : '—', label: t('done.trial_left') }
					]
				: [
						{ n: planName, label: t('done.plan') },
						{ n: wizard.participants || '—', label: t('done.participants') }
					]
	);
	const NEXT: Record<string, { icon: LucideIcon; key: string }[]> = {
		school: [
			{ icon: UserCheck, key: 'homeroom' },
			{ icon: HeartHandshake, key: 'parents' },
			{ icon: CalendarClock, key: 'schedule' }
		],
		personal: [
			{ icon: BookOpen, key: 'material' },
			{ icon: ClipboardList, key: 'task' }
		],
		event: [
			{ icon: FileQuestion, key: 'bank' },
			{ icon: TicketIcon, key: 'session' }
		]
	};
</script>

<section class="lms-hero relative flex flex-col gap-5 overflow-hidden rounded-[22px] p-5.5 md:p-8">
	<img
		src={logogram}
		alt=""
		aria-hidden="true"
		class="pointer-events-none absolute -right-15 -bottom-22.5 w-80 max-w-none opacity-7 select-none"
	/>
	<div class="relative flex items-center gap-3.5">
		<span class="bg-lms-progress flex size-13 items-center justify-center rounded-full"
			><Icon icon={Check} /></span
		>
		<span class="flex flex-col gap-0.5">
			<span class="text-lms-on-hero-muted text-[0.8125rem]"
				>{t(`done.meta_${wizard.type}`, { plan: planName })} · {trial
					? t('done.trial_active')
					: t('done.subscription_active')}</span
			>
			<span class="text-[1.375rem] font-bold">{wizard.institutionName}</span>
		</span>
	</div>
	<div class="relative grid grid-cols-[repeat(auto-fit,minmax(9.375rem,1fr))] gap-2.5">
		{#each stats as s (s.label)}
			<div
				class="bg-lms-on-hero/7 border-lms-on-hero/14 flex flex-col gap-0.5 rounded-[14px] border p-3.5"
			>
				<span class="text-2xl font-bold tabular-nums"
					>{typeof s.n === 'number' ? s.n.toLocaleString(locale) : s.n}</span
				>
				<span class="text-lms-on-hero-muted text-xs">{s.label}</span>
			</div>
		{/each}
	</div>
</section>
<section class="lms-card flex flex-col gap-1 rounded-[14px]! p-5 shadow-none!">
	<h2 class="mb-2 text-[0.9375rem] font-bold">{t('done.next_title')}</h2>
	{#each NEXT[wizard.type] ?? [] as n (n.key)}
		<div class="border-lms-border flex items-center gap-3 border-t py-2.5">
			<span class="text-lms-interactive"><Icon icon={n.icon} /></span>
			<span class="flex flex-1 flex-col gap-px">
				<span class="text-sm font-semibold">{t(`done.next_${n.key}`)}</span>
				<span class="text-lms-muted text-xs">{t(`done.next_${n.key}_sub`)}</span>
			</span>
		</div>
	{/each}
</section>
