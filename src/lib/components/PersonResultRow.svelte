<script lang="ts">
	import type { PersonResult } from '$lib/iof/types.js';
	import { ALL_RESULT_STATUSES } from '$lib/iof/types.js';
	import { formatTime, parseTime, statusBgClass, statusLabel, recalcPositions } from '$lib/utils.js';
	import { appState } from '$lib/state.svelte.js';
	import SplitTimeList from './SplitTimeList.svelte';

	interface Props {
		personResult: PersonResult;
		classIndex: number;
		resultIndex: number;
	}

	const { personResult: pr, classIndex, resultIndex }: Props = $props();

	const result = $derived(pr.results[0]);
	const personName = $derived(`${pr.person.name.given} ${pr.person.name.family}`.trim());

	function markDirty() {
		const rl = appState.resultList;
		if (!rl) return;
		recalcPositions(rl.classResults[classIndex].personResults.map((p) => p.results[0]).filter(Boolean));
		appState.markDirty();
	}

	const timeInvalid = $derived(result !== undefined && result.time !== undefined && result.time < 0);
	const finishBeforeStart = $derived(
		result !== undefined &&
			result.startTime !== undefined &&
			result.finishTime !== undefined &&
			new Date(result.finishTime) < new Date(result.startTime)
	);

	// Local edit buffer: raw string while the field is focused, null otherwise
	let timeRaw = $state<string | null>(null);

	function onTimeFocus(e: FocusEvent) {
		// Show unformatted value for direct editing
		const el = e.target as HTMLInputElement;
		timeRaw = el.value;
	}

	function onTimeInput(e: Event) {
		timeRaw = (e.target as HTMLInputElement).value;
		const val = parseTime(timeRaw);
		result!.time = isNaN(val) ? undefined : val;
		markDirty();
	}

	function onTimeBlur() {
		timeRaw = null; // revert to formatted display
	}

	function removeRunner() {
		const rl = appState.resultList;
		if (!rl) return;
		const name = personName || 'this runner';
		if (!confirm(`Remove ${name}?`)) return;
		rl.classResults[classIndex].personResults.splice(resultIndex, 1);
		recalcPositions(rl.classResults[classIndex].personResults.map((p) => p.results[0]).filter(Boolean));
		appState.markDirty();
	}

	const cellInput = 'rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm hover:border-gray-300 focus:border-indigo-400 focus:bg-indigo-50/50 focus:outline-none dark:hover:border-slate-600 dark:focus:border-indigo-500 dark:focus:bg-indigo-950/20 transition-colors';
</script>

<tr class="group border-t border-gray-100 align-middle hover:bg-indigo-50/30 dark:border-slate-800 dark:hover:bg-indigo-950/10">
	<!-- Position -->
	<td class="px-4 py-2 text-center text-sm tabular-nums text-gray-400 dark:text-slate-500">
		{result?.position ?? '—'}
	</td>

	<!-- Name -->
	<td class="px-4 py-2">
		<div class="flex gap-2">
			<label class="sr-only" for="family-{classIndex}-{resultIndex}">Family name</label>
			<input
				id="family-{classIndex}-{resultIndex}"
				type="text"
				value={pr.person.name.family}
				oninput={(e) => { pr.person.name.family = (e.target as HTMLInputElement).value; appState.markDirty(); }}
				placeholder="Family"
				class="{cellInput} w-24"
			/>
			<label class="sr-only" for="given-{classIndex}-{resultIndex}">Given name</label>
			<input
				id="given-{classIndex}-{resultIndex}"
				type="text"
				value={pr.person.name.given}
				oninput={(e) => { pr.person.name.given = (e.target as HTMLInputElement).value; appState.markDirty(); }}
				placeholder="Given"
				class="{cellInput} w-20"
			/>
		</div>
	</td>

	<!-- Club -->
	<td class="px-4 py-2">
		<label class="sr-only" for="club-{classIndex}-{resultIndex}">Club</label>
		<input
			id="club-{classIndex}-{resultIndex}"
			type="text"
			value={pr.organisation?.name ?? ''}
			oninput={(e) => {
				const val = (e.target as HTMLInputElement).value;
				if (!pr.organisation) pr.organisation = { name: val };
				else pr.organisation.name = val;
				appState.markDirty();
			}}
			placeholder="Club"
			class="{cellInput} w-36 text-gray-600 dark:text-slate-400"
		/>
	</td>

	<!-- Bib -->
	<td class="px-4 py-2">
		{#if result}
			<label class="sr-only" for="bib-{classIndex}-{resultIndex}">Bib number</label>
			<input
				id="bib-{classIndex}-{resultIndex}"
				type="text"
				value={result.bibNumber ?? ''}
				oninput={(e) => { result.bibNumber = (e.target as HTMLInputElement).value || undefined; appState.markDirty(); }}
				placeholder="—"
				class="{cellInput} w-10 text-center text-gray-600 dark:text-slate-400"
			/>
		{/if}
	</td>

	<!-- Time -->
	<td class="px-4 py-2">
		{#if result}
			<label class="sr-only" for="time-{classIndex}-{resultIndex}">Race time</label>
			<input
				id="time-{classIndex}-{resultIndex}"
				type="text"
				value={timeRaw !== null ? timeRaw : (result.time !== undefined ? formatTime(result.time) : '')}
				placeholder="M:SS"
				onfocus={onTimeFocus}
				oninput={onTimeInput}
				onblur={onTimeBlur}
				aria-invalid={timeInvalid || finishBeforeStart}
				class="w-16 rounded border px-1.5 py-0.5 text-sm font-mono focus:outline-none transition-colors
					{timeInvalid || finishBeforeStart
						? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400'
						: 'border-transparent bg-transparent hover:border-gray-300 focus:border-indigo-400 focus:bg-indigo-50/50 dark:hover:border-slate-600 dark:focus:border-indigo-500 dark:focus:bg-indigo-950/20'}"
			/>
			{#if timeInvalid}
				<span role="alert" class="block text-xs text-red-500 dark:text-red-400">negative</span>
			{:else if finishBeforeStart}
				<span role="alert" class="block text-xs text-red-500 dark:text-red-400">finish before start</span>
			{/if}
		{/if}
	</td>

	<!-- Status -->
	<td class="px-4 py-2">
		{#if result}
			<label class="sr-only" for="status-{classIndex}-{resultIndex}">Result status</label>
			<select
				id="status-{classIndex}-{resultIndex}"
				value={result.status}
				onchange={(e) => {
					result.status = (e.target as HTMLSelectElement).value as typeof result.status;
					markDirty();
				}}
				class="rounded border border-transparent px-1.5 py-0.5 text-xs font-medium text-gray-900 hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:text-white dark:hover:border-slate-400 {statusBgClass(result.status)}"
			>
				{#each ALL_RESULT_STATUSES as s}
					<option value={s}>{statusLabel(s)}</option>
				{/each}
			</select>
		{/if}
	</td>

	<!-- Splits -->
	<td class="px-4 py-2">
		{#if result}
			<SplitTimeList
				splitTimes={result.splitTimes}
				{classIndex}
				{resultIndex}
				raceResultIndex={0}
				{personName}
			/>
		{/if}
	</td>

	<!-- Remove -->
	<td class="px-4 py-2">
		<button
			type="button"
			onclick={removeRunner}
			aria-label="Remove {personName || 'runner'}"
			class="invisible rounded px-1.5 py-0.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 group-hover:visible focus-visible:visible dark:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
		>
			Remove
		</button>
	</td>
</tr>
