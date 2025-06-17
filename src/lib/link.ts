import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { type RouterClient } from '@orpc/server';
import type { router } from './server/rpc';

const link = new RPCLink({
	url: 'http://localhost:5173/rpc'
});

export const client: RouterClient<typeof router> = createORPCClient(link);
