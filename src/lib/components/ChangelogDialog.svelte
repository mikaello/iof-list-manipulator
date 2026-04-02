<script lang="ts">
	import { appState, type HistoryEntry } from '$lib/state.svelte.js';

	interface Props {
		open: boolean;
	}

	let { open = $bindable() }: Props = $props();

	let dialogEl: HTMLDialogElement;

	$effect(() => {
		if (!dialogEl) return;
		if (open) dialogEl.showModal();
		else if (dialogEl.open) dialogEl.close();
	});

	function close() {
		open = false;
	}

	// Show newest first
	const entries = $derived([...appState.changeLog].reverse());

	function formatTime(date: Date): string {
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}

	type KindMeta = { label: string; border: string; badge: string };
	const kindMeta: Record<HistoryEntry['kind'], KindMeta> = {
		load:  { label: 'Load',  border: 'border-l-emerald-400 dark:border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
		edit:  { label: 'Edit',  border: 'border-l-indigo-400 dark:border-l-indigo-500',   badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'   },
		undo:  { label: 'Undo',  border: 'border-l-amber-400 dark:border-l-amber-500',     badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'     },
		redo:  { label: 'Redo',  border: 'border-l-sky-400 dark:border-l-sky-500',         badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'             },
		clear: { label: 'Clear', border: 'border-l-gray-300 dark:border-l-gray-600',       badge: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'            },
	};
</script>

<dialog
	bind:this={dialogEl}
	aria-labelledby="changelog-title"
	onclick={(e) => { if (e.target === dialogEl) close(); }}
	onclose={() => { open = false; }}
	class="mx-auto mt-[3vh] w-[min(44rem,96vw)] rounded-2xl bg-white p-0 shadow-2xl dark:bg-slate-900"
>
	<div class="flex max-h-[88vh] flex-col overflow-hidden">

		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-200 px-8 py-6 dark:border-slate-700">
			<div>
				<h2 id="changelog-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">Change history</h2>
				<p class="mt-1 text-sm text-gray-400 dark:text-slate-500">{entries.length} {entries.length === 1 ? 'entry' : 'entries'} — newest first</p>
			</div>
			<button
				type="button"
				onclick={close}
				aria-label="Close change history"
				class="ml-6 shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Entry list -->
		<div class="flex-1 overflow-y-auto p-6">
			{#if entries.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="mb-4 h-12 w-12 text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="text-base font-medium text-gray-400 dark:text-slate-500">No changes recorded yet.</p>
					<p class="mt-1 text-sm text-gray-300 dark:text-slate-600">Edits will appear here.</p>
				</div>
			{:else}
				<ol class="space-y-3">
					{#each entries as entry, i}
						<li
							class="flex items-start gap-4 rounded-xl border-l-4 bg-gray-50 px-5 py-4 dark:bg-slate-800/60
								{i === 0 ? 'ring-1 ring-inset ring-indigo-200 dark:ring-indigo-700/60' : ''}
								{kindMeta[entry.kind].border}"
						>
							<div class="min-w-0 flex-1">
								<div class="mb-2 flex items-center gap-2.5">
									<span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold {kindMeta[entry.kind].badge}">
										{kindMeta[entry.kind].label}
									</span>
									{#if i === 0}
										<span class="text-xs font-medium text-indigo-400">Latest</span>
									{/if}
								</div>
								<p class="text-sm font-medium leading-snug text-gray-800 dark:text-gray-100">
									{entry.label}
								</p>
								<p class="mt-1.5 font-mono text-xs text-gray-400 dark:text-slate-500">
									{formatTime(entry.time)}
								</p>
							</div>
						</li>
					{/each}
				</ol>
			{/if}
		</div>
	</div>
</dialog>
