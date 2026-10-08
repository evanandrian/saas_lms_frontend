import { loadPaymentConsole, paymentConsoleActions } from '$lib/features/payments/payments.server';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => loadPaymentConsole(event);

export const actions: Actions = paymentConsoleActions;
