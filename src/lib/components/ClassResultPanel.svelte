<script lang="ts">
	import type { ClassResult } from '$lib/iof/types.js';
	import { appState } from '$lib/state.svelte.js';
	import { recalcPositions, removeControlFromResults } from '$lib/utils.js';
	import PersonResultRow from './PersonResultRow.svelte';
	import TeamResultPanel from './TeamResultPanel.svelte';
	import ClassControlsPopover from './ClassControlsPopover.svelte';

	interface Props {
		classResult: ClassResult;
		classIndex: number;
	}

	const { classResult: cr, classIndex }: Props = $props();

	const course = $derived(cr.courses[0]);
	const isRelay = $derived(cr.teamResults.length > 0);

	/** Ordered list of unique control codes across all competitors' split times (course order). */
	const courseControls = $derived(
		isRelay
			? []
			: cr.personResults
					.flatMap((pr) => pr.results.flatMap((r) => r.splitTimes.map((st) => st.controlCode)))
					.filter((code, i, arr) => arr.indexOf(code) === i)
	);

	function addRunner() {
		const rl = appState.resultList;
		if (!rl) return;
		rl.classResults[classIndex].personResults.push({
			person: { name: { family: '', given: '' } },
			results: [{ status: 'Inactive', splitTimes: [] }]
		});
		appState.markDirty();
	}

	function addTeam() {
		const rl = appState.resultList;
		if (!rl) return;
		rl.classResults[classIndex].teamResults.push({
			name: 'New team',
			teamMembers: []
		});
		appState.markDirty();
	}

	function removeClassResult() {
		const rl = appState.resultList;
		if (!rl) return;
		if (!confirm(`Remove class "${cr.class.name}" and all its results?`)) return;
		rl.classResults.splice(classIndex, 1);
		appState.markDirty();
	}

	function removeControl(controlCode: string) {
		const rl = appState.resultList;
		if (!rl) return;
		const order = courseControls;
		const pos = order.indexOf(controlCode);
		const prevCode = pos > 0 ? order[pos - 1] : 'start';
		const nextCode = pos < order.length - 1 ? order[pos + 1] : 'finish';
		if (
			!confirm(
				`Remove control ${controlCode} from class "${cr.class.name}"?\n\n` +
					`The leg time from ${prevCode} to ${nextCode} will be set to 0 for all competitors.`
			)
		)
			return;
		const allResults = rl.classResults[classIndex].personResults.flatMap((pr) => pr.results);
		removeControlFromResults(allResults, order, controlCode);
		recalcPositions(allResults);
		appState.markDirty();
	}

	function toggleRaceType() {
		const rl = appState.resultList;
		if (!rl) return;
		const c = rl.classResults[classIndex];

		if (!isRelay) {
			// Individual → Relay: snapshot runners before any mutation
			if (
				c.personResults.length > 0 &&
				!confirm('Convert to relay? All runners will become members of a single team.')
			)
				return;
			// Snapshot to avoid reactive proxy issues during mutation
			const runners = JSON.parse(JSON.stringify(c.personResults)) as typeof c.personResults;
			c.personResults = [];
			c.teamResults = [
				{
					name: c.class.name,
					teamMembers: runners.map((pr, i) => ({
						person: pr.person,
						organisation: pr.organisation,
						status: pr.results[0]?.status ?? 'Inactive',
						splitTimes: pr.results[0]?.splitTimes ?? [],
						...(pr.results[0]?.time !== undefined ? { time: pr.results[0].time } : {}),
						leg: i + 1
					}))
				}
			];
		} else {
			// Relay → Individual
			if (
				c.teamResults.some((t) => t.teamMembers.length > 0) &&
				!confirm('Convert to individual? Each team member will become a runner.')
			)
				return;
			c.personResults = c.teamResults.flatMap((t) =>
				t.teamMembers.map((m) => ({
					person: m.person ?? { name: { family: '', given: '' } },
					organisation: m.organisation,
					results: [
						{
							status: m.status,
							splitTimes: m.splitTimes,
							...(m.time !== undefined ? { time: m.time } : {})
						}
					]
				}))
			);
			recalcPositions(c.personResults.map((p) => p.results[0]).filter(Boolean));
			c.teamResults = [];
		}
		appState.markDirty();
	}
</script>

<section
			class="mt-14 mb-14 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
	aria-label="Class {cr.class.name}"
>
	<!-- Class header -->
	<div class="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
		<div class="flex min-w-0 flex-1 items-center gap-3">
			<!-- Race type badge -->
			<button
				type="button"
				onclick={toggleRaceType}
				title={isRelay ? 'Switch to individual race' : 'Switch to relay/patrol race'}
				aria-label="{isRelay ? 'Relay' : 'Individual'} — click to toggle race type"
				class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
					{isRelay
						? 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:hover:bg-purple-900/60'
						: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60'}"
			>
				{isRelay ? 'Relay' : 'Individual'}
			</button>

			<label class="sr-only" for="class-name-{classIndex}">Class name</label>
			<input
				id="class-name-{classIndex}"
				type="text"
				value={cr.class.name}
				oninput={(e) => {
					cr.class.name = (e.target as HTMLInputElement).value;
					appState.markDirty();
				}}
				class="min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-gray-800 hover:border-gray-300 focus:border-indigo-400 focus:bg-indigo-50/50 focus:outline-none dark:text-gray-100 dark:hover:border-slate-600 dark:focus:border-indigo-500 dark:focus:bg-indigo-950/20"
			/>
			{#if !isRelay}
				<ClassControlsPopover classResult={cr} {classIndex} />
			{/if}
		</div>

		{#if course}
			<div class="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
				{#if course.length !== undefined}
					<span class="flex items-center gap-2">
						<label class="sr-only" for="course-length-{classIndex}">Course length (metres)</label>
						<input
							id="course-length-{classIndex}"
							type="number"
							value={course.length}
							oninput={(e) => {
								course.length = parseFloat((e.target as HTMLInputElement).value) || undefined;
								appState.markDirty();
							}}
							class="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 text-right hover:border-gray-300 focus:border-indigo-400 focus:outline-none dark:hover:border-slate-600 dark:focus:border-indigo-500"
						/>
						<span class="text-xs text-gray-400 dark:text-slate-500">m</span>
					</span>
				{/if}
				{#if course.climb !== undefined}
					<span class="flex items-center gap-2">
						<label class="sr-only" for="course-climb-{classIndex}">Course climb (metres)</label>
						<input
							id="course-climb-{classIndex}"
							type="number"
							value={course.climb}
							oninput={(e) => {
								course.climb = parseFloat((e.target as HTMLInputElement).value) || undefined;
								appState.markDirty();
							}}
							class="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-right hover:border-gray-300 focus:border-indigo-400 focus:outline-none dark:hover:border-slate-600 dark:focus:border-indigo-500"
						/>
						<span class="text-xs text-gray-400 dark:text-slate-500">m climb</span>
					</span>
				{/if}
			</div>
		{/if}

		<div class="ml-auto flex items-center gap-3">
			<span class="text-xs text-gray-400 dark:text-slate-500">
				{cr.personResults.length + cr.teamResults.length} entries
			</span>
			{#if !isRelay && courseControls.length > 0}
				<select
					aria-label="Remove a control from class {cr.class.name}"
					onchange={(e) => {
						const code = (e.target as HTMLSelectElement).value;
						if (code) removeControl(code);
						(e.target as HTMLSelectElement).value = '';
					}}
					class="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs text-gray-600 hover:border-orange-300 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
				>
					<option value="">Remove control…</option>
					{#each courseControls as code (code)}
						<option value={code}>{code}</option>
					{/each}
				</select>
			{/if}
			<button
				type="button"
				onclick={removeClassResult}
				aria-label="Remove class {cr.class.name}"
				class="rounded px-2 py-0.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
			>
				Remove class
			</button>
		</div>
	</div>

	<!-- Individual results table -->
	{#if !isRelay}
		{#if cr.personResults.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full min-w-[800px] text-sm" aria-label="Results for class {cr.class.name}">
				<thead>
					<tr class="border-b border-gray-100 bg-gray-50/50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-500">
						<th class="px-4 py-2 w-10">Pos</th>
						<th class="px-4 py-2">Name</th>
						<th class="px-4 py-2">Club</th>
						<th class="px-4 py-2 w-10">Bib</th>
						<th class="px-4 py-2 w-20">Time</th>
						<th class="px-4 py-2 w-28">Status</th>
						<th class="px-4 py-2 w-24">Splits</th>
						<th class="px-4 py-2 w-16"></th>
						</tr>
					</thead>
					<tbody>
						{#each cr.personResults as pr, i (i)}
							<PersonResultRow personResult={pr} {classIndex} resultIndex={i} />
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
		<div class="px-4 py-3 pb-4 {cr.personResults.length > 0 ? 'border-t border-gray-100 dark:border-slate-800' : ''}">
			<button
				type="button"
				onclick={addRunner}
				class="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-indigo-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
			>
				+ Add runner
			</button>
		</div>
	{/if}

	<!-- Team results -->
	{#if isRelay}
		<div role="list" aria-label="Teams in class {cr.class.name}">
			{#each cr.teamResults as tr, i (i)}
				<TeamResultPanel teamResult={tr} {classIndex} teamIndex={i} />
			{/each}
		</div>
		<div class="border-t border-gray-100 px-4 py-3 pb-4 dark:border-slate-800">
			<button
				type="button"
				onclick={addTeam}
				class="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-indigo-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
			>
				+ Add team
			</button>
		</div>
	{/if}
</section>
