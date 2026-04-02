<script lang="ts">
	import { appState } from '$lib/state.svelte.js';
	import FileLoader from '$lib/components/FileLoader.svelte';
	import ExportButton from '$lib/components/ExportButton.svelte';
	import EventHeader from '$lib/components/EventHeader.svelte';
	import ClassResultPanel from '$lib/components/ClassResultPanel.svelte';
	import ChangelogDialog from '$lib/components/ChangelogDialog.svelte';

	const rl = $derived(appState.resultList);
	const error = $derived(appState.parseError);
	let changelogOpen = $state(false);

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
	<title>{rl ? `${rl.event.name}${appState.isDirty ? ' *' : ''} — IOF Editor` : 'IOF Editor'}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-gray-100">

	<!-- Navbar — always visible -->
	<header class="sticky top-0 z-20 bg-slate-900 shadow-sm">
		<div class="mx-auto flex h-13 max-w-[1400px] items-center gap-2 px-6 py-2">
			<!-- Brand -->
			<span class="mr-3 select-none text-sm font-bold tracking-tight">
				<span class="text-indigo-400">IOF</span><span class="text-slate-100"> Editor</span>
			</span>

			<!-- spacer -->
			<div class="flex-1" aria-hidden="true"></div>

			{#if rl}
				<!-- File loaded: show controls -->
				<FileLoader />
				<ExportButton
					filename={rl.event.name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.xml'}
				/>

				<div class="mx-1 h-5 w-px bg-slate-700" role="separator" aria-hidden="true"></div>

				<button
					type="button"
					onclick={() => appState.undo()}
					disabled={!appState.canUndo}
					title="Undo (Ctrl+Z)"
					aria-label="Undo"
					class="rounded px-2 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
				>
					↩
				</button>
				<button
					type="button"
					onclick={() => appState.redo()}
					disabled={!appState.canRedo}
					title="Redo (Ctrl+Y)"
					aria-label="Redo"
					class="rounded px-2 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
				>
					↪
				</button>

				<div class="mx-1 h-5 w-px bg-slate-700" role="separator" aria-hidden="true"></div>

				<button
					type="button"
					onclick={() => (changelogOpen = true)}
					title="Change history"
					aria-label="Show change history"
					class="relative rounded px-2 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{#if appState.changeLog.length > 0}
						<span class="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white">
							{appState.changeLog.length > 9 ? '9+' : appState.changeLog.length}
						</span>
					{/if}
				</button>
			{/if}
		</div>
	</header>

	<!-- Main content -->
	<main class="mx-auto max-w-[1400px] px-6 py-8" id="main-content">

		<!-- Error banner -->
		{#if error}
			<div
				role="alert"
				aria-live="assertive"
				class="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<div>
					<strong class="font-semibold">Error loading file: </strong>{error}
				</div>
			</div>
		{/if}

		{#if !rl}
			<!-- Landing / empty state — single upload point -->
			<div class="flex flex-col items-center justify-center py-20 text-center">
				<div class="mb-8 rounded-2xl bg-indigo-600/10 p-5 dark:bg-indigo-500/10">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				</div>
				<h1 class="mb-2 text-2xl font-bold text-gray-800 dark:text-gray-100">IOF Result List Editor</h1>
				<p class="mb-8 max-w-sm text-gray-500 dark:text-gray-400">
					Edit orienteering result lists in IOF XML 3.0 format directly in your browser.
					No server, no uploads — everything stays on your device.
				</p>
				<FileLoader variant="landing" />
			</div>
		{:else}
			<!-- Result list editor -->
			<EventHeader event={rl.event} isDirty={appState.isDirty} />

			{#each rl.classResults as cr, i}
				<ClassResultPanel classResult={cr} classIndex={i} />
			{/each}

			<button
				type="button"
				onclick={addClass}
				class="mt-2 w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-400 transition-colors hover:border-indigo-300 hover:text-indigo-500 dark:border-slate-700 dark:text-slate-500 dark:hover:border-indigo-700 dark:hover:text-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
			>
				+ Add class
			</button>
		{/if}
	</main>
</div>

<ChangelogDialog bind:open={changelogOpen} />
