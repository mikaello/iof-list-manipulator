import { describe, it, expect } from 'vitest';
import { describeChange } from './state.svelte.js';
import type { EventorExtensions, ResultList } from './iof/types.js';

function makeResultList(ext?: EventorExtensions): ResultList {
	return {
		iofVersion: '3.0',
		event: {
			name: 'Example event',
			...(ext ? { eventorExtensions: ext } : {})
		},
		classResults: []
	};
}

function diff(before: ResultList, after: ResultList): string {
	return describeChange(JSON.stringify(before), JSON.stringify(after));
}

describe('describeChange — Eventor extensions', () => {
	it('labels a discipline edit with the new list', () => {
		const before = makeResultList({ disciplines: ['Foot'] });
		const after = makeResultList({ disciplines: ['Foot', 'Ski'] });
		expect(diff(before, after)).toBe('Disciplines → Foot, Ski');
	});

	it('labels clearing all disciplines', () => {
		const before = makeResultList({ disciplines: ['Foot'] });
		const after = makeResultList({ disciplines: undefined });
		expect(diff(before, after)).toBe('Disciplines cleared');
	});

	it('labels a light condition change', () => {
		const before = makeResultList({ lightCondition: 'Day' });
		const after = makeResultList({ lightCondition: 'Night' });
		expect(diff(before, after)).toBe('Light condition → Night');
	});

	it('labels start/result list toggles', () => {
		expect(
			diff(makeResultList({ startListExists: false }), makeResultList({ startListExists: true }))
		).toBe('Start list exists → yes');
		expect(
			diff(makeResultList({ resultListExists: true }), makeResultList({ resultListExists: false }))
		).toBe('Result list exists → no');
	});

	it('labels an attribute value edit', () => {
		const before = makeResultList({ attributes: [{ id: '2', value: 'Ukas løype' }] });
		const after = makeResultList({ attributes: [{ id: '2', value: 'Edited' }] });
		expect(diff(before, after)).toBe('Attribute updated — Edited');
	});

	it('falls back to a generic label when nothing recognised changed', () => {
		const before = makeResultList();
		const after = makeResultList();
		expect(diff(before, after)).toBe('Edit');
	});
});
