<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import FileCheck from '@lucide/svelte/icons/file-check';
	import IdCard from '@lucide/svelte/icons/id-card';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import UserPen from '@lucide/svelte/icons/user-pen';
	import type { AccountPageState } from '../account.state.svelte';
	import {
		REQUEST_TONE,
		daysLeft,
		docsRequestedBy,
		hoursLeft,
		isDecided,
		readDocument,
		type RequestView
	} from '../account.requests';
	import RequestUpload from './RequestUpload.svelte';
	import { card } from './styles';

	interface Props {
		page: AccountPageState;
		errorText: (code: string) => string;
	}

	let { page, errorText }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`account.requests.${key}`, params);

	let busyId = $state<string | null>(null);
	const approver = $derived(i18n.t(`account.approver.${page.overview.context.approver}`));

	const field = (r: RequestView) =>
		r.kind === 'name'
			? i18n.t('account.profile.full_name')
			: i18n.t(`account.identity.${r.identity_kind || page.overview.context.identity_kind}.label`);

	function sub(r: RequestView): string {
		if (r.status === 'pending') {
			const left = hoursLeft(r, page.now);
			return t('pending_sub', {
				approver,
				deadline: left > 0 ? t('deadline_days', { days: daysLeft(left) }) : t('deadline_over')
			});
		}
		if (r.status === 'need_docs') {
			return t('docs_sub', {
				who: docsRequestedBy(r) || approver,
				docs: r.docs_requested.join(', '),
				note: r.docs_note ? ` · "${r.docs_note}"` : ''
			});
		}
		if (r.status === 'approved') return t('approved_sub', { who: r.decided_by });
		return t('declined_sub', { who: r.decided_by, reason: r.decision_note });
	}

	async function act(r: RequestView) {
		if (busyId) return;
		busyId = r.id;
		const decided = isDecided(r);
		const outcome = await page.run(decided ? 'requestDismiss' : 'requestCancel', { id: r.id });
		busyId = null;
		if (!outcome.ok) page.say(errorText(outcome.code), CircleX);
		else if (!decided) page.say(t('cancelled'), Undo2);
	}

	async function upload(r: RequestView, file: File) {
		const read = await readDocument(file);
		if (!read.ok) {
			page.say(t(`upload_${read.reason}`), CircleX);
			return;
		}
		busyId = r.id;
		const outcome = await page.run('requestUpload', { id: r.id, file: read.file });
		busyId = null;
		if (outcome.ok) page.say(t('uploaded'), FileCheck);
		else page.say(errorText(outcome.code), CircleX);
	}
</script>

{#if page.overview.requests.length}
	<section class="{card} gap-1 px-5 py-4">
		<h2 class="mb-1.5 text-[15px] font-bold">{t('title')}</h2>
		{#each page.overview.requests as r (r.id)}
			<div class="border-lms-border flex flex-wrap items-center gap-3 border-t py-3">
				<span
					class="flex size-[34px] flex-none items-center justify-center rounded-lg {REQUEST_TONE[
						r.status
					]}"><Icon icon={r.kind === 'name' ? UserPen : IdCard} size="sm" /></span
				>
				<span class="flex min-w-0 flex-[1_1_240px] flex-col gap-[3px]">
					<span class="text-sm font-semibold">{field(r)}: "{r.from}" → "{r.to}"</span>
					<span
						class="text-xs leading-[18px] {r.status === 'declined'
							? 'text-lms-danger-text'
							: 'text-lms-muted'}">{sub(r)}</span
					>
				</span>
				<span
					class="rounded-full px-[9px] py-[3px] text-[11px] font-bold whitespace-nowrap {REQUEST_TONE[
						r.status
					]}">{t(`chip.${r.status}`)}</span
				>
				<div class="flex flex-wrap gap-2">
					{#if r.status === 'need_docs'}
						<RequestUpload
							label={t('upload')}
							busy={busyId === r.id}
							onfile={(file) => upload(r, file)}
						/>
					{/if}
					<button
						type="button"
						class="lms-focus-ring border-lms-border-strong bg-lms-surface h-[34px] rounded-lg border px-3 text-xs font-semibold"
						disabled={busyId === r.id}
						onclick={() => act(r)}>{isDecided(r) ? t('close') : t('cancel')}</button
					>
				</div>
			</div>
		{/each}
	</section>
{/if}
