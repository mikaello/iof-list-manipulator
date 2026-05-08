import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import { extractZip } from './zip.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(__dirname, '../../examples');

describe('extractZip', () => {
	it('extracts a normal deflate zip', () => {
		// Small valid zip created with Python's zipfile module (standard deflate, no zip64)
		const data = new Uint8Array(readFileSync(resolve(examplesDir, 'normal-test.zip')));
		const entries = extractZip(data);
		const xmlKey = Object.keys(entries).find((k) => k.toLowerCase().endsWith('.xml'));
		expect(xmlKey).toBeDefined();
		expect(new TextDecoder().decode(entries[xmlKey!])).toBe('<R/>');
	});

	it('extracts a ZIP64 file without ZIP64 EOCD (fallback path)', () => {
		// This zip is produced by ISGEO form software: it uses ZIP64 extra fields
		// in local/central headers but omits the ZIP64 EOCD record, causing
		// fflate's unzipSync to attempt a ~4 GB allocation and crash.
		const data = new Uint8Array(readFileSync(resolve(examplesDir, 'res2012-06-13.zip')));
		const entries = extractZip(data);
		const xmlKey = Object.keys(entries).find((k) => k.endsWith('.xml'));
		expect(xmlKey).toBeDefined();
		const xml = new TextDecoder().decode(entries[xmlKey!]);
		expect(xml.length).toBeGreaterThan(1000);
		expect(xml).toContain('ResultList');
	});
});
