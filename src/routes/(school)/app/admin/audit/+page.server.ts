import { fetchAudit } from '$lib/features/school-admin/school-admin.api';
import { auditActions, loadView } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

/** Riwayat perubahan tenant (hapus/nonaktifkan orang, undangan akun, rapor); terbaru dulu. */
export const load: PageServerLoad = (event) => loadView(event, (ctx) => fetchAudit(ctx, {}));

export const actions: Actions = auditActions;
