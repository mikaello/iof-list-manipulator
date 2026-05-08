import { describe, it, expect } from 'vitest';
import { removeControlFromResults } from './utils.js';

// Helper to build a minimal race result for testing
function makeResult(splits: { code: string; time: number }[], totalTime?: number) {
	return {
		time: totalTime,
		splitTimes: splits.map((s) => ({ controlCode: s.code, time: s.time }))
	};
}

describe('removeControlFromResults', () => {
	// Course: start(0) → 1(60s) → 2(130s) → 3(210s) → finish(300s)
	const courseOrder = ['1', '2', '3'];

	it('removes middle control and zeroes the 1→3 leg for each competitor', () => {
		// Removing '2': prevTime=t1=60, nextTime=t3=210, legTime=150
		const result = makeResult(
			[
				{ code: '1', time: 60 },
				{ code: '2', time: 130 },
				{ code: '3', time: 210 }
			],
			300
		);

		removeControlFromResults([result], courseOrder, '2');

		// split for '2' removed; '3' shifted by -150 → 210-150=60
		expect(result.splitTimes.map((s) => s.controlCode)).toEqual(['1', '3']);
		expect(result.splitTimes.find((s) => s.controlCode === '3')?.time).toBe(60);
		// total: 300 - 150 = 150
		expect(result.time).toBe(150);
	});

	it('handles competitor missing the removed control split', () => {
		// No split for '2'; still uses t1=60 and t3=210 → legTime=150
		const result = makeResult(
			[
				{ code: '1', time: 60 },
				{ code: '3', time: 210 }
			],
			300
		);

		removeControlFromResults([result], courseOrder, '2');

		expect(result.splitTimes.map((s) => s.controlCode)).toEqual(['1', '3']);
		expect(result.splitTimes.find((s) => s.controlCode === '3')?.time).toBe(60);
		expect(result.time).toBe(150);
	});

	it('removes first control (no prev → prevTime=0)', () => {
		// Remove '1': prevTime=0, nextTime=t2=130, legTime=130
		const result = makeResult(
			[
				{ code: '1', time: 60 },
				{ code: '2', time: 130 },
				{ code: '3', time: 210 }
			],
			300
		);

		removeControlFromResults([result], courseOrder, '1');

		expect(result.splitTimes.map((s) => s.controlCode)).toEqual(['2', '3']);
		// '2' shifted by -130 → 0; '3' shifted by -130 → 80
		expect(result.splitTimes.find((s) => s.controlCode === '2')?.time).toBe(0);
		expect(result.splitTimes.find((s) => s.controlCode === '3')?.time).toBe(80);
		// total: 300 - 130 = 170
		expect(result.time).toBe(170);
	});

	it('removes last control (no next → nextTime=total)', () => {
		// Remove '3': prevTime=t2=130, nextTime=total=300, legTime=170
		const result = makeResult(
			[
				{ code: '1', time: 60 },
				{ code: '2', time: 130 },
				{ code: '3', time: 210 }
			],
			300
		);

		removeControlFromResults([result], courseOrder, '3');

		expect(result.splitTimes.map((s) => s.controlCode)).toEqual(['1', '2']);
		// splits before '3' unchanged
		expect(result.splitTimes.find((s) => s.controlCode === '2')?.time).toBe(130);
		// total: 300 - 170 = 130
		expect(result.time).toBe(130);
	});

	it('applies per-competitor leg times independently across multiple results', () => {
		// r1: t1=60, t3=210 → legTime=150 → total 300-150=150
		const r1 = makeResult(
			[
				{ code: '1', time: 60 },
				{ code: '2', time: 130 },
				{ code: '3', time: 210 }
			],
			300
		);
		// r2: t1=80, t3=250 → legTime=170 → total 360-170=190
		const r2 = makeResult(
			[
				{ code: '1', time: 80 },
				{ code: '2', time: 160 },
				{ code: '3', time: 250 }
			],
			360
		);

		removeControlFromResults([r1, r2], courseOrder, '2');

		expect(r1.time).toBe(150);
		expect(r1.splitTimes.find((s) => s.controlCode === '3')?.time).toBe(60);

		expect(r2.time).toBe(190);
		expect(r2.splitTimes.find((s) => s.controlCode === '3')?.time).toBe(80);
	});
});
