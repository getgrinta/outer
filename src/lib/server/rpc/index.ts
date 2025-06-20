import { os, EventPublisher } from '@orpc/server';
import * as GoogleChat from '@googleapis/chat';
import * as GooglePeople from '@googleapis/people';
import { ResultAsync } from 'neverthrow';
import type { Session, User } from 'better-auth';
import type { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { schema } from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';
import z from 'zod';

const publisher = new EventPublisher<Record<string, { message: any }>>();

function getOauthClient(credentials: { accessToken: string; refreshToken: string }) {
	const auth = new GoogleChat.auth.OAuth2({
		clientSecret: env.GOOGLE_CLIENT_SECRET as string,
		clientId: env.GOOGLE_CLIENT_ID as string
	});
	auth.setCredentials({
		access_token: credentials.accessToken,
		refresh_token: credentials.refreshToken
	});
	return auth;
}

async function getChatClient(credentials: { accessToken: string; refreshToken: string }) {
	const auth = getOauthClient(credentials);
	return GoogleChat.chat({ version: 'v1', auth });
}

async function getPeopleClient(credentials: { accessToken: string; refreshToken: string }) {
	const auth = getOauthClient(credentials);
	return GooglePeople.people({ version: 'v1', auth });
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
	const peopleClient = await getPeopleClient({
		accessToken: account.accessToken,
		refreshToken: account.refreshToken
	});
	const result = await next({ context: { account, chatClient, peopleClient } });
	return result;
});

const listSpaces = base.use(authMiddleware).handler(async ({ context }) => {
	const spacesResult = await ResultAsync.fromPromise(
		context.chatClient.spaces.list({
			filter: `space_type = "SPACE" OR spaceType = "DIRECT_MESSAGE"`
		}),
		(e) => e
	);
	const spaces = spacesResult.unwrapOr({ data: { spaces: [] } }).data.spaces ?? [];
	const dms = spaces.filter((space) => space.type === 'DM' || !space.displayName) ?? [];
	const rooms = spaces.filter((space) => space.type === 'ROOM' && space.displayName) ?? [];
	const dmsWithDisplayName = await Promise.all(
		dms.map(async (dm) => {
			console.log('>>>DM', dm);
			const spaceMembershipsResult = await ResultAsync.fromPromise(
				context.chatClient.spaces.members.list({ parent: dm.name ?? '' }),
				(e) => e
			);
			const spaceMemberships =
				spaceMembershipsResult.unwrapOr({ data: { memberships: [] } }).data.memberships ?? [];
			const memberIds = spaceMemberships
				.map((membership) => membership.member?.name ?? '')
				.filter(Boolean)
				.map((id) => id.replace('users/', 'members/'));
			const memberDetails = await Promise.all(
				memberIds.map(async (id) => {
					const name = `${dm.name}/${id}`;
					console.log('>>>NAME', name);
					// const memberDetailsResult = await ResultAsync.fromPromise(context.peopleClient.people.get({ resourceName: id, personFields: 'names' }), (e) => e)
					const memberDetailsResult = await ResultAsync.fromPromise(
						context.chatClient.spaces.members.get({ name }),
						(e) => e
					);
					return memberDetailsResult.unwrapOr({ data: null }).data;
				})
			);
			console.log('>>>MEMBER DETAILS', JSON.stringify(memberDetails, null, 2));
			// const peopleResult = await ResultAsync.fromPromise(context.peopleClient.people.listDirectoryPeople({ sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE'], readMask: 'names' }), (e) => e)
			// const people = peopleResult.unwrapOr({ data: { people: [] } }).data.people ?? []
			// console.log('>>>PEOPLE', JSON.stringify(people, null, 2))
			// const peopleWithDisplayName = people.map((person) => {
			// 	const displayName = person.names?.[0]?.displayName
			// 	return {
			// 		...person,
			// 		displayName
			// 	}
			// })
			return dm;
		})
	);
	return {
		dms: dmsWithDisplayName,
		rooms
	};
	// const directoryPeopleResult = await ResultAsync.fromPromise(context.peopleClient.people.listDirectoryPeople({ sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT'], readMask: 'names' }), (e) => e);
	// const directoryPeople = directoryPeopleResult.unwrapOr({ data: { people: [] } }).data.people ?? [];
	// console.log(directoryPeople)
	// const resourceNames = ["people/me", ...spaces.map((space) => space.name)]
	// const peopleResult = await ResultAsync.fromPromise(
	// 	context.peopleClient.people.getBatchGet({
	// 		resourceNames,
	// 		personFields: 'names'
	// 	}),
	// 	(e) => e
	// );
	// return peopleResult.unwrapOr({ data: { responses: [] } }).data.responses ?? [];
	return {
		dms: dmsWithDisplayName,
		rooms
	};
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

const getMembers = base
	.use(authMiddleware)
	.input(z.object({ spaceId: z.string() }))
	.handler(async ({ input, context }) => {
		const spacesResult = await ResultAsync.fromPromise(
			context.chatClient.spaces.members.list({ parent: 'spaces/' + input.spaceId }),
			(e) => e
		);
		return spacesResult.unwrapOr({ data: { memberships: [] } }).data.memberships ?? [];
	});

const listPeople = base
	.use(authMiddleware)
	.input(z.object({ peopleIds: z.array(z.string()) }))
	.handler(async ({ input, context }) => {
		const resourceNames = [
			'people/me',
			...connections.map((connection) => connection.resourceName)
		];
		const peopleResult = await ResultAsync.fromPromise(
			context.peopleClient.people.getBatchGet({
				resourceNames,
				personFields: 'names'
			}),
			(e) => e
		);
		return peopleResult.unwrapOr({ data: { responses: [] } }).data.responses ?? [];
	});

export const router = {
	spaces: {
		list: listSpaces,
		info: spaceInfo,
		onMessage,
		sendMessage,
		members: getMembers
	},
	people: {
		list: listPeople
	}
};
