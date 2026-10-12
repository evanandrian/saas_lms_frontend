import { clusterConsoleActions, loadClusterConsole } from '$lib/features/clusters/clusters.server';
import type { Actions, PageServerLoad } from './$types';

/** Cluster DB (referensi "04g Cluster DB"); cluster, region, uji koneksi & simpan lewat backend. */
export const load: PageServerLoad = (event) => loadClusterConsole(event);

export const actions: Actions = clusterConsoleActions;
