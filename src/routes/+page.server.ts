import { auth } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request }) => {
	const session = await auth.api.getSession(request);
	if (session) {
		return redirect(302, '/inbox');
	}
	return redirect(302, '/sign-in');
};
