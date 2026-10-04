<script lang="ts">
	import { resolve } from '$app/paths';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import PageContainer from '$lib/components/layout/PageContainer.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { useI18n } from '$lib/i18n';
	import { APP_PATHS } from '$lib/utils/app-paths';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
	import School from '@lucide/svelte/icons/school';
	import Users from '@lucide/svelte/icons/users';

	const i18n = useI18n();

	// Sementara (BLOCKED-02): kelak `/app` mengarahkan ke area sesuai role di sesi pengguna.
	const areas = $derived([
		{ href: resolve(APP_PATHS.SCHOOL_ADMIN_HOME), label: i18n.t('school.app.admin'), icon: School },
		{ href: resolve(APP_PATHS.TEACHER_HOME), label: i18n.t('school.app.teacher'), icon: Users },
		{
			href: resolve(APP_PATHS.STUDENT_HOME),
			label: i18n.t('school.app.student'),
			icon: GraduationCap
		},
		{
			href: resolve(APP_PATHS.GUARDIAN_HOME),
			label: i18n.t('school.app.guardian'),
			icon: HeartHandshake
		}
	]);
</script>

<AppShell>
	<PageContainer heading={i18n.t('school.app.title')} width="full">
		<p class="lms-text-helper max-w-prose">{i18n.t('school.app.description')}</p>
		<ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			{#each areas as area (area.href)}
				<li>
					<a
						href={area.href}
						class="lms-card lms-focus-ring hover:border-lms-interactive flex items-center gap-3 p-4"
					>
						<span
							class="lms-tone-info inline-flex size-10 items-center justify-center rounded-base"
						>
							<Icon icon={area.icon} />
						</span>
						<span class="flex-1 font-semibold">{area.label}</span>
						<Icon icon={ChevronRight} size="sm" />
					</a>
				</li>
			{/each}
		</ul>
	</PageContainer>
</AppShell>
