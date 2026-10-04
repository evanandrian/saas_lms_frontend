import { assertHostKind } from '$lib/utils/host-context';
import type { LayoutServerLoad } from './$types';

// Peserta tamu sesi ujian di host tenant (SAD F11). Route `s/[sessionCode]` ditunda sampai
// format kode sesi tersedia di kontrak OpenAPI (BLOCKED-01).
export const load: LayoutServerLoad = ({ locals }) => {
	assertHostKind(locals.host, ['tenant', 'unified']);
};
