import { createAuthClient } from 'better-auth/client';
import { multiSessionClient } from 'better-auth/client/plugins';
import { SCOPES } from './const';

export const authClient = createAuthClient({
	plugins: [multiSessionClient()]
});

export async function signIn() {
	return authClient.signIn.social({
		provider: 'google',
		scopes: SCOPES
	});
}
