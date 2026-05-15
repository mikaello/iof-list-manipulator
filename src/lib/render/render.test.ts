import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { parseResultList } from '$lib/iof/parse.js';
import { renderResultListHtml } from './render.js';

const dom = new JSDOM('', { contentType: 'text/html' });
global.DOMParser = dom.window.DOMParser;
global.XMLSerializer = dom.window.XMLSerializer;
global.document = dom.window.document;

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(__dirname, '../../../examples');

function loadExample(name: string): string {
	return readFileSync(resolve(examplesDir, name), 'utf8');
}

describe('renderResultListHtml', () => {
	it('produces a self-contained HTML document with Pico CSS inlined', () => {
		const rl = parseResultList(loadExample('result_list.xml'));
		const html = renderResultListHtml(rl);
		expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
		expect(html).toContain('<title>');
		expect(html).toContain('</html>');
		// Pico's classless build is the source of body/header default styling.
		expect(html).toContain('<style>');
	});

	it('renders the event name as the page title', () => {
		const rl = parseResultList(loadExample('result_list.xml'));
		const html = renderResultListHtml(rl);
		expect(html).toContain('<h1>Rankingløp 1 - 2024</h1>');
	});

	it('renders one section per class with class names', () => {
		const rl = parseResultList(loadExample('result_list.xml'));
		const html = renderResultListHtml(rl);
		for (const cr of rl.classResults) {
			expect(html).toContain(`Resultater ${cr.class.name}`);
		}
	});

	it('omits Rankingløp-specific reporting fields', () => {
		const rl = parseResultList(loadExample('result_list.xml'));
		const html = renderResultListHtml(rl);
		expect(html).not.toContain('Startkont');
		expect(html).not.toContain('Leiebrikker');
		expect(html).not.toContain('Løpsrapport');
	});

	it("verifies round-trip: a runner present in the loaded XML survives serialise → renderer-parse", () => {
		const rl = parseResultList(loadExample('result_list.xml'));
		const someRunner = rl.classResults
			.flatMap((cr) => cr.personResults)
			.find((pr) => pr.results[0]?.status === 'OK' && pr.results[0]?.time !== undefined);
		expect(someRunner, 'expected at least one finisher in the example XML').toBeDefined();
		const name = `${someRunner!.person.name.given} ${someRunner!.person.name.family}`.trim();
		const html = renderResultListHtml(rl);
		expect(html).toContain(name);
	});
});
