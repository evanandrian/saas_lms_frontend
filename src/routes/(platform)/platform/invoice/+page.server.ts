import { invoiceConsoleActions, loadInvoiceConsole } from '$lib/features/invoices/invoices.server';
import type { Actions, PageServerLoad } from './$types';

/** Invoice konsol platform (referensi "04e Invoice"); data & aksi dari backend (`?id=` = invoice terpilih). */
export const load: PageServerLoad = (event) => loadInvoiceConsole(event);

export const actions: Actions = invoiceConsoleActions;
