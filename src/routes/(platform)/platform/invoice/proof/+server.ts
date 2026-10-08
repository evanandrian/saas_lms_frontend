import { proxyPlatformProof } from '$lib/features/invoices/invoices.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => proxyPlatformProof(event);
