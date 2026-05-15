import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { parseResultList } from '$lib/iof/parse.js';
import { toRendererResultList } from './mapper.js';

const dom = new JSDOM('', { contentType: 'text/html' });
global.DOMParser = dom.window.DOMParser;
global.XMLSerializer = dom.window.XMLSerializer;
global.document = dom.window.document;

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(__dirname, '../../../examples');

function loadExample(name: string): string {
	return readFileSync(resolve(examplesDir, name), 'utf8');
}

describe('toRendererResultList', () => {
	it('maps event metadata', () => {
		const rl = parseResultList(loadExample('result_list.xml'));
		const out = toRendererResultList(rl);
		expect(out.iofVersion).toBe('3.0');
		expect(out.event?.name).toBe('Rankingløp 1 - 2024');
	});

	it('maps each class with its first course length', () => {
		const rl = parseResultList(loadExample('result_list.xml'));
		const out = toRendererResultList(rl);
		expect(out.classResult?.length).toBe(rl.classResults.length);
		for (let i = 0; i < (out.classResult?.length ?? 0); i++) {
			const src = rl.classResults[i];
			const dst = out.classResult?.[i];
			expect(dst?.clazz?.name).toBe(src.class.name);
			if (src.courses[0]?.length !== undefined) {
				expect(dst?.course?.[0]?.length).toBe(src.courses[0].length);
			}
		}
	});

	it('maps person results, splitting given/family name and preserving organisation', () => {
		const rl = parseResultList(loadExample('result_list.xml'));
		const out = toRendererResultList(rl);
		const firstClass = rl.classResults[0];
		const firstPerson = firstClass.personResults[0];
		const mappedPerson = out.classResult?.[0]?.personResult?.[0];
		expect(mappedPerson?.person?.name?.given).toBe(firstPerson.person.name.given);
		expect(mappedPerson?.person?.name?.family).toBe(firstPerson.person.name.family);
		expect(mappedPerson?.organisation?.name).toBe(firstPerson.organisation?.name);
	});

	it('maps race result status, time, and splitTimes (renaming splitTimes → splitTime)', () => {
		const rl = parseResultList(loadExample('result_list.xml'));
		const out = toRendererResultList(rl);
		const srcRace = rl.classResults[0].personResults[0].results[0];
		const dstRace = out.classResult?.[0]?.personResult?.[0]?.result?.[0];
		expect(dstRace?.status).toBe(srcRace.status);
		expect(dstRace?.time).toBe(srcRace.time);
		expect(dstRace?.splitTime?.length).toBe(srcRace.splitTimes.length);
		if (srcRace.splitTimes[0]) {
			expect(dstRace?.splitTime?.[0]?.controlCode).toBe(srcRace.splitTimes[0].controlCode);
			expect(dstRace?.splitTime?.[0]?.time).toBe(srcRace.splitTimes[0].time);
		}
	});
});
