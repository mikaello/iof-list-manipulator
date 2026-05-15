import { createGenericResultListHtmlFromXml } from '@mikaello/rankinglop-resultlist-generator';
import picoCSS from '@picocss/pico/css/pico.classless.min.css?inline';
import type { ResultList } from '$lib/iof/types.js';
import { serializeResultList } from '$lib/iof/serialize.js';

/**
 * Render the given result list as a self-contained HTML document.
 *
 * Serialises the result list to IOF 3.0 XML (the same XML the user would
 * download via Export) and hands that XML string to the renderer, which
 * parses it independently. This makes the render step a real verification
 * of the export — if the produced XML is malformed or lossy, the preview
 * will reflect it.
 */
export const renderResultListHtml = (rl: ResultList): string => {
	const xml = serializeResultList(rl);
	const title = rl.event.name || 'Resultatliste';
	return createGenericResultListHtmlFromXml(xml, { title }, picoCSS);
};
