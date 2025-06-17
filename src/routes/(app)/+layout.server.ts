import type { LayoutServerLoad } from './$types';
import { auth } from '$lib/auth';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = ({ request }) => {
	const session = auth.api.getSession(request);
	if (!session) {
		return redirect(302, '/sign-in');
	}
};
