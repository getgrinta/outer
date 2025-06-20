import type { LayoutServerLoad } from './$types';
import { auth } from '$lib/auth';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ request }) => {
	const session = await auth.api.getSession(request);
	if (!session?.user) {
		return redirect(302, '/sign-in');
	}
};
