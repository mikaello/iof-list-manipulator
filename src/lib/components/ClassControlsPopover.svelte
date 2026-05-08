<script lang="ts">
	import type { ClassResult } from '$lib/iof/types.js';
	import { getClassControls, setClassControls, reconcileSplitsForClass } from '$lib/iof/classControls.js';
	import { recalcPositions, sortPersonResults } from '$lib/utils.js';
	import { appState } from '$lib/state.svelte.js';

	interface Props {
		classResult: ClassResult;
		classIndex: number;
	}

	const { classResult: cr, classIndex }: Props = $props();

	let open = $state(false);
	let popoverEl: HTMLDivElement | undefined = $state();

	const classControls = $derived(getClassControls(cr));

	/** Local editable copy of the control list, refreshed each time the popover opens. */
	let editControls = $state<string[]>([]);
	let newCode = $state('');

	function openPopover() {
		editControls = classControls ? [...classControls.controls] : [];
		newCode = '';
		open = true;
	}

	function close() {
		open = false;
	}

	function onClickOutside(e: MouseEvent) {
		if (popoverEl && !popoverEl.contains(e.target as Node)) close();
	}

	$effect(() => {
		if (open) {
			window.addEventListener('mousedown', onClickOutside);
			return () => window.removeEventListener('mousedown', onClickOutside);
		}
	});

	function moveUp(i: number) {
		if (i === 0) return;
		[editControls[i - 1], editControls[i]] = [editControls[i], editControls[i - 1]];
	}

	function moveDown(i: number) {
		if (i >= editControls.length - 1) return;
		[editControls[i], editControls[i + 1]] = [editControls[i + 1], editControls[i]];
	}

	function removeControl(i: number) {
		editControls.splice(i, 1);
	}

	function addControl() {
		const code = newCode.trim();
		if (!code) return;
		editControls.push(code);
		newCode = '';
	}

	function save() {
		const rl = appState.resultList;
		if (!rl) return;
		const cr = rl.classResults[classIndex];
		setClassControls(cr, [...editControls]);

		// Re-validate every person in the class against the updated control set
		for (const pr of cr.personResults) {
			for (const result of pr.results) {
				const valid = reconcileSplitsForClass(result, editControls);
				if (valid && result.status === 'MissingPunch') {
					result.status = 'OK';
				} else if (!valid && (result.status === 'OK' || result.status === 'Finished')) {
					result.status = 'MissingPunch';
				}
			}
		}

		recalcPositions(cr.personResults.map((p) => p.results[0]).filter(Boolean));
		sortPersonResults(cr.personResults);
		appState.markDirty();
		close();
	}

	const sourceLabel = $derived(
		classControls?.source === 'course' ? 'Explicit (CourseControl)' : 'Inferred from splits'
	);
</script>

<div class="relative inline-block">
	<button
		type="button"
		onclick={openPopover}
		title="View / edit course controls"
		aria-expanded={open}
		aria-haspopup="dialog"
		class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors
			{classControls
				? 'text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/40'
				: 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-700'}
			focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.159.69.159 1.006 0Z" />
		</svg>
		{#if classControls}
			{classControls.controls.length}
		{:else}
			?
		{/if}
	</button>

	{#if open}
		<div
			role="dialog"
			aria-label="Course controls for class {cr.class.name}"
			bind:this={popoverEl}
			onkeydown={(e) => e.key === 'Escape' && close()}
			class="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
		>
			<!-- Header -->
			<div class="mb-3 flex items-center justify-between">
				<span class="text-sm font-semibold text-gray-800 dark:text-gray-100">Course controls</span>
				<button
					type="button"
					onclick={close}
					aria-label="Close"
					class="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
				</button>
			</div>

			<!-- Source badge -->
			{#if classControls}
				<p class="mb-3 text-xs text-gray-500 dark:text-slate-400">
					Source: <span class="font-medium text-gray-700 dark:text-slate-200">{sourceLabel}</span>
				</p>
			{:else}
				<p class="mb-3 text-xs text-amber-600 dark:text-amber-400">No controls found — add them below.</p>
			{/if}

			<!-- Control list -->
			<ol class="mb-3 space-y-1">
				{#each editControls as code, i (i)}
					<li class="flex items-center gap-1">
						<span class="w-5 text-right text-xs text-gray-400 dark:text-slate-500 tabular-nums">{i + 1}.</span>
						<input
							type="text"
							bind:value={editControls[i]}
							aria-label="Control {i + 1} code"
							class="w-16 rounded border border-gray-200 bg-transparent px-1.5 py-0.5 text-sm font-mono text-gray-800 focus:border-indigo-400 focus:outline-none dark:border-slate-600 dark:text-gray-100 dark:focus:border-indigo-500"
						/>
						<button
							type="button"
							onclick={() => moveUp(i)}
							disabled={i === 0}
							aria-label="Move control {i + 1} up"
							class="rounded p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 dark:text-slate-500 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
						</button>
						<button
							type="button"
							onclick={() => moveDown(i)}
							disabled={i === editControls.length - 1}
							aria-label="Move control {i + 1} down"
							class="rounded p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 dark:text-slate-500 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
						</button>
						<button
							type="button"
							onclick={() => removeControl(i)}
							aria-label="Remove control {code}"
							class="ml-auto rounded p-0.5 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
						</button>
					</li>
				{/each}
			</ol>

			<!-- Add control -->
			<div class="mb-4 flex gap-1">
				<input
					type="text"
					bind:value={newCode}
					placeholder="Code"
					aria-label="New control code"
					onkeydown={(e) => e.key === 'Enter' && addControl()}
					class="w-20 rounded border border-gray-200 bg-transparent px-1.5 py-1 text-sm font-mono text-gray-800 focus:border-indigo-400 focus:outline-none dark:border-slate-600 dark:text-gray-100 dark:focus:border-indigo-500"
				/>
				<button
					type="button"
					onclick={addControl}
					class="rounded border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
				>
					+ Add
				</button>
			</div>

			<!-- Footer -->
			<div class="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-slate-800">
				<button
					type="button"
					onclick={close}
					class="rounded px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={save}
					class="rounded bg-indigo-500 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
				>
					Save
				</button>
			</div>
		</div>
	{/if}
</div>
