<script lang="ts">
	import { resolve } from '$app/paths';
	import type { SchoolActivationCode } from '$lib/api/generated/lms';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import Copy from '@lucide/svelte/icons/copy';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import { PREFIX } from '../school-admin.model';

	interface Props {
		codes: readonly SchoolActivationCode[];
	}
	let { codes }: Props = $props();

	const i18n = useI18n();
	let copied = $state(false);

	async function copyAll() {
		const url = `${location.origin}${resolve(APP_PATHS.ACTIVATE)}`;
		const text = codes.map((c) => `${c.name}\t${c.username}\t${c.code}`).join('\n');
		try {
			await navigator.clipboard.writeText(
				`${i18n.t(`${PREFIX}.codes.copy_header`, { url })}\n${text}`
			);
			copied = true;
		} catch {
			copied = false;
		}
	}
</script>

<!-- Kode aktivasi murid tanpa email: tampil sekali setelah undangan, dibagikan wali kelas/admin. -->
<div class="border-lms-border flex flex-col rounded-xl border">
	<div
		class="lms-tone-warning flex flex-wrap items-center gap-2 rounded-t-xl px-4 py-3 text-[13px]"
	>
		<Icon icon={KeyRound} size="sm" />
		<span class="flex-[1_1_260px]"
			><strong>{i18n.t(`${PREFIX}.codes.title`, { count: codes.length })}</strong>
			{i18n.t(`${PREFIX}.codes.note`, { path: resolve(APP_PATHS.ACTIVATE) })}</span
		>
		<button
			type="button"
			class="lms-action-secondary lms-focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
			onclick={copyAll}
			><Icon icon={Copy} size="sm" />{copied
				? i18n.t(`${PREFIX}.codes.copied`)
				: i18n.t(`${PREFIX}.codes.copy`)}</button
		>
	</div>
	<div class="max-h-64 overflow-auto">
		<table class="w-full text-left text-[13px]">
			<thead>
				<tr class="text-lms-muted font-mono text-[10px] tracking-[0.1em]">
					<th class="px-4 py-2">{i18n.t(`${PREFIX}.codes.name`)}</th>
					<th class="px-4 py-2">{i18n.t(`${PREFIX}.codes.username`)}</th>
					<th class="px-4 py-2">{i18n.t(`${PREFIX}.codes.code`)}</th>
				</tr>
			</thead>
			<tbody>
				{#each codes as c (c.username)}
					<tr class="border-lms-border border-t">
						<td class="px-4 py-2 font-semibold">{c.name}</td>
						<td class="px-4 py-2 font-mono text-xs">{c.username}</td>
						<td class="px-4 py-2 font-mono text-sm font-bold tracking-[0.15em]">{c.code}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
