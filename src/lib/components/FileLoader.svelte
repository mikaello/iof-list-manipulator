<script lang="ts">
	import { parseResultList } from '$lib/iof/parse.js';
	import { appState } from '$lib/state.svelte.js';

	interface Props {
		/** 'toolbar' = compact navbar button; 'landing' = large drop-zone card */
		variant?: 'toolbar' | 'landing';
	}
	const { variant = 'toolbar' }: Props = $props();

	let inputEl: HTMLInputElement;
	let dragOver = $state(false);

	function loadFile(file: File) {
		const reader = new FileReader();
		reader.onload = () => {
			try {
				appState.setResultList(parseResultList(reader.result as string));
			} catch (e) {
				appState.setParseError(e instanceof Error ? e.message : String(e));
			}
			inputEl.value = '';
		};
		reader.readAsText(file);
	}

	function handleChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) loadFile(file);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) loadFile(file);
	}
</script>

<!-- Hidden file input — triggered programmatically, completely invisible -->
<input
	bind:this={inputEl}
	type="file"
	accept=".xml,application/xml,text/xml"
	style="display:none"
	tabindex="-1"
	onchange={handleChange}
/>

{#if variant === 'landing'}
	<button
		type="button"
		onclick={() => inputEl.click()}
		ondragover={(e) => { e.preventDefault(); dragOver = true; }}
		ondragleave={() => { dragOver = false; }}
		ondrop={handleDrop}
		aria-label="Load IOF XML result file — click to browse or drag and drop"
		class="group flex flex-col items-center gap-5 rounded-2xl border-2 border-dashed px-20 py-14 transition-colors
			{dragOver
				? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/30'
				: 'border-gray-300 hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-slate-600 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/20'}"
	>
		<div
			class="rounded-2xl p-4 transition-colors
				{dragOver
					? 'bg-indigo-200 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-300'
					: 'bg-indigo-100 text-indigo-500 group-hover:bg-indigo-200 group-hover:text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400'}"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
			</svg>
		</div>
		<div class="text-center">
			<p class="text-base font-semibold text-gray-800 dark:text-gray-100">
				{dragOver ? 'Drop to load' : 'Load IOF XML result list'}
			</p>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Click to browse, or drag and drop a <code class="font-mono">.xml</code> file
			</p>
		</div>
	</button>
{:else}
	<button
		type="button"
		onclick={() => inputEl.click()}
		aria-label="Load a different IOF XML result file"
		class="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
		</svg>
		Load file
	</button>
{/if}
