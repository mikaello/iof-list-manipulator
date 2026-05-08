import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { validateXml } from './validate.js';
import { validateXML } from 'xmllint-wasm';

// Set up a DOM environment for DOMParser
const dom = new JSDOM('', { contentType: 'text/html' });
global.DOMParser = dom.window.DOMParser;

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(__dirname, '../../../examples');
const repoRoot = resolve(__dirname, '../../..');

function loadExample(name: string): string {
	return readFileSync(resolve(examplesDir, name), 'utf8');
}

const xsdContent = readFileSync(resolve(repoRoot, 'static/iof.xsd'), 'utf8');

// ---- Tests --------------------------------------------------------------

describe('validateXml — official IOF datastandard examples', () => {
	for (const name of ['ResultList1.xml', 'ResultList2.xml', 'ResultList3.xml', 'ResultList4.xml']) {
		it(`${name} produces no errors`, () => {
			const xml = loadExample(name);
			const issues = validateXml(xml);
			const errors = issues.filter((i) => i.severity === 'error');
			expect(errors, `Errors in ${name}: ${errors.map((e) => e.message).join('; ')}`).toHaveLength(0);
		});
	}
});

describe('validateXml — detects structural problems', () => {
	it('reports error on malformed XML', () => {
		const issues = validateXml('<unclosed');
		expect(issues.some((i) => i.severity === 'error' && /syntax/i.test(i.message))).toBe(true);
	});

	it('reports error on wrong root element', () => {
		const xml = '<?xml version="1.0"?><StartList xmlns="http://www.orienteering.org/datastandard/3.0" iofVersion="3.0"><Event><Name>X</Name></Event></StartList>';
		const issues = validateXml(xml);
		expect(issues.some((i) => i.severity === 'error' && /root element/i.test(i.message))).toBe(true);
	});

	it('reports error on wrong namespace', () => {
		const xml = '<?xml version="1.0"?><ResultList xmlns="http://example.com/wrong" iofVersion="3.0"><Event><Name>X</Name></Event></ResultList>';
		const issues = validateXml(xml);
		expect(issues.some((i) => i.severity === 'error' && /namespace/i.test(i.message))).toBe(true);
	});

	it('reports error on missing iofVersion', () => {
		const xml = '<?xml version="1.0"?><ResultList xmlns="http://www.orienteering.org/datastandard/3.0"><Event><Name>X</Name></Event></ResultList>';
		const issues = validateXml(xml);
		expect(issues.some((i) => i.severity === 'error' && /iofVersion/i.test(i.message))).toBe(true);
	});

	it('reports warning on non-3.0 iofVersion', () => {
		const xml = '<?xml version="1.0"?><ResultList xmlns="http://www.orienteering.org/datastandard/3.0" iofVersion="2.0"><Event><Name>X</Name></Event></ResultList>';
		const issues = validateXml(xml);
		expect(issues.some((i) => i.severity === 'warning' && /iofVersion/i.test(i.message))).toBe(true);
	});

	it('reports error on missing Event Name', () => {
		const xml = '<?xml version="1.0"?><ResultList xmlns="http://www.orienteering.org/datastandard/3.0" iofVersion="3.0"><Event></Event></ResultList>';
		const issues = validateXml(xml);
		expect(issues.some((i) => i.severity === 'error' && /Event.*Name|Name/i.test(i.message))).toBe(true);
	});

	it('reports error on invalid Status value', () => {
		const xml = `<?xml version="1.0"?>
<ResultList xmlns="http://www.orienteering.org/datastandard/3.0" iofVersion="3.0">
  <Event><Name>Test</Name></Event>
  <ClassResult>
    <Class><Name>M21</Name></Class>
    <PersonResult>
      <Person><Name><Family>Smith</Family><Given>John</Given></Name></Person>
      <Result><Status>InvalidStatus</Status></Result>
    </PersonResult>
  </ClassResult>
</ResultList>`;
		const issues = validateXml(xml);
		expect(issues.some((i) => i.severity === 'error' && /status/i.test(i.message))).toBe(true);
	});

	it('reports error on invalid sex attribute', () => {
		const xml = `<?xml version="1.0"?>
<ResultList xmlns="http://www.orienteering.org/datastandard/3.0" iofVersion="3.0">
  <Event><Name>Test</Name></Event>
  <ClassResult>
    <Class><Name>M21</Name></Class>
    <PersonResult>
      <Person sex="X"><Name><Family>Smith</Family><Given>John</Given></Name></Person>
      <Result><Status>OK</Status></Result>
    </PersonResult>
  </ClassResult>
</ResultList>`;
		const issues = validateXml(xml);
		expect(issues.some((i) => i.severity === 'error' && /sex/i.test(i.message))).toBe(true);
	});

	it('reports warning on negative time', () => {
		const xml = `<?xml version="1.0"?>
<ResultList xmlns="http://www.orienteering.org/datastandard/3.0" iofVersion="3.0">
  <Event><Name>Test</Name></Event>
  <ClassResult>
    <Class><Name>M21</Name></Class>
    <PersonResult>
      <Person><Name><Family>Smith</Family><Given>John</Given></Name></Person>
      <Result><Time>-10</Time><Status>OK</Status></Result>
    </PersonResult>
  </ClassResult>
</ResultList>`;
		const issues = validateXml(xml);
		expect(issues.some((i) => i.severity === 'warning' && /negative/i.test(i.message))).toBe(true);
	});
});

describe('xmllint-wasm — XSD validation against official IOF schema', () => {
	for (const name of ['ResultList1.xml', 'ResultList2.xml', 'ResultList3.xml', 'ResultList4.xml']) {
		it(`${name} is valid per iof.xsd`, async () => {
			const xml = loadExample(name);
			const result = await validateXML({
				xml: [{ fileName: name, contents: xml }],
				schema: [xsdContent],
			});
			expect(
				result.errors.map((e) => e.rawMessage),
				`XSD errors in ${name}`
			).toHaveLength(0);
			expect(result.valid).toBe(true);
		});
	}

	it('reports XSD error for invalid Status value', async () => {
		const xml = `<?xml version="1.0"?>
<ResultList xmlns="http://www.orienteering.org/datastandard/3.0" iofVersion="3.0">
  <Event><Name>Test</Name></Event>
  <ClassResult>
    <Class><Name>M21</Name></Class>
    <PersonResult>
      <Person><Name><Family>Smith</Family><Given>John</Given></Name></Person>
      <Result><Status>InvalidStatus</Status></Result>
    </PersonResult>
  </ClassResult>
</ResultList>`;
		const result = await validateXML({
			xml: [{ fileName: 'test.xml', contents: xml }],
			schema: [xsdContent],
		});
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});
});
