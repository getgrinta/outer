<script lang="ts">
	import { authClient, signIn } from '$lib/auth-client';
	import { onMount } from 'svelte';

	onMount(() => {
		authClient.getSession().then((session) => {
			console.log('>>>S', session);
		});
	});
</script>

<button onclick={signIn}>Sign in with Google</button>
