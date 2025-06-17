<script lang="ts">
	import '../app.css';
	import '@fontsource/archivo/400.css';
	import '@fontsource/archivo/600.css';
	import '@fontsource/archivo/800.css';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';

	const queryClient = new QueryClient();

	let { children } = $props();
</script>

<svelte:head>
	<title>Outer</title>
</svelte:head>

<QueryClientProvider client={queryClient}>
	{@render children()}
</QueryClientProvider>
