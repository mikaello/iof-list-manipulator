import type { ClassResult, PersonRaceResult } from './types.js';

export type ControlSource = 'course' | 'splits';

export interface ClassControls {
	/** Ordered control codes for this class. */
	controls: string[];
	/** Whether the sequence came from explicit CourseControl elements or was inferred from split times. */
	source: ControlSource;
}

/**
 * Determine the course controls for a class using the two-option algorithm:
 *   Option 1 — CourseControl elements in ClassResult/Course (preferred)
 *   Option 2 — Inferred from the first PersonResult's SplitTimes (fallback)
 *
 * Returns null if no controls can be determined.
 */
export function getClassControls(cr: ClassResult): ClassControls | null {
	// Option 1: explicit CourseControl elements
	for (const course of cr.courses) {
		const codes = (course.courseControls ?? []).map((cc) => cc.code).filter(Boolean);
		if (codes.length > 0) return { controls: codes, source: 'course' };
	}

	// Option 2: infer from first person result that has split times
	for (const pr of cr.personResults) {
		for (const result of pr.results) {
			if (result.splitTimes.length === 0) continue;
			const controls = result.splitTimes
				.filter((st) => !st.status || st.status === 'OK' || st.status === 'Missing')
				.map((st) => st.controlCode)
				.filter(Boolean);
			if (controls.length > 0) return { controls, source: 'splits' };
		}
	}

	return null;
}

/**
 * Persist a new control sequence for a class.
 * Always writes to courseControls on the first Course element (creating one if needed),
 * so subsequent calls always use the 'course' source regardless of the original source.
 */
export function setClassControls(cr: ClassResult, newControls: string[]): void {
	if (cr.courses.length === 0) cr.courses = [{}];
	cr.courses[0].courseControls = newControls.map((code) => ({ code }));
}

/**
 * Reconcile a PersonRaceResult against a target class's control sequence after a move.
 *
 * - Punches for controls not in the target course are marked Additional.
 * - Required controls that were punched (have a time) stay OK.
 * - Required controls that are absent from the competitor's splits get a Missing entry added.
 *
 * Returns true if all required controls are present and OK (result is valid).
 */
export function reconcileSplitsForClass(
	result: PersonRaceResult,
	controls: string[]
): boolean {
	if (controls.length === 0) return true;

	const requiredSet = new Set(controls);

	// Drop any synthesised Missing entries for controls no longer required.
	// (Missing entries have no time, so they are safe to remove when not needed.)
	result.splitTimes = result.splitTimes.filter(
		(st) => !(st.status === 'Missing' && !requiredSet.has(st.controlCode))
	);

	// Index existing splits by control code; keep first occurrence if duplicate
	const splitByCode = new Map<string, (typeof result.splitTimes)[number]>();
	for (const st of result.splitTimes) {
		if (!splitByCode.has(st.controlCode)) splitByCode.set(st.controlCode, st);
	}

	// Mark any punched control not in the target course as Additional
	for (const st of result.splitTimes) {
		if (!requiredSet.has(st.controlCode)) {
			st.status = 'Additional';
		} else if (!st.status || st.status === 'Additional') {
			// Punched and it IS required — restore to OK
			st.status = 'OK';
		}
	}

	// Ensure every required control has a split entry; add Missing where absent
	let valid = true;
	for (const code of controls) {
		const existing = splitByCode.get(code);
		if (!existing) {
			result.splitTimes.push({ controlCode: code, status: 'Missing' });
			valid = false;
		} else if (existing.status === 'Missing') {
			valid = false;
		}
	}

	return valid;
}
