import { proxyRegistrationFile } from '$lib/features/registration/registration.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => proxyRegistrationFile(event);
