import { loadTenantBilling, tenantBillingActions } from '$lib/features/invoices/invoices.server';
import type { Actions, PageServerLoad } from './$types';

/** Tagihan lembaga (area school_admin): invoice terbit, bayar VA/QRIS atau kirim bukti transfer, cetak. */
const AREA = 'school_admin';

export const load: PageServerLoad = (event) => loadTenantBilling(event, AREA);

export const actions: Actions = tenantBillingActions(AREA);
