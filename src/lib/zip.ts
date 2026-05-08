import { unzipSync, inflateSync } from 'fflate';

function u16(d: Uint8Array, o: number) { return d[o] | (d[o + 1] << 8); }
function u32(d: Uint8Array, o: number) { return ((d[o] | (d[o+1]<<8) | (d[o+2]<<16) | (d[o+3]<<24)) >>> 0); }
// Safe for values that fit in a JS number (files < 2^53 bytes)
function u64(d: Uint8Array, o: number) { return u32(d, o) + u32(d, o + 4) * 0x100000000; }

/**
 * Extract files from a zip archive.
 *
 * fflate's unzipSync handles ZIP64 only when a ZIP64 End-of-Central-Directory
 * record is present. Some tools (e.g. the ISGEO form software) write ZIP64
 * extra fields in local/central headers but omit the ZIP64 EOCD record.
 * fflate then reads 0xFFFFFFFF (~4 GB) as the literal size and crashes.
 *
 * This function falls back to reading local file headers directly, which
 * always carry the ZIP64 extra fields with the real sizes.
 */
export function extractZip(data: Uint8Array): Record<string, Uint8Array> {
	try {
		return unzipSync(data);
	} catch {
		return extractFromLocalHeaders(data);
	}
}

function extractFromLocalHeaders(data: Uint8Array): Record<string, Uint8Array> {
	const result: Record<string, Uint8Array> = {};
	let i = 0;
	while (i + 30 <= data.length) {
		if (u32(data, i) !== 0x04034b50) break; // local file header signature
		const compression = u16(data, i + 8);
		let sc = u32(data, i + 18); // compressed size
		let su = u32(data, i + 22); // uncompressed size
		const fnLen = u16(data, i + 26);
		const exLen = u16(data, i + 28);
		const fileName = new TextDecoder().decode(data.subarray(i + 30, i + 30 + fnLen));

		// When sizes are ZIP64 placeholders, find real values in extra fields
		if (sc === 0xffffffff || su === 0xffffffff) {
			let ei = i + 30 + fnLen;
			const eiEnd = ei + exLen;
			while (ei + 4 <= eiEnd) {
				const tag = u16(data, ei);
				const len = u16(data, ei + 2);
				if (tag === 0x0001) {
					let ej = ei + 4;
					if (su === 0xffffffff && ej + 8 <= eiEnd) { su = u64(data, ej); ej += 8; }
					if (sc === 0xffffffff && ej + 8 <= eiEnd) { sc = u64(data, ej); }
					break;
				}
				ei += 4 + len;
			}
		}

		const dataStart = i + 30 + fnLen + exLen;
		if (compression === 0) {
			result[fileName] = data.slice(dataStart, dataStart + sc);
		} else if (compression === 8) {
			result[fileName] = inflateSync(
				data.subarray(dataStart, dataStart + sc),
				{ out: new Uint8Array(su) }
			);
		}
		i = dataStart + sc;
	}
	return result;
}
