import { createGenericResultListHtml } from 'rankinglop-resultlist-generator';
import picoCSS from '@picocss/pico/css/pico.classless.min.css?inline';
import type { ResultList } from '$lib/iof/types.js';
import { toRendererResultList } from './mapper.js';

/**
 * Render the given result list as a self-contained HTML document.
 * The output embeds Pico CSS inline so it can be opened or downloaded standalone.
 */
export const renderResultListHtml = (rl: ResultList): string => {
	const rendererInput = toRendererResultList(rl);
	const title = rl.event.name || 'Resultatliste';
	return createGenericResultListHtml(rendererInput, { title }, picoCSS);
};
