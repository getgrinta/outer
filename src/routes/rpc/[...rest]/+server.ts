import { RPCHandler } from '@orpc/server/fetch';
import type { RequestHandler } from './$types';
import { router } from '$lib/server/rpc';
import { auth } from '$lib/auth';
import { db } from '$lib/server/db';

const handler = new RPCHandler(router);

const handle: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	const { response } = await handler.handle(request, {
		prefix: '/rpc',
		context: { session: session?.session, user: session?.user, headers: request.headers, db }
	});

	return response ?? new Response('Not Found', { status: 404 });
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
