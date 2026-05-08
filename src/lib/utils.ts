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

/**
 * Sort personResults in place: OK finishers (with a position) first by time,
 * all others (DNS, DNF, DSQ, etc.) appended afterwards in their original order.
 */
export function sortPersonResults(
	personResults: Array<{ results: Array<{ position?: number; time?: number }> }>
): void {
	personResults.sort((a, b) => {
		const pa = a.results[0]?.position;
		const pb = b.results[0]?.position;
		if (pa !== undefined && pb !== undefined) return pa - pb;
		if (pa !== undefined) return -1;
		if (pb !== undefined) return 1;
		return 0;
	});
}

/**
 * Remove a control from every result in a class, setting the leg time
 * between the preceding and following control to zero for all competitors.
 *
 * Split times are cumulative elapsed times from start. Removing controlCode
 * subtracts (nextSplit.time − prevSplit.time) from the total and from all
 * subsequent split times, then deletes the split for controlCode.
 *
 * @param results    All PersonRaceResults in the class (mutated in place)
 * @param courseOrder  Control codes in course order (used to find prev/next)
 * @param controlCode  The control to remove
 */
export function removeControlFromResults(
	results: Array<{
		time?: number;
		splitTimes: Array<{ controlCode: string; time?: number }>;
	}>,
	courseOrder: string[],
	controlCode: string
) {
	const pos = courseOrder.indexOf(controlCode);
	const prevCode = pos > 0 ? courseOrder[pos - 1] : null;
	const nextCode = pos < courseOrder.length - 1 ? courseOrder[pos + 1] : null;

	for (const result of results) {
		const splits = result.splitTimes;

		// Cumulative time of the preceding control (0 = start)
		const prevTime =
			prevCode !== null ? (splits.find((s) => s.controlCode === prevCode)?.time ?? 0) : 0;

		// Cumulative time of the following control (fall back to finish time)
		const nextTime =
			nextCode !== null
				? (splits.find((s) => s.controlCode === nextCode)?.time ?? result.time)
				: result.time;

		const legTime =
			prevTime !== undefined && nextTime !== undefined ? nextTime - prevTime : undefined;

		// Remove the split for the eliminated control
		const removedIdx = splits.findIndex((s) => s.controlCode === controlCode);
		if (removedIdx !== -1) splits.splice(removedIdx, 1);

		if (legTime === undefined || legTime <= 0) continue;

		// Shift all cumulative split times that come after the removed control
		// (i.e., those at or beyond the next control's original position in course order)
		if (nextCode !== null) {
			const nextCourseIdx = courseOrder.indexOf(nextCode);
			for (const s of splits) {
				const idx = courseOrder.indexOf(s.controlCode);
				if (idx >= nextCourseIdx && s.time !== undefined) {
					s.time = Math.max(0, s.time - legTime);
				}
			}
		}

		// Subtract from total time
		if (result.time !== undefined) {
			result.time = Math.max(0, result.time - legTime);
		}
	}
}
