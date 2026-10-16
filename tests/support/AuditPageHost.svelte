<script lang="ts">
	import Page from '../../src/routes/(school)/app/admin/audit/+page.svelte';
	import { setI18n } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import type { SchoolAuditView } from '$lib/features/school-admin/school-admin.types';

	let { locale, view }: { locale: Locale; view: SchoolAuditView } = $props();
	setI18n(() => locale);
</script>

<Page data={{ view, failure: '' } as never} params={{}} form={null} />
