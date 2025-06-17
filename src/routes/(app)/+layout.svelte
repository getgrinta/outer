<script lang="ts">
	import CommandMenu from '$lib/components/command-menu.svelte';
	import MenuSidebar from '$lib/components/menu-sidebar.svelte';
	import { appStore } from '$lib/store/app.svelte';
	import { shortcut } from '@svelte-put/shortcut';

	let { children } = $props();

	function handleK() {
		appStore.commandMenuOpen = !appStore.commandMenuOpen;
	}
</script>

<svelte:window
	use:shortcut={{
		trigger: {
			key: 'k',
			modifier: ['ctrl', 'meta'],
			callback: handleK
		}
	}}
/>

{#if appStore.commandMenuOpen}
	<CommandMenu />
{/if}

<div class="bg-base-300 flex min-h-screen">
	<MenuSidebar />
	<div class="bg-base-100 flex min-h-screen flex-4 flex-col rounded-l-xl lg:flex-5 xl:flex-6">
		{@render children()}
	</div>
</div>
