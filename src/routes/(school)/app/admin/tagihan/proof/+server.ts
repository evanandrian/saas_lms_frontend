import { proxyTenantProof } from '$lib/features/invoices/invoices.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => proxyTenantProof(event, 'school_admin');
