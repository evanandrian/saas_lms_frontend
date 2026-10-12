<script lang="ts">
	import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import Target from '@lucide/svelte/icons/target';
	import X from '@lucide/svelte/icons/x';
	import { useI18n } from '$lib/i18n';
	import Icon from './Icon.svelte';

	interface Props {
		/**
		 * Prefiks kunci i18n panduan halaman, mis. `help.school_admin_students`. Isi grup:
		 * `purpose` (teks), `features` / `steps` / `tips` (objek `{ "<id>": "teks" }`, urut sesuai JSON).
		 */
		topic: string;
		/** Judul halaman (sama dengan judul HeroBanner) untuk kepala dialog. */
		pageTitle: string;
	}

	let { topic, pageTitle }: Props = $props();

	const i18n = useI18n();
	const t = (key: string, params?: Record<string, string | number>) =>
		i18n.t(`common.page_help.${key}`, params);

	const titleId = $props.id();
	let dialog = $state<HTMLDialogElement | null>(null);

	const purpose = $derived(i18n.t(`${topic}.purpose`));
	const features = $derived(i18n.list(`${topic}.features`));
	const steps = $derived(i18n.list(`${topic}.steps`));
	const tips = $derived(i18n.list(`${topic}.tips`));

	function handleBackdrop(event: MouseEvent) {
		if (event.target === dialog) dialog?.close();
	}
</script>

<!-- Tombol bantuan pojok kanan atas HeroBanner (rule page-help-pattern): warna `lms-on-hero` agar kontras di kedua mode. -->
<button
	type="button"
	class="bg-lms-on-hero/8 border-lms-on-hero/14 text-lms-on-hero hover:bg-lms-on-hero/14 lms-focus-ring absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-full border md:top-4 md:right-4"
	aria-haspopup="dialog"
	aria-label={t('open', { title: pageTitle })}
	title={t('open', { title: pageTitle })}
	onclick={() => dialog?.showModal()}
>
	<Icon icon={CircleQuestionMark} size="md" />
</button>

<!-- Dialog native: fokus terkurung, Esc menutup, fokus kembali ke tombol pemicu. -->
<dialog
	bind:this={dialog}
	class="bg-lms-surface text-lms-foreground m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-140 rounded-3xl p-0 shadow-2xl backdrop:bg-(--color-lms-hero)/55 backdrop:backdrop-blur-sm"
	aria-labelledby={titleId}
	onclick={handleBackdrop}
>
	<div class="flex max-h-[85dvh] flex-col">
		<div class="border-lms-border flex items-start gap-3 border-b px-6 py-5">
			<span
				class="lms-tone-info inline-flex size-10 flex-none items-center justify-center rounded-xl"
				aria-hidden="true"
			>
				<Icon icon={CircleQuestionMark} />
			</span>
			<div class="flex min-w-0 flex-1 flex-col gap-0.5">
				<p class="text-lms-muted font-mono text-[11px] tracking-[0.08em]">{t('eyebrow')}</p>
				<h2 id={titleId} class="text-lms-h4 font-bold">{pageTitle}</h2>
			</div>
			<button
				type="button"
				class="btn-icon lms-action-ghost lms-focus-ring flex-none"
				aria-label={t('close')}
				onclick={() => dialog?.close()}
			>
				<Icon icon={X} />
			</button>
		</div>

		<div class="text-lms-body-sm flex min-h-0 flex-col gap-5 overflow-y-auto px-6 py-5">
			<section class="flex flex-col gap-2">
				<h3 class="flex items-center gap-2 font-bold">
					<Icon icon={Target} size="sm" />{t('purpose')}
				</h3>
				<p class="text-lms-muted">{purpose}</p>
			</section>

			{#if features.length}
				<section class="flex flex-col gap-2">
					<h3 class="flex items-center gap-2 font-bold">
						<Icon icon={ListChecks} size="sm" />{t('features')}
					</h3>
					<ul class="text-lms-muted flex list-disc flex-col gap-1.5 pl-5">
						{#each features as feature, index (index)}
							<li>{feature}</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if steps.length}
				<section class="flex flex-col gap-2">
					<h3 class="flex items-center gap-2 font-bold">
						<Icon icon={ListOrdered} size="sm" />{t('steps')}
					</h3>
					<ol class="flex flex-col gap-2">
						{#each steps as step, index (index)}
							<li class="flex gap-3">
								<span
									class="bg-lms-interactive-subtle text-lms-interactive inline-flex size-6 flex-none items-center justify-center rounded-full text-xs font-bold"
									aria-hidden="true">{index + 1}</span
								>
								<span class="text-lms-muted pt-0.5">{step}</span>
							</li>
						{/each}
					</ol>
				</section>
			{/if}

			{#if tips.length}
				<section class="lms-tone-warning flex flex-col gap-2 rounded-xl px-4 py-3">
					<h3 class="flex items-center gap-2 font-bold">
						<Icon icon={Lightbulb} size="sm" />{t('tips')}
					</h3>
					<ul class="flex list-disc flex-col gap-1.5 pl-5">
						{#each tips as tip, index (index)}
							<li>{tip}</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	</div>
</dialog>
