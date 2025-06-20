<script lang="ts">
	import { goto } from '$app/navigation';
	import { client } from '$lib/link';
	import { appStore } from '$lib/store/app.svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import clsx from 'clsx';
	import { onMount } from 'svelte';
	import { matchSorter } from 'match-sorter';
	import { SearchIcon } from 'lucide-svelte';

	let inputElement = $state<HTMLInputElement>();
	let query = $state('');
	let currentIndex = $state(0);

	const spacesQuery = createQuery({
		queryKey: ['spaces'],
		queryFn: () => client.spaces.list()
	});

	const spaces = $derived($spacesQuery.data?.filter((space) => space.displayName) ?? []);

	const spaceCommands = $derived(
		(spaces ?? []).map((space) => ({
			id: space.name?.split('/')[1],
			label: space.displayName,
			onSelect: () => {
				goto('/spaces/' + space.name?.split('/')[1]);
				close();
			}
		}))
	);

	const commands = $derived([...spaceCommands]);
	const filteredCommands = $derived(
		query
			? matchSorter(commands, query, {
					keys: ['label']
				})
			: commands
	);

	function close() {
		appStore.commandMenuOpen = false;
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			const nextIndex = currentIndex + 1;
			if (nextIndex < ($spacesQuery.data?.length ?? 0)) {
				currentIndex = nextIndex;
				return;
			}
			currentIndex = 0;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			const prevIndex = currentIndex - 1;
			if (prevIndex >= 0) {
				currentIndex = prevIndex;
				return;
			}
			currentIndex = ($spacesQuery.data?.length ?? 0) - 1;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			filteredCommands[currentIndex].onSelect();
			close();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}

	onMount(() => {
		setTimeout(() => {
			inputElement?.focus();
		}, 100);
	});
</script>

<dialog id="command-menu" class="modal modal-open">
	<div class="modal-box p-0">
		<label class="input w-full rounded-none border-x-0 border-t-0">
			<SearchIcon size={16} />
			<input
				class="grow"
				placeholder="Search..."
				bind:value={query}
				bind:this={inputElement}
				onkeydown={handleKeyDown}
			/>
		</label>
		<ul class="menu bg-base-100 w-full">
			{#each commands as command, index}
				<li>
					<button class={clsx(index === currentIndex && 'menu-active')} onclick={command.onSelect}
						>{command.label}</button
					>
				</li>
			{/each}
		</ul>
	</div>
	<form method="dialog" class="modal-backdrop backdrop-blur-xs">
		<button onclick={close}>close</button>
	</form>
</dialog>
