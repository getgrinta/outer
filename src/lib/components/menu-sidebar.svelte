<script lang="ts">
	import { client } from '$lib/link';
	import { createQuery } from '@tanstack/svelte-query';
	import clsx from 'clsx';
	import { page } from '$app/state';
	import {
		HashIcon,
		InboxIcon,
		LogOutIcon,
		MoreVerticalIcon,
		PlusIcon,
		SearchIcon
	} from 'lucide-svelte';
	import { appStore } from '$lib/store/app.svelte';
	import { authClient, signIn } from '$lib/auth-client';
	import { sortBy } from 'rambda';
	import type * as GoogleChat from '@googleapis/chat';

	const currentSpaceId = $derived(page.params.spaceId);

	const spacesQuery = createQuery({
		queryKey: ['spaces'],
		queryFn: () => client.spaces.list()
	});

	const spaces = $derived(
		sortBy((space: GoogleChat.chat_v1.Schema$Space) => space.displayName ?? '')(
			$spacesQuery.data?.rooms ?? []
		)
	);
	const directMessages = $derived(
		sortBy((space: GoogleChat.chat_v1.Schema$Space) => new Date(space.lastActiveTime ?? ''))(
			$spacesQuery.data?.dms ?? []
		).reverse()
	);

	const sessionQuery = createQuery({
		queryKey: ['session'],
		queryFn: () => authClient.multiSession.listDeviceSessions()
	});

	const peopleQuery = createQuery({
		queryKey: ['people'],
		queryFn: () => client.people.list({ peopleIds: [] })
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
		console.log('>>>SPA', $spacesQuery.data);
	});

	async function signOut() {
		await authClient.signOut();
		window.location.reload();
	}
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
		<div class="dropdown dropdown-end">
			<div tabindex="0" role="button" class="btn btn-sm btn-square btn-ghost">
				<MoreVerticalIcon size={16} />
			</div>
			<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-1 w-40 p-1 shadow-sm">
				<li>
					<button onclick={signOut}>
						<LogOutIcon size={16} />
						<span>Sign Out</span>
					</button>
				</li>
			</ul>
		</div>
	</div>
	<button class="input input-sm" onclick={toggleCommandMenu}>
		<SearchIcon size={16} />
		<span class="flex-1 text-left">Search</span>
		<kbd class="kbd kbd-sm">⌘K</kbd>
	</button>
	<a
		href="/inbox"
		class={clsx(
			'btn btn-sm justify-start',
			page.url.pathname !== '/inbox' && 'btn-ghost text-base-content/50'
		)}
	>
		<InboxIcon size={16} />
		<span>Inbox</span>
	</a>
	<h2 class="text-base-content/50 text-xs font-semibold">Spaces</h2>
	<div class="flex flex-col">
		{#if $spacesQuery.isLoading}
			<div class="skeleton h-6 w-full"></div>
			<div class="skeleton mt-1 h-6 w-full"></div>
			<div class="skeleton mt-1 h-6 w-full"></div>
		{:else}
			{#each spaces as space}
				{@const spaceId = space.name?.split('/')[1]}
				<a
					href={'/spaces/' + spaceId}
					class={clsx(
						'btn btn-sm justify-start',
						spaceId !== currentSpaceId && 'btn-ghost text-base-content/50'
					)}
				>
					<HashIcon size={16} />
					<span>{space.displayName}</span>
				</a>
			{/each}
		{/if}
	</div>
	<h2 class="text-base-content/50 text-xs font-semibold">Direct Messages</h2>
	<div class="flex flex-col">
		{#if $spacesQuery.isLoading}
			<div class="skeleton h-6 w-full"></div>
			<div class="skeleton mt-1 h-6 w-full"></div>
		{:else}
			{#each directMessages as dm}
				{@const spaceId = dm.name?.split('/')[1]}
				<a
					href={'/spaces/' + spaceId}
					class={clsx(
						'btn btn-sm justify-start',
						spaceId !== currentSpaceId && 'btn-ghost text-base-content/50'
					)}
				>
					<HashIcon size={16} />
					<span>{dm.displayName}</span>
				</a>
			{/each}
		{/if}
	</div>
</div>
