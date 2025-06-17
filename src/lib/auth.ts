import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { multiSession } from 'better-auth/plugins';
import { db } from './server/db';
import { env } from '$env/dynamic/private';
import { SCOPES } from './const';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'sqlite'
	}),
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID as string,
			clientSecret: env.GOOGLE_CLIENT_SECRET as string,
			scope: SCOPES,
			accessType: 'offline',
			prompt: 'consent'
		}
	},
	plugins: [multiSession()]
});
