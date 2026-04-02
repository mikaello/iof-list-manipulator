<script lang="ts">
	import { serializeResultList } from '$lib/iof/serialize.js';
	import { appState } from '$lib/state.svelte.js';

	interface Props {
		filename?: string;
	}

	const { filename = 'result-list.xml' }: Props = $props();

	function handleExport() {
		const rl = appState.resultList;
		if (!rl) return;

		const xml = serializeResultList(rl);
		const blob = new Blob([xml], { type: 'application/xml' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();

		URL.revokeObjectURL(url);
		appState.markClean();
	}
</script>

<button
	type="button"
	onclick={handleExport}
	disabled={!appState.resultList}
	aria-label="Export result list as XML file"
	class="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
>
	<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
		<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 3v13.5m0 0-4.5-4.5m4.5 4.5 4.5-4.5" />
	</svg>
	Export XML
</button>
