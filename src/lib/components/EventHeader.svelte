<script lang="ts">
	import type { IofEvent } from '$lib/iof/types.js';
	import { appState } from '$lib/state.svelte.js';

	interface Props {
		event: IofEvent;
		isDirty: boolean;
	}

	const { event, isDirty }: Props = $props();
</script>

<header class="mb-6">
	<div class="flex flex-wrap items-start gap-3">
		<div class="min-w-0 flex-1">
			<label class="sr-only" for="event-name">Event name</label>
			<input
				id="event-name"
				type="text"
				value={event.name}
				oninput={(e) => {
					event.name = (e.target as HTMLInputElement).value;
					appState.markDirty();
				}}
				placeholder="Event name"
				class="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-2xl font-bold tracking-tight text-gray-900 hover:border-gray-300 focus:border-indigo-400 focus:bg-indigo-50/50 focus:outline-none dark:text-gray-100 dark:hover:border-slate-600 dark:focus:border-indigo-500 dark:focus:bg-indigo-950/20"
			/>

			<div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
				{#if event.startTime}
					<div class="flex items-center gap-1">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
						</svg>
						<label class="sr-only" for="event-start-date">Start date</label>
						<input
							id="event-start-date"
							type="text"
							value={event.startTime.date}
							oninput={(e) => {
								if (event.startTime) {
									event.startTime.date = (e.target as HTMLInputElement).value;
									appState.markDirty();
								}
							}}
							placeholder="YYYY-MM-DD"
							class="rounded border border-transparent bg-transparent px-2 py-1 hover:border-gray-300 focus:border-indigo-400 focus:bg-indigo-50/50 focus:outline-none dark:hover:border-slate-600 dark:focus:border-indigo-500 dark:focus:bg-indigo-950/20"
						/>
					</div>
				{/if}

				{#if event.startTime && event.endTime}
					<span aria-hidden="true">–</span>
				{/if}

				{#if event.endTime}
					<label class="sr-only" for="event-end-date">End date</label>
					<input
						id="event-end-date"
						type="text"
						value={event.endTime.date}
						oninput={(e) => {
							if (event.endTime) {
								event.endTime.date = (e.target as HTMLInputElement).value;
								appState.markDirty();
							}
						}}
						placeholder="YYYY-MM-DD"
					class="rounded border border-transparent bg-transparent px-2 py-1 hover:border-gray-300 focus:border-indigo-400 focus:bg-indigo-50/50 focus:outline-none dark:hover:border-slate-600 dark:focus:border-indigo-500 dark:focus:bg-indigo-950/20"
					/>
				{/if}
			</div>
		</div>

		{#if isDirty}
			<span
				role="status"
				aria-live="polite"
				class="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/25 dark:text-amber-300 dark:ring-1 dark:ring-amber-500/40"
			>
				Unsaved changes
			</span>
		{/if}
	</div>

	{#if event.eventorExtensions}
		<details class="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/40 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/20">
			<summary class="cursor-pointer text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
				Eventor extensions
			</summary>
			<div class="mt-2 max-w-xl space-y-2 text-sm">
				<label class="grid gap-1 sm:grid-cols-[8rem_1fr] sm:items-center sm:gap-3">
					<span class="text-gray-700 dark:text-slate-300">Disciplines</span>
					<input
						type="text"
						value={(event.eventorExtensions.disciplines ?? []).join(', ')}
						oninput={(e) => {
							if (!event.eventorExtensions) return;
							const list = (e.target as HTMLInputElement).value
								.split(',')
								.map((s) => s.trim())
								.filter((s) => s !== '');
							event.eventorExtensions.disciplines = list.length > 0 ? list : undefined;
							appState.markDirty();
						}}
						placeholder="Foot, MountainBike, Ski, Trail, Indoor"
						class="w-full rounded border border-transparent bg-transparent px-2 py-1 hover:border-gray-300 focus:border-indigo-400 focus:bg-indigo-50/50 focus:outline-none dark:hover:border-slate-600 dark:focus:border-indigo-500 dark:focus:bg-indigo-950/40"
					/>
				</label>
				<label class="grid gap-1 sm:grid-cols-[8rem_1fr] sm:items-center sm:gap-3">
					<span class="text-gray-700 dark:text-slate-300">Light condition</span>
					<input
						type="text"
						value={event.eventorExtensions.lightCondition ?? ''}
						oninput={(e) => {
							if (!event.eventorExtensions) return;
							const v = (e.target as HTMLInputElement).value.trim();
							event.eventorExtensions.lightCondition = v === '' ? undefined : v;
							appState.markDirty();
						}}
						placeholder="Day / Night / DayAndNight"
						class="w-full rounded border border-transparent bg-transparent px-2 py-1 hover:border-gray-300 focus:border-indigo-400 focus:bg-indigo-50/50 focus:outline-none dark:hover:border-slate-600 dark:focus:border-indigo-500 dark:focus:bg-indigo-950/40"
					/>
				</label>
				<label class="grid gap-1 sm:grid-cols-[8rem_1fr] sm:items-center sm:gap-3">
					<span class="text-gray-700 dark:text-slate-300">Start list exists</span>
					<input
						type="checkbox"
						checked={event.eventorExtensions.startListExists === true}
						onchange={(e) => {
							if (!event.eventorExtensions) return;
							event.eventorExtensions.startListExists = (e.target as HTMLInputElement).checked;
							appState.markDirty();
						}}
						class="h-4 w-4 justify-self-start rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
					/>
				</label>
				<label class="grid gap-1 sm:grid-cols-[8rem_1fr] sm:items-center sm:gap-3">
					<span class="text-gray-700 dark:text-slate-300">Result list exists</span>
					<input
						type="checkbox"
						checked={event.eventorExtensions.resultListExists === true}
						onchange={(e) => {
							if (!event.eventorExtensions) return;
							event.eventorExtensions.resultListExists = (e.target as HTMLInputElement).checked;
							appState.markDirty();
						}}
						class="h-4 w-4 justify-self-start rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
					/>
				</label>
			</div>
			{#if event.eventorExtensions.attributes && event.eventorExtensions.attributes.length > 0}
				<div class="mt-3 max-w-xl">
					<div class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-400">
						Custom attributes
					</div>
					<ul class="space-y-1 text-sm">
						{#each event.eventorExtensions.attributes as attr, i (i)}
							<li class="grid gap-1 sm:grid-cols-[8rem_1fr] sm:items-center sm:gap-3">
								<span class="text-xs text-gray-500 dark:text-slate-500">#{attr.id}</span>
								<input
									type="text"
									value={attr.value}
									oninput={(e) => {
										if (!event.eventorExtensions?.attributes) return;
										event.eventorExtensions.attributes[i].value = (
											e.target as HTMLInputElement
										).value;
										appState.markDirty();
									}}
									class="w-full rounded border border-transparent bg-transparent px-2 py-1 hover:border-gray-300 focus:border-indigo-400 focus:bg-indigo-50/50 focus:outline-none dark:hover:border-slate-600 dark:focus:border-indigo-500 dark:focus:bg-indigo-950/40"
								/>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			<p class="mt-2 max-w-xl text-xs text-gray-500 dark:text-slate-400">
				Loaded from <code class="font-mono">&lt;Extensions&gt;</code> under the
				Eventor namespace
				(<code class="font-mono">http://eventor.orientering.se/iofxmlextensions</code>).
				Changes round-trip through export.
			</p>
		</details>
	{/if}
</header>
