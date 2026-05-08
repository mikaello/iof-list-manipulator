<script lang="ts">
	import { base } from '$app/paths';
	import { appState } from '$lib/state.svelte.js';
	import { validateXml } from '$lib/iof/validate.js';
	import type { ValidationIssue } from '$lib/iof/validate.js';
	import { serializeResultList } from '$lib/iof/serialize.js';

	interface Props {
		open: boolean;
	}

	let { open = $bindable() }: Props = $props();

	let issues = $state<ValidationIssue[]>([]);
	let validated = $state(false);
	let loading = $state(false);
	let mode = $state<'original' | 'current'>('current');

	// Cached after first load — subsequent clicks are instant.
	let xmllintMod: typeof import('xmllint-wasm') | null = null;
	let xsdContent: string | null = null;

	async function loadXmllint(): Promise<void> {
		if (xmllintMod) return;
		const [mod, xsdRes] = await Promise.all([
			import('xmllint-wasm'),
			fetch(`${base}/iof.xsd`),
		]);
		xmllintMod = mod;
		xsdContent = await xsdRes.text();
	}

	function getXml(): string | null {
		if (mode === 'original') return appState.rawXml;
		return appState.resultList ? serializeResultList(appState.resultList) : appState.rawXml;
	}

	async function runValidation() {
		const xml = getXml();
		if (!xml) return;

		loading = true;
		validated = false;
		issues = [];

		const structuralIssues = validateXml(xml);

		try {
			await loadXmllint();
			const result = await xmllintMod!.validateXML({
				xml: [{ fileName: 'result.xml', contents: xml }],
				schema: [xsdContent!],
			});

			if (result.valid) {
				// XSD passed — show structural issues (errors + quality warnings)
				issues = structuralIssues;
			} else {
				// XSD failed — show authoritative XSD errors (with line numbers) + quality warnings
				const xsdErrors: ValidationIssue[] = result.errors.map((e) => ({
					severity: 'error' as const,
					message: e.loc ? `Line ${e.loc.lineNumber}: ${e.message}` : e.message,
				}));
				issues = [
					...xsdErrors,
					...structuralIssues.filter((i) => i.severity === 'warning'),
				];
			}
		} catch (err) {
			// Fall back to structural-only if xmllint fails to load
			issues = [
				...structuralIssues,
				{
					severity: 'warning' as const,
					message: `Full XSD validation unavailable: ${String(err)}`,
				},
			];
		}

		validated = true;
		loading = false;
	}

	$effect(() => {
		if (open) {
			validated = false;
			loading = false;
			issues = [];
		}
	});

	function close() {
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	const errorCount = $derived(issues.filter((i) => i.severity === 'error').length);
	const warnCount = $derived(issues.filter((i) => i.severity === 'warning').length);
	const isDirty = $derived(appState.isDirty);
</script>

{#if open}
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Validate XML"
		tabindex="-1"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onkeydown={handleKeydown}
	>
		<div class="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-700">
				<h2 class="text-base font-semibold text-gray-800 dark:text-gray-100">
					Validate IOF XML 3.0
				</h2>
				<button
					type="button"
					onclick={close}
					aria-label="Close"
					class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
				>
					✕
				</button>
			</div>

			<!-- Body -->
			<div class="flex-1 overflow-y-auto px-5 py-4">
				{#if loading}
					<div class="flex flex-col items-center gap-3 py-8 text-center">
						<svg class="h-8 w-8 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
						</svg>
						<p class="text-sm text-gray-500 dark:text-slate-400">Loading validator…</p>
					</div>
				{:else}
					<!-- Mode toggle -->
					<div class="mb-4 inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-slate-700">
						<button
							type="button"
							onclick={() => { mode = 'current'; validated = false; issues = []; }}
							class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
								{mode === 'current'
									? 'bg-indigo-600 text-white shadow-sm'
									: 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}"
						>
							Current state{isDirty ? ' *' : ''}
						</button>
						<button
							type="button"
							onclick={() => { mode = 'original'; validated = false; issues = []; }}
							class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
								{mode === 'original'
									? 'bg-indigo-600 text-white shadow-sm'
									: 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}"
						>
							Original import
						</button>
					</div>

					{#if !validated}
						<p class="mb-4 text-sm text-gray-500 dark:text-slate-400">
							{#if mode === 'current'}
								Validates the <strong>current edited state</strong> (re-serialized to XML) against the IOF Interface Standard 3.0 XSD schema using
							{:else}
								Validates the <strong>original imported XML</strong> (unmodified) against the IOF Interface Standard 3.0 XSD schema using
							{/if}
							<a href="https://github.com/noppa/xmllint-wasm" target="_blank" rel="noopener noreferrer" class="underline hover:text-indigo-600 dark:hover:text-indigo-400">xmllint-wasm</a>.
							The validator (~860 KB) is only downloaded on first use.
						</p>
						<button
							type="button"
							onclick={runValidation}
							class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
						>
							Run validation
						</button>
					{:else if issues.length === 0}
						<div class="flex flex-col items-center gap-3 py-8 text-center">
							<div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
								</svg>
							</div>
							<p class="font-semibold text-gray-800 dark:text-gray-100">No issues found</p>
							<p class="text-sm text-gray-500 dark:text-slate-400">The file is valid according to the IOF XML 3.0 XSD schema.</p>
						</div>
					{:else}
						<div class="mb-3 flex gap-3 text-sm">
							{#if errorCount > 0}
								<span class="font-semibold text-red-600 dark:text-red-400">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
							{/if}
							{#if warnCount > 0}
								<span class="font-semibold text-amber-600 dark:text-amber-400">{warnCount} warning{warnCount !== 1 ? 's' : ''}</span>
							{/if}
						</div>
						<ul class="space-y-2">
							{#each issues as issue (issue.message)}
								<li class="flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm
									{issue.severity === 'error'
										? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
										: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'}">
									<span class="mt-0.5 shrink-0 font-bold uppercase tracking-wide text-xs">
										{issue.severity === 'error' ? '✖ Error' : '⚠ Warn'}
									</span>
									<span>{issue.message}</span>
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</div>

			<!-- Footer -->
			{#if validated && !loading}
				<div class="border-t border-gray-200 px-5 py-3 dark:border-slate-700">
					<button
						type="button"
						onclick={runValidation}
						class="text-sm text-indigo-500 hover:underline dark:text-indigo-400"
					>
						Re-run validation
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

