<script lang="ts">
	import type { TeamResult } from '$lib/iof/types.js';
	import { ALL_RESULT_STATUSES } from '$lib/iof/types.js';
	import { formatTime, parseTime, statusBgClass, statusLabel } from '$lib/utils.js';
	import { appState } from '$lib/state.svelte.js';
	import SplitTimeList from './SplitTimeList.svelte';

	interface Props {
		teamResult: TeamResult;
		classIndex: number;
		teamIndex: number;
	}

	const { teamResult: tr, classIndex, teamIndex }: Props = $props();

	let expanded = $state(false);

	const cellInput = 'rounded border border-transparent bg-transparent px-1.5 py-0.5 hover:border-gray-300 focus:border-indigo-400 focus:bg-indigo-50/50 focus:outline-none dark:hover:border-slate-600 dark:focus:border-indigo-500 dark:focus:bg-indigo-950/20 transition-colors';

	function removeTeam() {
		const rl = appState.resultList;
		if (!rl) return;
		if (!confirm(`Remove team "${tr.name}"?`)) return;
		rl.classResults[classIndex].teamResults.splice(teamIndex, 1);
		appState.markDirty();
	}
</script>

<div role="listitem" class="border-t border-gray-100 dark:border-slate-800">
	<!-- Team header row -->
	<div class="flex flex-wrap items-center gap-2 px-4 py-2.5 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10">
		<button
			type="button"
			onclick={() => (expanded = !expanded)}
			aria-expanded={expanded}
			aria-label="{expanded ? 'Collapse' : 'Expand'} team {tr.name}"
			class="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
		>
			{expanded ? '▼' : '▶'}
		</button>

		<span class="w-6 text-right text-sm font-medium text-gray-400 dark:text-slate-500">
			{tr.position ?? '—'}.
		</span>

		<label class="sr-only" for="team-name-{classIndex}-{teamIndex}">Team name</label>
		<input
			id="team-name-{classIndex}-{teamIndex}"
			type="text"
			value={tr.name}
			oninput={(e) => { tr.name = (e.target as HTMLInputElement).value; appState.markDirty(); }}
			class="{cellInput} w-48 text-sm font-semibold text-gray-800 dark:text-gray-100"
		/>

		<label class="sr-only" for="team-club-{classIndex}-{teamIndex}">Team club</label>
		<input
			id="team-club-{classIndex}-{teamIndex}"
			type="text"
			value={tr.organisation?.name ?? ''}
			oninput={(e) => {
				const val = (e.target as HTMLInputElement).value;
				if (!tr.organisation) tr.organisation = { name: val };
				else tr.organisation.name = val;
				appState.markDirty();
			}}
			placeholder="Club"
			class="{cellInput} w-36 text-sm text-gray-600 dark:text-slate-400"
		/>

		<label class="sr-only" for="team-time-{classIndex}-{teamIndex}">Team total time</label>
		<input
			id="team-time-{classIndex}-{teamIndex}"
			type="text"
			value={tr.time !== undefined ? formatTime(tr.time) : ''}
			placeholder="H:MM:SS"
			oninput={(e) => {
				const val = parseTime((e.target as HTMLInputElement).value);
				tr.time = isNaN(val) ? undefined : val;
				appState.markDirty();
			}}
			class="{cellInput} w-20 font-mono text-sm"
		/>

		{#if tr.status}
			<label class="sr-only" for="team-status-{classIndex}-{teamIndex}">Team status</label>
			<select
				id="team-status-{classIndex}-{teamIndex}"
				value={tr.status}
				onchange={(e) => {
					tr.status = (e.target as HTMLSelectElement).value as typeof tr.status;
					appState.markDirty();
				}}
				class="rounded border border-transparent px-1.5 py-0.5 text-xs font-medium text-gray-900 hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:text-white dark:hover:border-slate-400 {statusBgClass(tr.status ?? 'OK')}"
			>
				{#each ALL_RESULT_STATUSES as s}
					<option value={s}>{statusLabel(s)}</option>
				{/each}
			</select>
		{/if}

		<button
			type="button"
			onclick={removeTeam}
			aria-label="Remove team {tr.name}"
			class="ml-auto rounded px-1.5 py-0.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
		>
			Remove team
		</button>
	</div>

	<!-- Team member rows -->
	{#if expanded}
		<div class="ml-10 border-l-2 border-indigo-100 pl-4 dark:border-indigo-900/40">
			{#each tr.teamMembers as member, mi}
				{@const memberName = `${member.person?.name.given ?? ''} ${member.person?.name.family ?? ''}`.trim()}
				<div class="flex flex-wrap items-center gap-2 border-t border-gray-100 py-2 text-sm dark:border-slate-800">
					<span class="w-6 shrink-0 text-right text-xs text-gray-400 dark:text-slate-500">
						{member.leg ?? mi + 1}.
					</span>

					{#if member.person}
						<label class="sr-only" for="member-family-{classIndex}-{teamIndex}-{mi}">Family name</label>
						<input
							id="member-family-{classIndex}-{teamIndex}-{mi}"
							type="text"
							value={member.person.name.family}
							oninput={(e) => { member.person!.name.family = (e.target as HTMLInputElement).value; appState.markDirty(); }}
							class="{cellInput} w-24 font-medium"
						/>
						<label class="sr-only" for="member-given-{classIndex}-{teamIndex}-{mi}">Given name</label>
						<input
							id="member-given-{classIndex}-{teamIndex}-{mi}"
							type="text"
							value={member.person.name.given}
							oninput={(e) => { member.person!.name.given = (e.target as HTMLInputElement).value; appState.markDirty(); }}
							class="{cellInput} w-20"
						/>
					{/if}

					<label class="sr-only" for="member-time-{classIndex}-{teamIndex}-{mi}">Leg time</label>
					<input
						id="member-time-{classIndex}-{teamIndex}-{mi}"
						type="text"
						value={member.time !== undefined ? formatTime(member.time) : ''}
						placeholder="M:SS"
						oninput={(e) => {
							const val = parseTime((e.target as HTMLInputElement).value);
							member.time = isNaN(val) ? undefined : val;
							appState.markDirty();
						}}
						class="{cellInput} w-18 font-mono"
					/>

					<label class="sr-only" for="member-status-{classIndex}-{teamIndex}-{mi}">Member status</label>
					<select
						id="member-status-{classIndex}-{teamIndex}-{mi}"
						value={member.status}
						onchange={(e) => {
							member.status = (e.target as HTMLSelectElement).value as typeof member.status;
							appState.markDirty();
						}}
						class="rounded border border-transparent px-1.5 py-0.5 text-xs font-medium text-gray-900 hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:text-white dark:hover:border-slate-400 {statusBgClass(member.status)}"
					>
						{#each ALL_RESULT_STATUSES as s}
							<option value={s}>{statusLabel(s)}</option>
						{/each}
					</select>

					<SplitTimeList
						splitTimes={member.splitTimes}
						{classIndex}
						resultIndex={mi}
						raceResultIndex={0}
						isTeamMember={true}
						{teamIndex}
						personName={memberName}
					/>
				</div>
			{/each}

			<button
				type="button"
				onclick={() => {
					tr.teamMembers.push({
						status: 'Inactive',
						splitTimes: [],
						person: { name: { family: '', given: '' } }
					});
					appState.markDirty();
				}}
				class="mt-2 mb-2 inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-indigo-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
			>
				+ Add team member
			</button>
		</div>
	{/if}
</div>
