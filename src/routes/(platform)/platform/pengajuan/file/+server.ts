import { proxyApplicationFile } from '$lib/features/tenant-applications/tenant-applications.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => proxyApplicationFile(event);
