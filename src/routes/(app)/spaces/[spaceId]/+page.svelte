<script lang="ts">
	import { client } from '$lib/link';
	import { createMutation, createQuery } from '@tanstack/svelte-query';
	import { page } from '$app/state';
	import { createForm } from 'felte';
	import { watch } from 'runed';
	import { TextareaAutosize } from 'runed';

	const spaceId = $derived(page.params.spaceId);

	let messagesContainer = $state<HTMLDivElement>();
	let textareaElement = $state<HTMLTextAreaElement>();
	const spaceQuery = $derived(
		createQuery({
			queryKey: ['spaces', spaceId],
			queryFn: () => client.spaces.info({ spaceId })
		})
	);
	let messages = $state($spaceQuery.data?.messages ?? []);
	const membersQuery = $derived(
		createQuery({
			queryKey: ['members', spaceId],
			queryFn: () => client.spaces.members({ spaceId })
		})
	);

	const sendMessageMutation = createMutation({
		mutationFn: client.spaces.sendMessage,
		async onMutate() {
			setFields({ message: '' });
		}
	});

	const {
		form: sendForm,
		data,
		handleSubmit,
		setFields
	} = createForm({
		onSubmit: async (data) => {
			await $sendMessageMutation.mutateAsync({ spaceId, message: data.message });
		},
		initialValues: {
			message: ''
		}
	});

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSubmit();
		}
	}

	new TextareaAutosize({
		element: () => textareaElement,
		input: () => $data.message
	});

	$effect(() => {
		console.log('<<<MN', $membersQuery.data);
	});

	watch(
		() => $spaceQuery.isFetched,
		() => {
			if (!$spaceQuery.isFetched) return;
			setTimeout(() => {
				messagesContainer?.scrollTo({
					top: messagesContainer?.scrollHeight
				});
			}, 0);
		}
	);

	watch(
		() => $spaceQuery.data?.messages,
		(newMessages) => {
			if (!newMessages) return;
			messages = newMessages;
		}
	);

	watch(
		() => spaceId,
		() => {
			const abortController = new AbortController();
			client.spaces
				.onMessage({ spaceId }, { signal: abortController.signal })
				.then(async (stream) => {
					try {
						for await (const message of stream) {
							if (abortController.signal.aborted) {
								return stream.throw('spaceId changed');
							}
							messages = [...messages, message];
						}
					} catch (error) {
						if (error instanceof Error && error.name === 'AbortError') return;
						console.error('Error in message stream:', error);
					}
				});
			return () => {
				abortController.abort('spaceId changed');
			};
		}
	);
</script>

<svelte:head>
	<title>Outer: {$spaceQuery.data?.space?.displayName ?? 'Space'}</title>
</svelte:head>

<div class="relative flex h-full max-h-screen flex-1 flex-col">
	<div class="border-base-300 border-b px-4 py-2">
		{#if $spaceQuery.isLoading}
			<div class="skeleton h-6 w-24"></div>
		{:else}
			<h1 class="font-semibold">{$spaceQuery.data?.space?.displayName}</h1>
		{/if}
	</div>
	<div
		bind:this={messagesContainer}
		class="relative flex flex-1 flex-col overflow-y-scroll px-4 py-8"
	>
		<div class="mx-auto flex w-full max-w-2xl flex-col">
			{#if $spaceQuery.isLoading}
				<div class="flex flex-1 flex-col items-end gap-2 pt-4">
					<div class="skeleton h-10 w-24"></div>
					<div class="skeleton h-10 w-32"></div>
					<div class="skeleton h-10 w-24"></div>
				</div>
			{:else}
				<div class="flex flex-1 flex-col gap-1">
					{#each messages as message}
						<div class="chat chat-end">
							<div class="chat-bubble">{message.text}</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
	<form class="mx-auto mb-4 flex w-full max-w-2xl gap-2 lg:px-4" use:sendForm>
		<textarea
			name="message"
			class="textarea flex-1 resize-none"
			bind:this={textareaElement}
			onkeydown={handleKeyDown}
		></textarea>
		<button type="submit" class="btn hidden" disabled={$spaceQuery.isLoading}>Send</button>
	</form>
</div>
