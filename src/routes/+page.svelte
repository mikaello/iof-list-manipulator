<script lang="ts">
	import { appState } from '$lib/state.svelte.js';
	import FileLoader from '$lib/components/FileLoader.svelte';
	import ExportButton from '$lib/components/ExportButton.svelte';
	import EventHeader from '$lib/components/EventHeader.svelte';
	import ClassResultPanel from '$lib/components/ClassResultPanel.svelte';

	const rl = $derived(appState.resultList);
	const error = $derived(appState.parseError);

	function addClass() {
		if (!rl) return;
		rl.classResults.push({
			class: { name: 'New class' },
			courses: [],
			personResults: [],
			teamResults: []
		});
		appState.markDirty();
	}

	function handleKeydown(e: KeyboardEvent) {
		const mod = e.ctrlKey || e.metaKey;
		if (!mod) return;
		if (e.key === 'z' && !e.shiftKey) {
			e.preventDefault();
			appState.undo();
		} else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
			e.preventDefault();
			appState.redo();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>{rl ? `${rl.event.name}${appState.isDirty ? ' *' : ''} — IOF List Manipulator` : 'IOF List Manipulator'}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-2 shadow-sm">
		<div class="mx-auto flex max-w-6xl items-center gap-3">
			<span class="mr-2 text-sm font-semibold text-gray-700">IOF List Manipulator</span>
			<FileLoader />
			<ExportButton filename={rl ? `${rl.event.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.xml` : 'result-list.xml'} />
			<div class="ml-2 flex items-center gap-1">
				<button
					type="button"
					onclick={() => appState.undo()}
					disabled={!appState.canUndo}
					title="Undo (Ctrl+Z)"
					class="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
				>
					↩ Undo
				</button>
				<button
					type="button"
					onclick={() => appState.redo()}
					disabled={!appState.canRedo}
					title="Redo (Ctrl+Y)"
					class="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
				>
					↪ Redo
				</button>
			</div>
		</div>
	</div>

	<!-- Main content -->
	<main class="mx-auto max-w-6xl px-4 py-6">
		{#if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
				<strong>Error loading file:</strong>
				{error}
			</div>
		{:else if !rl}
			<!-- Landing / empty state -->
			<div class="flex flex-col items-center justify-center py-24 text-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="mb-4 h-16 w-16 text-gray-300"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="1"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				<h1 class="mb-2 text-xl font-semibold text-gray-600">IOF List Manipulator</h1>
				<p class="mb-6 max-w-sm text-gray-400">
					Load an IOF XML 3.0 result list to start editing runners, times, and split times directly
					in the browser.
				</p>
				<FileLoader />
			</div>
		{:else}
			<EventHeader event={rl.event} isDirty={appState.isDirty} />

			{#each rl.classResults as cr, i}
				<ClassResultPanel classResult={cr} classIndex={i} />
			{/each}

			<div class="mt-4">
				<button
					type="button"
					onclick={addClass}
					class="rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
				>
					+ Add class
				</button>
			</div>
		{/if}
	</main>
</div>
