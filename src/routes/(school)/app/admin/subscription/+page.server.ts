import { fetchSubscription } from '$lib/features/school-admin/school-admin.api';
import { loadView, subscriptionActions } from '$lib/features/school-admin/school-admin.server';
import type { Actions, PageServerLoad } from './$types';

/** 05h Langganan: paket, kursi murid, tambah kursi prorata (SAD F12), dan daftar tagihan. */
export const load: PageServerLoad = (event) => loadView(event, fetchSubscription);

export const actions: Actions = subscriptionActions;
