import { os, EventPublisher } from '@orpc/server';
import * as GoogleChat from '@googleapis/chat';
import { ResultAsync } from 'neverthrow';
import type { Session, User } from 'better-auth';
import { type db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { schema } from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';
import z from 'zod';

const publisher = new EventPublisher<Record<string, { message: any }>>();

async function getChatClient(credentials: { accessToken: string; refreshToken: string }) {
	const chatAuth = new GoogleChat.auth.OAuth2({
		clientSecret: env.GOOGLE_CLIENT_SECRET as string,
		clientId: env.GOOGLE_CLIENT_ID as string
	});
	chatAuth.setCredentials({
		access_token: credentials.accessToken,
		refresh_token: credentials.refreshToken
	});
	return GoogleChat.chat({ version: 'v1', auth: chatAuth });
}

const base = os
	.$context<{
		session: Session | undefined;
		user: User | undefined;
		headers: Headers;
		db: typeof db;
	}>()
	.errors({
		UNAUTHORIZED: {},
		FORBIDDEN: {},
		NOT_FOUND: {},
		BAD_REQUEST: {},
		INTERNAL_SERVER_ERROR: {}
	});

const authMiddleware = base.middleware(async ({ context, errors, next }) => {
	const userId = context.user?.id;
	if (!userId) throw errors.UNAUTHORIZED();
	const account = await context.db.query.account.findFirst({
		where: eq(schema.account.userId, userId)
	});
	if (!account) throw errors.NOT_FOUND();
	if (!account.accessToken || !account.refreshToken) throw errors.FORBIDDEN();
	const chatClient = await getChatClient({
		accessToken: account.accessToken,
		refreshToken: account.refreshToken
	});
	const result = await next({ context: { account, chatClient } });
	return result;
});

const listSpaces = base.use(authMiddleware).handler(async ({ context }) => {
	const spacesResult = await ResultAsync.fromPromise(context.chatClient.spaces.list(), (e) => e);
	const spaces = spacesResult.unwrapOr({ data: { spaces: [] } }).data.spaces ?? [];
	return spaces.filter((space) => space.displayName);
});

const spaceInfo = base
	.use(authMiddleware)
	.input(z.object({ spaceId: z.string() }))
	.handler(async ({ context, input }) => {
		const spacesResult = await ResultAsync.fromPromise(
			context.chatClient.spaces.get({ name: 'spaces/' + input.spaceId }),
			(e) => e
		);
		const messagesResult = await ResultAsync.fromPromise(
			context.chatClient.spaces.messages.list({ parent: 'spaces/' + input.spaceId }),
			(e) => e
		);
		return {
			space: spacesResult.unwrapOr({ data: null }).data,
			messages: messagesResult.unwrapOr({ data: { messages: [] } }).data.messages ?? []
		};
	});

const onMessage = base
	.use(authMiddleware)
	.input(z.object({ spaceId: z.string() }))
	.handler(async function* ({ input, signal }) {
		for await (const payload of publisher.subscribe(input.spaceId, { signal })) {
			yield payload.message;
		}
	});

const sendMessage = base
	.use(authMiddleware)
	.input(z.object({ spaceId: z.string(), message: z.any() }))
	.handler(async ({ input, context, errors }) => {
		const spacesResult = await ResultAsync.fromPromise(
			context.chatClient.spaces.messages.create({
				parent: 'spaces/' + input.spaceId,
				requestBody: { text: input.message }
			}),
			(e) => e
		);
		if (spacesResult.isErr()) throw errors.INTERNAL_SERVER_ERROR();
		const message = spacesResult.unwrapOr({ data: {} }).data;
		publisher.publish(input.spaceId, { message });
	});

export const router = {
	spaces: {
		list: listSpaces,
		info: spaceInfo,
		onMessage,
		sendMessage
	}
};
