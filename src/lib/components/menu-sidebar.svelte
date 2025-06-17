<script lang="ts">
	import { client } from '$lib/link';
	import { createQuery } from '@tanstack/svelte-query';
	import clsx from 'clsx';
	import { page } from '$app/state';
	import { HashIcon, InboxIcon, MoreVerticalIcon, PlusIcon, SearchIcon } from 'lucide-svelte';
	import { appStore } from '$lib/store/app.svelte';
	import { authClient, signIn } from '$lib/auth-client';

	const currentSpaceId = $derived(page.params.spaceId);

	const spacesQuery = createQuery({
		queryKey: ['spaces'],
		queryFn: () => client.spaces.list()
	});

	const sessionQuery = createQuery({
		queryKey: ['session'],
		queryFn: () => authClient.multiSession.listDeviceSessions()
	});

	function toggleCommandMenu() {
		appStore.commandMenuOpen = !appStore.commandMenuOpen;
	}

	async function activateSession(sessionToken: string) {
		await authClient.multiSession.setActive({
			sessionToken
		});
		window.location.reload();
	}

	$effect(() => {
		console.log($sessionQuery.data);
	});
</script>

<div class="flex flex-1 flex-col gap-2 p-2">
	<div class="flex justify-between">
		{#if !$sessionQuery.data?.error}
			<div class="flex w-full gap-1">
				{#each $sessionQuery.data?.data ?? [] as session}
					<button
						class="btn btn-sm btn-square btn-ghost"
						onclick={() => activateSession(session.session.token)}
					>
						<img src={session.user?.image} class="h-full w-full rounded" />
					</button>
				{/each}
				<button class="btn btn-sm btn-square" onclick={signIn}>
					<PlusIcon size={16} />
				</button>
			</div>
		{/if}
		<button class="btn btn-sm btn-square btn-ghost">
			<MoreVerticalIcon size={16} />
		</button>
	</div>
	<button class="input input-sm" onclick={toggleCommandMenu}>
		<SearchIcon size={16} />
		<span class="flex-1 text-left">Search</span>
		<kbd class="kbd kbd-sm">⌘K</kbd>
	</button>
	<a href="/inbox" class="btn btn-sm btn-ghost justify-start">
		<InboxIcon size={16} />
		<span>Inbox</span>
	</a>
	<h2 class="text-xs font-semibold">Spaces</h2>
	<div class="flex flex-col">
		{#if $spacesQuery.isLoading}
			<div class="skeleton h-6 w-full"></div>
			<div class="skeleton mt-1 h-6 w-full"></div>
			<div class="skeleton mt-1 h-6 w-full"></div>
		{:else}
			{#each $spacesQuery.data ?? [] as space}
				{@const spaceId = space.name?.split('/')[1]}
				<a
					href={'/spaces/' + spaceId}
					class={clsx('btn btn-sm justify-start', spaceId !== currentSpaceId && 'btn-ghost')}
				>
					<HashIcon size={16} />
					<span>{space.displayName}</span>
				</a>
			{/each}
		{/if}
	</div>
</div>
