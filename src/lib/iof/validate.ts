// Structural validator for IOF XML 3.0 ResultList documents.
// Full XSD validation is not available in the browser, so this covers
// the most important schema constraints and common data quality issues.

import { IOF_NAMESPACE } from './types.js';

export interface ValidationIssue {
	severity: 'error' | 'warning';
	message: string;
}

const VALID_STATUSES = new Set([
	'OK', 'Finished', 'MissingPunch', 'Disqualified', 'DidNotFinish',
	'Active', 'Inactive', 'OverTime', 'SportingWithdrawal', 'NotCompeting',
	'Moved', 'MovedUp', 'DidNotStart', 'DidNotEnter', 'Cancelled'
]);

function childEl(el: Element, localName: string): Element | undefined {
	const els = el.getElementsByTagNameNS(IOF_NAMESPACE, localName);
	for (let i = 0; i < els.length; i++) {
		if (els[i].parentElement === el) return els[i];
	}
	return undefined;
}

function childEls(el: Element, localName: string): Element[] {
	const all = el.getElementsByTagNameNS(IOF_NAMESPACE, localName);
	const result: Element[] = [];
	for (let i = 0; i < all.length; i++) {
		if (all[i].parentElement === el) result.push(all[i]);
	}
	return result;
}

function childText(el: Element, localName: string): string | undefined {
	return childEl(el, localName)?.textContent?.trim() || undefined;
}

export function validateXml(xmlString: string): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	// ── 1. XML syntax ─────────────────────────────────────────────────────────
	const parser = new DOMParser();
	const doc = parser.parseFromString(xmlString, 'application/xml');
	const parseError = doc.querySelector('parsererror');
	if (parseError) {
		issues.push({ severity: 'error', message: `XML syntax error: ${parseError.textContent?.trim()}` });
		return issues;
	}

	const root = doc.documentElement;

	// ── 2. Root element ───────────────────────────────────────────────────────
	if (root.localName !== 'ResultList') {
		issues.push({ severity: 'error', message: `Root element must be <ResultList>, found <${root.localName}>` });
		return issues;
	}

	if (root.namespaceURI !== IOF_NAMESPACE) {
		issues.push({
			severity: 'error',
			message: `Wrong namespace: expected "${IOF_NAMESPACE}", got "${root.namespaceURI ?? '(none)'}"`
		});
	}

	const iofVersion = root.getAttribute('iofVersion');
	if (!iofVersion) {
		issues.push({ severity: 'error', message: 'Missing required attribute iofVersion on <ResultList>' });
	} else if (iofVersion !== '3.0') {
		issues.push({ severity: 'warning', message: `iofVersion is "${iofVersion}", expected "3.0"` });
	}

	// ── 3. Event ──────────────────────────────────────────────────────────────
	const eventEl = childEl(root, 'Event');
	if (!eventEl) {
		issues.push({ severity: 'error', message: 'Missing required <Event> element' });
	} else {
		if (!childText(eventEl, 'Name')) {
			issues.push({ severity: 'error', message: '<Event> is missing a <Name>' });
		}
	}

	// ── 4. ClassResults ───────────────────────────────────────────────────────
	const classResults = childEls(root, 'ClassResult');
	if (classResults.length === 0) {
		issues.push({ severity: 'warning', message: 'No <ClassResult> elements found' });
	}

	classResults.forEach((cr, ci) => {
		const prefix = `ClassResult[${ci + 1}]`;
		const classEl = childEl(cr, 'Class');
		const className = classEl ? (childText(classEl, 'Name') ?? '') : '';

		if (!classEl || !className) {
			issues.push({ severity: 'error', message: `${prefix}: missing <Class><Name>` });
		}

		const label = className ? `class "${className}"` : prefix;

		// ── PersonResults ──────────────────────────────────────────────────
		const personResults = childEls(cr, 'PersonResult');
		personResults.forEach((pr, ri) => {
			const rPrefix = `${label} > PersonResult[${ri + 1}]`;
			const personEl = childEl(pr, 'Person');
			if (!personEl) {
				issues.push({ severity: 'error', message: `${rPrefix}: missing <Person>` });
			} else {
				const nameEl = childEl(personEl, 'Name');
				if (!nameEl) {
					issues.push({ severity: 'error', message: `${rPrefix}: <Person> is missing <Name>` });
				} else {
					const family = childText(nameEl, 'Family');
					const given = childText(nameEl, 'Given');
					if (!family && !given) {
						issues.push({ severity: 'warning', message: `${rPrefix}: person has no family or given name` });
					}
				}
				const sex = personEl.getAttribute('sex');
				if (sex && sex !== 'F' && sex !== 'M') {
					issues.push({ severity: 'error', message: `${rPrefix}: invalid sex attribute "${sex}" (must be F or M)` });
				}
			}

			childEls(pr, 'Result').forEach((resultEl, resIdx) => {
				const resPrefix = `${rPrefix} > Result[${resIdx + 1}]`;
				const status = childText(resultEl, 'Status');
				if (!status) {
					issues.push({ severity: 'error', message: `${resPrefix}: missing <Status>` });
				} else if (!VALID_STATUSES.has(status)) {
					issues.push({ severity: 'error', message: `${resPrefix}: invalid Status "${status}"` });
				}
				const timeStr = childText(resultEl, 'Time');
				if (timeStr !== undefined) {
					const t = parseFloat(timeStr);
					if (isNaN(t)) {
						issues.push({ severity: 'error', message: `${resPrefix}: non-numeric <Time> "${timeStr}"` });
					} else if (t < 0) {
						issues.push({ severity: 'warning', message: `${resPrefix}: negative <Time> ${t}s` });
					}
				}
			});
		});

		// ── TeamResults ────────────────────────────────────────────────────
		const teamResults = childEls(cr, 'TeamResult');
		teamResults.forEach((tr, ti) => {
			const trPrefix = `${label} > TeamResult[${ti + 1}]`;
			const teamName = childText(tr, 'Name');
			if (!teamName) {
				issues.push({ severity: 'error', message: `${trPrefix}: missing <Name>` });
			}
			const status = childText(tr, 'Status');
			if (status && !VALID_STATUSES.has(status)) {
				issues.push({ severity: 'error', message: `${trPrefix}: invalid Status "${status}"` });
			}

			childEls(tr, 'TeamMemberResult').forEach((tmr, mi) => {
				const mPrefix = `${trPrefix} > TeamMemberResult[${mi + 1}]`;
				const resultEl = childEl(tmr, 'Result');
				if (resultEl) {
					const mStatus = childText(resultEl, 'Status');
					if (!mStatus) {
						issues.push({ severity: 'error', message: `${mPrefix}: missing <Status>` });
					} else if (!VALID_STATUSES.has(mStatus)) {
						issues.push({ severity: 'error', message: `${mPrefix}: invalid Status "${mStatus}"` });
					}
				}
			});
		});

		// ── Mixed content warning ──────────────────────────────────────────
		if (personResults.length > 0 && teamResults.length > 0) {
			issues.push({
				severity: 'warning',
				message: `${label}: contains both <PersonResult> and <TeamResult> elements`
			});
		}
	});

	return issues;
}
