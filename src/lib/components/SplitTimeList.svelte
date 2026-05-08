<script lang="ts">
	import type { SplitTime } from '$lib/iof/types.js';
	import { formatTime } from '$lib/utils.js';
	import { appState } from '$lib/state.svelte.js';

	interface Props {
		splitTimes: SplitTime[];
		classIndex: number;
		resultIndex: number;
		raceResultIndex: number;
		isTeamMember?: boolean;
		teamIndex?: number;
		personName?: string;
	}

	const {
		splitTimes,
		classIndex,
		resultIndex,
		raceResultIndex,
		isTeamMember = false,
		teamIndex = 0,
		personName = ''
	}: Props = $props();

	let dialogEl: HTMLDialogElement;
	let openBtnEl: HTMLButtonElement;

	const titleId = $derived(`splits-title-${classIndex}-${resultIndex}-${raceResultIndex}-${isTeamMember ? teamIndex : ''}`);

	const additionalCount = $derived(splitTimes.filter((st) => st.status === 'Additional').length);
	const missingCount = $derived(splitTimes.filter((st) => st.status === 'Missing').length);

	function openDialog() {
		dialogEl.showModal();
	}

	function closeDialog() {
		dialogEl.close();
		// Return focus to the trigger button
		openBtnEl?.focus();
	}

	function legTime(i: number): number | undefined {
		const curr = splitTimes[i].time;
		if (curr === undefined) return undefined;
		if (i === 0) return curr;
		const prev = splitTimes[i - 1].time;
		if (prev === undefined) return undefined;
		return curr - prev;
	}

	function getSplitArray(): SplitTime[] | null {
		const rl = appState.resultList;
		if (!rl) return null;
		const cr = rl.classResults[classIndex];
		if (!cr) return null;
		if (isTeamMember) {
			return cr.teamResults[teamIndex]?.teamMembers[resultIndex]?.splitTimes ?? null;
		}
		return cr.personResults[resultIndex]?.results[raceResultIndex]?.splitTimes ?? null;
	}

	function addSplit() {
		const arr = getSplitArray();
		if (!arr) return;
		arr.push({ controlCode: '', time: undefined });
		appState.markDirty();
	}

	function removeSplit(i: number) {
		const arr = getSplitArray();
		if (!arr) return;
		arr.splice(i, 1);
		appState.markDirty();
	}

	function moveSplit(i: number, direction: -1 | 1) {
		const arr = getSplitArray();
		if (!arr) return;
		const j = i + direction;
		if (j < 0 || j >= arr.length) return;
		[arr[i], arr[j]] = [arr[j], arr[i]];
		appState.markDirty();
	}

	function parseSplitTime(val: string): number | undefined {
		const parts = val.split(':').map(Number);
		if (parts.some(isNaN)) return undefined;
		if (parts.length === 2) return parts[0] * 60 + parts[1];
		if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
		return undefined;
	}

	// Per-split raw string buffer: index → raw string while focused, deleted on blur
	let timeRawMap = $state<Record<number, string>>({});

	function onSplitTimeFocus(i: number, e: FocusEvent) {
		const el = e.target as HTMLInputElement;
		timeRawMap = { ...timeRawMap, [i]: el.value };
	}

	function onSplitTimeInput(i: number, e: Event) {
		const raw = (e.target as HTMLInputElement).value;
		timeRawMap = { ...timeRawMap, [i]: raw };
		splitTimes[i].time = parseSplitTime(raw);
		appState.markDirty();
	}

	function onSplitTimeBlur(i: number) {
		const updated = { ...timeRawMap };
		delete updated[i];
		timeRawMap = updated;
	}</script>

<!-- Trigger button shown inside the table cell -->
<button
	bind:this={openBtnEl}
	type="button"
	onclick={openDialog}
	aria-label="{splitTimes.length > 0 ? `Edit ${splitTimes.length} splits${personName ? ` for ${personName}` : ''}` : `Add splits${personName ? ` for ${personName}` : ''}`}"
	class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
		{splitTimes.length > 0
			? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/40'
			: 'border-dashed border-gray-300 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 dark:border-slate-600 dark:text-slate-500 dark:hover:border-indigo-600 dark:hover:text-indigo-400'}"
>
	<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
		<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
	</svg>
	{#if splitTimes.length > 0}
		{splitTimes.length} split{splitTimes.length !== 1 ? 's' : ''}
		{#if additionalCount > 0}
			<span title="{additionalCount} additional punch{additionalCount !== 1 ? 'es' : ''} not part of course" class="rounded-full bg-amber-100 px-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">+{additionalCount}</span>
		{/if}
		{#if missingCount > 0}
			<span title="{missingCount} missing required control{missingCount !== 1 ? 's' : ''}" class="rounded-full bg-red-100 px-1 text-[10px] font-semibold text-red-600 dark:bg-red-900/40 dark:text-red-400">!{missingCount}</span>
		{/if}
	{:else}
		+ Splits
	{/if}
</button>

<!-- Split-time editor dialog -->
<dialog
	bind:this={dialogEl}
	aria-labelledby={titleId}
	onclick={(e) => { if (e.target === dialogEl) closeDialog(); }}
	class="mx-auto mt-[8vh] w-full max-w-2xl rounded-2xl bg-white p-0 shadow-2xl dark:bg-slate-900"
>
	<div class="flex max-h-[85vh] flex-col overflow-hidden">
		<!-- Dialog header -->
		<div class="flex items-center justify-between border-b border-gray-200 px-10 py-6 dark:border-slate-700">
			<h2 id={titleId} class="text-base font-semibold text-gray-900 dark:text-gray-100">
				Split times{personName ? ` — ${personName}` : ''}
			</h2>
			<button
				type="button"
				onclick={closeDialog}
				aria-label="Close split times editor"
				class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Scrollable split table -->
		<div class="flex-1 overflow-y-auto px-10 py-8">
			{#if splitTimes.length === 0}
				<p class="py-8 text-center text-sm text-gray-400 dark:text-slate-500">
					No splits recorded. Add controls below.
				</p>
			{:else}
				<table class="w-full text-sm" role="grid" aria-label="Split times table">
					<thead>
						<tr class="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-slate-700 dark:text-slate-500">
						<th class="pb-3 pr-6 w-8">#</th>
						<th class="pb-3 pr-6">Control</th>
						<th class="pb-3 pr-6">Cumulative</th>
						<th class="pb-3 pr-6">Leg time</th>
						<th class="pb-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each splitTimes as st, i (i)}
							<tr class="group border-b border-gray-100 dark:border-slate-800
								{st.status === 'Additional' ? 'opacity-60' : ''}">
							<td class="py-3 pr-6 text-gray-400 dark:text-slate-600">{i + 1}</td>
							<td class="py-3 pr-6">
								<div class="flex items-center gap-1.5">
									<input
										type="text"
										value={st.controlCode}
										aria-label="Control code for split {i + 1}"
										oninput={(e) => {
											st.controlCode = (e.target as HTMLInputElement).value;
											appState.markDirty();
										}}
										class="w-16 rounded border border-transparent bg-transparent px-1.5 py-0.5 font-mono hover:border-gray-300 focus:border-indigo-400 focus:bg-indigo-50/50 focus:outline-none dark:hover:border-slate-600 dark:focus:border-indigo-500 dark:focus:bg-indigo-950/20"
									/>
									{#if st.status === 'Additional'}
										<span title="Additional punch — not part of the course" class="cursor-default rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">extra</span>
									{:else if st.status === 'Missing'}
										<span title="Required control not punched" class="cursor-default rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/40 dark:text-red-400">missing</span>
									{/if}
								</div>
								</td>
							<td class="py-3 pr-6">
									<input
										type="text"
										value={timeRawMap[i] !== undefined ? timeRawMap[i] : (st.time !== undefined ? formatTime(st.time) : '')}
										placeholder="M:SS"
										aria-label="Cumulative time for split {i + 1}"
										onfocus={(e) => onSplitTimeFocus(i, e)}
										oninput={(e) => onSplitTimeInput(i, e)}
										onblur={() => onSplitTimeBlur(i)}
										class="w-20 rounded border border-transparent bg-transparent px-1.5 py-0.5 font-mono hover:border-gray-300 focus:border-indigo-400 focus:bg-indigo-50/50 focus:outline-none dark:hover:border-slate-600 dark:focus:border-indigo-500 dark:focus:bg-indigo-950/20"
									/>
								</td>
							<td class="py-3 pr-6 font-mono text-gray-500 dark:text-slate-400">
									{formatTime(legTime(i))}
								</td>
						<td class="py-3 text-right">
									<div class="invisible flex items-center justify-end gap-3 group-hover:visible focus-within:visible">
										<button
											type="button"
											onclick={() => moveSplit(i, -1)}
											disabled={i === 0}
											aria-label="Move split {i + 1} up"
											class="rounded-lg px-4 py-3 text-base font-bold leading-none text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-25 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
										>↑</button>
										<button
											type="button"
											onclick={() => moveSplit(i, 1)}
											disabled={i === splitTimes.length - 1}
											aria-label="Move split {i + 1} down"
											class="rounded-lg px-4 py-3 text-base font-bold leading-none text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-25 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
										>↓</button>
										<button
											type="button"
											onclick={() => removeSplit(i)}
											aria-label="Remove split {i + 1}"
											class="rounded-lg px-3 py-2 text-base font-bold leading-none text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
										>✕</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}

			<button
				type="button"
				onclick={addSplit}
				class="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-500 transition-colors hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
			>
				+ Add split
			</button>
		</div>

		<!-- Dialog footer -->
		<div class="flex justify-end border-t border-gray-200 px-10 py-6 dark:border-slate-700">
			<button
				type="button"
				onclick={closeDialog}
				class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
			>
				Done
			</button>
		</div>
	</div>
</dialog>
