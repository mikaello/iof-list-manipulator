import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { parseResultList } from './parse.js';
import { serializeResultList } from './serialize.js';

// Set up a DOM environment for DOMParser / XMLSerializer / document
const dom = new JSDOM('', { contentType: 'text/html' });
global.DOMParser = dom.window.DOMParser;
global.XMLSerializer = dom.window.XMLSerializer;
global.document = dom.window.document;

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(__dirname, '../../../examples');

function loadExample(name: string): string {
	return readFileSync(resolve(examplesDir, name), 'utf8');
}

// ---- Helpers ------------------------------------------------------------

function parseAndReserialize(xml: string) {
	const model = parseResultList(xml);
	const output = serializeResultList(model);
	const reparsed = parseResultList(output);
	return { model, output, reparsed };
}

// ---- Tests --------------------------------------------------------------

describe('parseResultList', () => {
	it('parses result_list.xml (Norwegian ranking event)', () => {
		const xml = loadExample('result_list.xml');
		const rl = parseResultList(xml);
		expect(rl.iofVersion).toBe('3.0');
		expect(rl.status).toBe('Complete');
		expect(rl.event.name).toBe('Rankingløp 1 - 2024');
		expect(rl.classResults.length).toBeGreaterThan(0);
		const firstClass = rl.classResults[0];
		expect(firstClass.personResults.length).toBeGreaterThan(0);
		const firstPerson = firstClass.personResults[0];
		expect(firstPerson.results.length).toBeGreaterThan(0);
		expect(firstPerson.results[0].status).toBeDefined();
		expect(firstPerson.results[0].splitTimes.length).toBeGreaterThan(0);
	});

	it('parses result1.xml (individual event, multiple courses)', () => {
		const xml = loadExample('result1.xml');
		const rl = parseResultList(xml);
		expect(rl.iofVersion).toBe('3.0');
		expect(rl.event.name).toBe('Example event');
		expect(rl.classResults[0].personResults.length).toBeGreaterThan(0);
	});

	it('parses result2.xml (relay event)', () => {
		const xml = loadExample('result2.xml');
		const rl = parseResultList(xml);
		expect(rl.classResults[0].teamResults.length).toBeGreaterThan(0);
		const firstTeam = rl.classResults[0].teamResults[0];
		expect(firstTeam.name).toBeTruthy();
		expect(firstTeam.teamMembers.length).toBeGreaterThan(0);
	});

	it('parses result3.xml (multi-race event)', () => {
		const xml = loadExample('result3.xml');
		const rl = parseResultList(xml);
		// Multi-race: some results may have raceNumber attributes
		expect(rl.classResults.length).toBeGreaterThan(0);
	});

	it('parses result4.xml (custom namespace extensions)', () => {
		const xml = loadExample('result4.xml');
		const rl = parseResultList(xml);
		expect(rl.classResults[0].personResults.length).toBeGreaterThan(0);
	});

	it('throws on non-ResultList root element', () => {
		const xml = '<?xml version="1.0"?><StartList xmlns="http://www.orienteering.org/datastandard/3.0"></StartList>';
		expect(() => parseResultList(xml)).toThrow('Expected root element <ResultList>');
	});

	it('throws on malformed XML', () => {
		expect(() => parseResultList('<unclosed')).toThrow();
	});
});

describe('round-trip: parse → serialize → parse', () => {
	for (const name of ['result_list.xml', 'result1.xml', 'result2.xml', 'result3.xml', 'result4.xml']) {
		it(`round-trips ${name}`, () => {
			const xml = loadExample(name);
			const { model, reparsed } = parseAndReserialize(xml);

			expect(reparsed.iofVersion).toBe(model.iofVersion);
			expect(reparsed.event.name).toBe(model.event.name);
			expect(reparsed.classResults.length).toBe(model.classResults.length);

			for (let i = 0; i < model.classResults.length; i++) {
				const orig = model.classResults[i];
				const re = reparsed.classResults[i];
				expect(re.class.name).toBe(orig.class.name);
				expect(re.personResults.length).toBe(orig.personResults.length);
				expect(re.teamResults.length).toBe(orig.teamResults.length);

				for (let j = 0; j < orig.personResults.length; j++) {
					const op = orig.personResults[j];
					const rp = re.personResults[j];
					expect(rp.person.name.family).toBe(op.person.name.family);
					expect(rp.person.name.given).toBe(op.person.name.given);
					expect(rp.results.length).toBe(op.results.length);
					for (let k = 0; k < op.results.length; k++) {
						expect(rp.results[k].status).toBe(op.results[k].status);
						expect(rp.results[k].time).toBe(op.results[k].time);
						expect(rp.results[k].splitTimes.length).toBe(op.results[k].splitTimes.length);
					}
				}

				for (let j = 0; j < orig.teamResults.length; j++) {
					const ot = orig.teamResults[j];
					const rt = re.teamResults[j];
					expect(rt.name).toBe(ot.name);
					expect(rt.teamMembers.length).toBe(ot.teamMembers.length);
				}
			}
		});
	}
});

describe('model mutations preserved through serialize', () => {
	it('reflects updated runner name in re-parsed output', () => {
		const xml = loadExample('result_list.xml');
		const model = parseResultList(xml);
		model.classResults[0].personResults[0].person.name.family = 'TestFamily';
		const output = serializeResultList(model);
		const reparsed = parseResultList(output);
		expect(reparsed.classResults[0].personResults[0].person.name.family).toBe('TestFamily');
	});

	it('reflects updated result status in re-parsed output', () => {
		const xml = loadExample('result_list.xml');
		const model = parseResultList(xml);
		model.classResults[0].personResults[0].results[0].status = 'Disqualified';
		const output = serializeResultList(model);
		const reparsed = parseResultList(output);
		expect(reparsed.classResults[0].personResults[0].results[0].status).toBe('Disqualified');
	});

	it('reflects added split time in re-parsed output', () => {
		const xml = loadExample('result_list.xml');
		const model = parseResultList(xml);
		const result = model.classResults[0].personResults[0].results[0];
		const originalCount = result.splitTimes.length;
		result.splitTimes.push({ controlCode: '99', time: 999 });
		const output = serializeResultList(model);
		const reparsed = parseResultList(output);
		expect(reparsed.classResults[0].personResults[0].results[0].splitTimes.length).toBe(originalCount + 1);
	});
});

describe('Eventor extensions', () => {
	it('parses event-level Eventor extensions', () => {
		const xml = loadExample('ResultList_eventor_extensions.xml');
		const rl = parseResultList(xml);
		expect(rl.event.eventorExtensions).toBeDefined();
		expect(rl.event.eventorExtensions?.startListExists).toBe(true);
		expect(rl.event.eventorExtensions?.resultListExists).toBe(true);
		expect(rl.event.eventorExtensions?.disciplines).toEqual([
			'Foot',
			'MountainBike',
			'Ski',
			'Trail',
			'Indoor'
		]);
		expect(rl.event.eventorExtensions?.lightCondition).toBe('DayAndNight');
		expect(rl.event.eventorExtensions?.attributes).toEqual([
			{ id: '2', value: 'Ukas løype' },
			{ id: '3', value: 'Paratilbud' }
		]);
	});

	it('omits eventorExtensions when no <Extensions> on the event', () => {
		const xml = loadExample('result_list.xml');
		const rl = parseResultList(xml);
		expect(rl.event.eventorExtensions).toBeUndefined();
	});

	it('round-trips Eventor extensions through parse → serialize → parse', () => {
		const xml = loadExample('ResultList_eventor_extensions.xml');
		const { reparsed } = parseAndReserialize(xml);
		expect(reparsed.event.eventorExtensions?.disciplines).toEqual([
			'Foot',
			'MountainBike',
			'Ski',
			'Trail',
			'Indoor'
		]);
		expect(reparsed.event.eventorExtensions?.lightCondition).toBe('DayAndNight');
		expect(reparsed.event.eventorExtensions?.startListExists).toBe(true);
		expect(reparsed.event.eventorExtensions?.resultListExists).toBe(true);
		expect(reparsed.event.eventorExtensions?.attributes).toEqual([
			{ id: '2', value: 'Ukas løype' },
			{ id: '3', value: 'Paratilbud' }
		]);
	});

	it('reflects edited disciplines, lightCondition and attribute values in re-parsed output', () => {
		const xml = loadExample('ResultList_eventor_extensions.xml');
		const model = parseResultList(xml);
		if (!model.event.eventorExtensions) throw new Error('expected eventorExtensions');
		model.event.eventorExtensions.disciplines = ['Ski', 'Indoor'];
		model.event.eventorExtensions.lightCondition = 'Night';
		if (model.event.eventorExtensions.attributes) {
			model.event.eventorExtensions.attributes[0].value = 'Edited attribute';
		}
		const output = serializeResultList(model);
		const reparsed = parseResultList(output);
		expect(reparsed.event.eventorExtensions?.disciplines).toEqual(['Ski', 'Indoor']);
		expect(reparsed.event.eventorExtensions?.lightCondition).toBe('Night');
		expect(reparsed.event.eventorExtensions?.attributes?.[0]?.value).toBe('Edited attribute');
		// Attribute id and the other attribute survive.
		expect(reparsed.event.eventorExtensions?.attributes?.[0]?.id).toBe('2');
		expect(reparsed.event.eventorExtensions?.attributes?.[1]?.value).toBe('Paratilbud');
	});
});
