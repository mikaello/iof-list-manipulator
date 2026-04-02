// Shared time formatting helpers

/** Format seconds (integer or float) as H:MM:SS or MM:SS */
export function formatTime(seconds: number | undefined): string {
	if (seconds === undefined) return '—';
	const s = Math.round(seconds);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	if (h > 0) {
		return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
	}
	return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Parse a MM:SS or H:MM:SS string back to seconds, returns NaN on invalid input */
export function parseTime(value: string): number {
	const parts = value.trim().split(':').map(Number);
	if (parts.some(isNaN)) return NaN;
	if (parts.length === 2) return parts[0] * 60 + parts[1];
	if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
	return NaN;
}

/** Human-readable label for a ResultStatus code */
export function statusLabel(status: string): string {
	const labels: Record<string, string> = {
		OK: 'OK',
		Finished: 'Finished',
		MissingPunch: 'Missing punch',
		Disqualified: 'DSQ',
		DidNotFinish: 'DNF',
		Active: 'Active',
		Inactive: 'Inactive',
		OverTime: 'Over time',
		SportingWithdrawal: 'Sporting withdrawal',
		NotCompeting: 'Not competing',
		Moved: 'Moved',
		MovedUp: 'Moved up',
		DidNotStart: 'DNS',
		DidNotEnter: 'DNE',
		Cancelled: 'Cancelled'
	};
	return labels[status] ?? status;
}

/** CSS class (Tailwind) for a status badge */
export function statusClass(status: string): string {
	if (status === 'OK') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
	if (['DidNotStart', 'DidNotEnter', 'Cancelled', 'Inactive'].includes(status))
		return 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-200';
	if (['Disqualified', 'MissingPunch'].includes(status))
		return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200';
	if (['DidNotFinish', 'OverTime', 'SportingWithdrawal'].includes(status))
		return 'bg-yellow-100 text-yellow-800 dark:bg-amber-900/40 dark:text-amber-200';
	return 'bg-blue-50 text-blue-700 dark:bg-sky-900/40 dark:text-sky-200';
}

/** Background-only tint for a status — used on <select> elements where text color must stay fixed */
export function statusBgClass(status: string): string {
	if (status === 'OK') return 'bg-green-100 dark:bg-green-900/50';
	if (['DidNotStart', 'DidNotEnter', 'Cancelled', 'Inactive'].includes(status))
		return 'bg-gray-100 dark:bg-slate-700';
	if (['Disqualified', 'MissingPunch'].includes(status))
		return 'bg-red-100 dark:bg-red-900/50';
	if (['DidNotFinish', 'OverTime', 'SportingWithdrawal'].includes(status))
		return 'bg-amber-100 dark:bg-amber-900/50';
	return 'bg-sky-50 dark:bg-sky-900/50';
}

/** Recalculate Position and TimeBehind for an array of PersonRaceResults in place */
export function recalcPositions(
	results: Array<{ status: string; time?: number; position?: number; timeBehind?: number }>
) {
	const ranked = results
		.filter((r) => r.status === 'OK' && r.time !== undefined)
		.sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));

	const winnerTime = ranked[0]?.time;

	// Reset all first
	for (const r of results) {
		r.position = undefined;
		r.timeBehind = undefined;
	}

	let pos = 1;
	for (const r of ranked) {
		r.position = pos++;
		r.timeBehind = winnerTime !== undefined ? (r.time ?? 0) - winnerTime : undefined;
	}
}
