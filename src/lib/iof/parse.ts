// IOF XML 3.0 parser — DOM-based, preserves round-trip fidelity
import {
	IOF_NAMESPACE,
	type ClassResult,
	type Country,
	type Course,
	type CourseControl,
	type EventClass,
	type EventDate,
	type IofEvent,
	type Organisation,
	type Person,
	type PersonName,
	type PersonRaceResult,
	type PersonResult,
	type ResultList,
	type ResultListStatus,
	type ResultStatus,
	type SimpleCourse,
	type SplitTime,
	type SplitTimeStatus,
	type TeamMemberResult,
	type TeamResult
} from './types.js';

// Re-export for convenience
export type { ResultList };

function childText(el: Element, localName: string): string | undefined {
	const child = el.getElementsByTagNameNS(IOF_NAMESPACE, localName)[0];
	return child?.textContent?.trim() || undefined;
}

function childEl(el: Element, localName: string): Element | undefined {
	const children = el.getElementsByTagNameNS(IOF_NAMESPACE, localName);
	// Only return direct children, not deeper descendants
	for (let i = 0; i < children.length; i++) {
		if (children[i].parentElement === el) return children[i];
	}
	return undefined;
}

function childEls(el: Element, localName: string): Element[] {
	const children = el.getElementsByTagNameNS(IOF_NAMESPACE, localName);
	const result: Element[] = [];
	for (let i = 0; i < children.length; i++) {
		if (children[i].parentElement === el) result.push(children[i]);
	}
	return result;
}

function parseFloat_(s: string | undefined): number | undefined {
	if (s === undefined || s === '') return undefined;
	const n = parseFloat(s);
	return isNaN(n) ? undefined : n;
}

function parseInt_(s: string | undefined): number | undefined {
	if (s === undefined || s === '') return undefined;
	const n = parseInt(s, 10);
	return isNaN(n) ? undefined : n;
}

// ---- sub-parsers --------------------------------------------------------

function parseCountry(el: Element): Country {
	return {
		code: el.getAttribute('code') ?? '',
		name: el.textContent?.trim() ?? ''
	};
}

function parseOrganisation(el: Element): Organisation {
	const org: Organisation = {
		name: childText(el, 'Name') ?? ''
	};
	const id = childText(el, 'Id');
	if (id) org.id = id;
	const shortName = childText(el, 'ShortName');
	if (shortName) org.shortName = shortName;
	const countryEl = childEl(el, 'Country');
	if (countryEl) org.country = parseCountry(countryEl);
	return org;
}

function parsePersonName(el: Element): PersonName {
	return {
		family: childText(el, 'Family') ?? '',
		given: childText(el, 'Given') ?? ''
	};
}

function parsePerson(el: Element): Person {
	const nameEl = childEl(el, 'Name');
	const person: Person = {
		name: nameEl ? parsePersonName(nameEl) : { family: '', given: '' }
	};
	const id = childText(el, 'Id');
	if (id) person.id = id;
	const birthDate = childText(el, 'BirthDate');
	if (birthDate) person.birthDate = birthDate;
	const sex = el.getAttribute('sex') as 'F' | 'M' | null;
	if (sex) person.sex = sex;
	return person;
}

function parseSplitTime(el: Element): SplitTime {
	const st: SplitTime = {
		controlCode: childText(el, 'ControlCode') ?? ''
	};
	const time = parseFloat_(childText(el, 'Time'));
	if (time !== undefined) st.time = time;
	const status = el.getAttribute('status') as SplitTimeStatus | null;
	if (status) st.status = status;
	return st;
}

function parseSimpleCourse(el: Element): SimpleCourse {
	const course: SimpleCourse = {};
	const id = childText(el, 'Id');
	if (id) course.id = id;
	const name = childText(el, 'Name');
	if (name) course.name = name;
	const length = parseFloat_(childText(el, 'Length'));
	if (length !== undefined) course.length = length;
	const climb = parseFloat_(childText(el, 'Climb'));
	if (climb !== undefined) course.climb = climb;
	const noc = parseInt_(childText(el, 'NumberOfControls'));
	if (noc !== undefined) course.numberOfControls = noc;
	return course;
}

function parsePersonRaceResult(el: Element): PersonRaceResult {
	const status = (childText(el, 'Status') ?? 'Inactive') as ResultStatus;
	const result: PersonRaceResult = {
		status,
		splitTimes: childEls(el, 'SplitTime').map(parseSplitTime)
	};
	const raceNumber = el.getAttribute('raceNumber');
	if (raceNumber) result.raceNumber = parseInt(raceNumber, 10);
	const bib = childText(el, 'BibNumber');
	if (bib) result.bibNumber = bib;
	const start = childText(el, 'StartTime');
	if (start) result.startTime = start;
	const finish = childText(el, 'FinishTime');
	if (finish) result.finishTime = finish;
	const time = parseFloat_(childText(el, 'Time'));
	if (time !== undefined) result.time = time;
	const timeBehind = parseFloat_(childText(el, 'TimeBehind'));
	if (timeBehind !== undefined) result.timeBehind = timeBehind;
	const position = parseInt_(childText(el, 'Position'));
	if (position !== undefined) result.position = position;
	const courseEl = childEl(el, 'Course');
	if (courseEl) result.course = parseSimpleCourse(courseEl);
	return result;
}

function parsePersonResult(el: Element): PersonResult {
	const personEl = childEl(el, 'Person');
	const pr: PersonResult = {
		person: personEl ? parsePerson(personEl) : { name: { family: '', given: '' } },
		results: childEls(el, 'Result').map(parsePersonRaceResult)
	};
	const entryId = childText(el, 'EntryId');
	if (entryId) pr.entryId = entryId;
	const orgEl = childEl(el, 'Organisation');
	if (orgEl) pr.organisation = parseOrganisation(orgEl);
	return pr;
}

function parseTeamMemberResult(el: Element): TeamMemberResult {
	const resultEl = childEl(el, 'Result');
	const status = resultEl
		? ((childText(resultEl, 'Status') ?? 'Inactive') as ResultStatus)
		: 'Inactive';

	const tmr: TeamMemberResult = {
		status,
		splitTimes: resultEl ? childEls(resultEl, 'SplitTime').map(parseSplitTime) : []
	};

	const entryId = childText(el, 'EntryId');
	if (entryId) tmr.entryId = entryId;
	const personEl = childEl(el, 'Person');
	if (personEl) tmr.person = parsePerson(personEl);
	const orgEl = childEl(el, 'Organisation');
	if (orgEl) tmr.organisation = parseOrganisation(orgEl);

	if (resultEl) {
		const leg = parseInt_(childText(resultEl, 'Leg'));
		if (leg !== undefined) tmr.leg = leg;
		const legOrder = parseInt_(childText(resultEl, 'LegOrder'));
		if (legOrder !== undefined) tmr.legOrder = legOrder;
		const bib = childText(resultEl, 'BibNumber');
		if (bib !== undefined) tmr.bibNumber = bib;
		const start = childText(resultEl, 'StartTime');
		if (start) tmr.startTime = start;
		const finish = childText(resultEl, 'FinishTime');
		if (finish) tmr.finishTime = finish;
		const time = parseFloat_(childText(resultEl, 'Time'));
		if (time !== undefined) tmr.time = time;
		const timeBehind = parseFloat_(childText(resultEl, 'TimeBehind'));
		if (timeBehind !== undefined) tmr.timeBehind = timeBehind;
		const position = parseInt_(childText(resultEl, 'Position'));
		if (position !== undefined) tmr.position = position;
	}

	return tmr;
}

function parseTeamResult(el: Element): TeamResult {
	const tr: TeamResult = {
		name: childText(el, 'Name') ?? '',
		teamMembers: childEls(el, 'TeamMemberResult').map(parseTeamMemberResult)
	};
	const entryId = childText(el, 'EntryId');
	if (entryId) tr.entryId = entryId;
	const orgEl = childEl(el, 'Organisation');
	if (orgEl) tr.organisation = parseOrganisation(orgEl);
	const bib = childText(el, 'BibNumber');
	if (bib) tr.bibNumber = bib;
	const time = parseFloat_(childText(el, 'Time'));
	if (time !== undefined) tr.time = time;
	const timeBehind = parseFloat_(childText(el, 'TimeBehind'));
	if (timeBehind !== undefined) tr.timeBehind = timeBehind;
	const position = parseInt_(childText(el, 'Position'));
	if (position !== undefined) tr.position = position;
	const status = childText(el, 'Status') as ResultStatus | undefined;
	if (status) tr.status = status;
	return tr;
}

function parseCourse(el: Element): Course {
	const course: Course = {};
	const id = childText(el, 'Id');
	if (id) course.id = id;
	const name = childText(el, 'Name');
	if (name) course.name = name;
	const length = parseFloat_(childText(el, 'Length'));
	if (length !== undefined) course.length = length;
	const climb = parseFloat_(childText(el, 'Climb'));
	if (climb !== undefined) course.climb = climb;
	const noc = parseInt_(childText(el, 'NumberOfControls'));
	if (noc !== undefined) course.numberOfControls = noc;
	const rn = el.getAttribute('raceNumber');
	if (rn) course.raceNumber = parseInt(rn, 10);

	const ccEls = childEls(el, 'CourseControl');
	if (ccEls.length > 0) {
		const controls: CourseControl[] = [];
		for (const cc of ccEls) {
			const controlEl = childEl(cc, 'Control');
			const code = controlEl ? childText(controlEl, 'Code') : undefined;
			if (!code) continue;
			const type = cc.getAttribute('type') ?? undefined;
			controls.push({ code, ...(type ? { type } : {}) });
		}
		if (controls.length > 0) course.courseControls = controls;
	}

	return course;
}

function parseEventClass(el: Element): EventClass {
	const cls: EventClass = {
		name: childText(el, 'Name') ?? ''
	};
	const id = childText(el, 'Id');
	if (id) cls.id = id;
	const shortName = childText(el, 'ShortName');
	if (shortName) cls.shortName = shortName;
	return cls;
}

function parseClassResult(el: Element): ClassResult {
	const classEl = childEl(el, 'Class');
	return {
		class: classEl ? parseEventClass(classEl) : { name: '' },
		courses: childEls(el, 'Course').map(parseCourse),
		personResults: childEls(el, 'PersonResult').map(parsePersonResult),
		teamResults: childEls(el, 'TeamResult').map(parseTeamResult)
	};
}

function parseEventDate(dateEl: Element | undefined, timeEl: Element | undefined): EventDate | undefined {
	const date = dateEl?.textContent?.trim();
	if (!date) return undefined;
	const ed: EventDate = { date };
	const time = timeEl?.textContent?.trim();
	if (time) ed.time = time;
	return ed;
}

function parseEvent(el: Element): IofEvent {
	const event: IofEvent = {
		name: childText(el, 'Name') ?? ''
	};
	const id = childText(el, 'Id');
	if (id) event.id = id;

	const startEl = childEl(el, 'StartTime');
	if (startEl) {
		event.startTime = parseEventDate(
			childEl(startEl, 'Date'),
			childEl(startEl, 'Time')
		);
	}
	const endEl = childEl(el, 'EndTime');
	if (endEl) {
		event.endTime = parseEventDate(
			childEl(endEl, 'Date'),
			childEl(endEl, 'Time')
		);
	}
	return event;
}

// ---- public API ---------------------------------------------------------

export function parseResultList(xmlString: string): ResultList {
	const parser = new DOMParser();
	const doc = parser.parseFromString(xmlString, 'application/xml');

	const parseError = doc.querySelector('parsererror');
	if (parseError) {
		throw new Error(`XML parse error: ${parseError.textContent}`);
	}

	const root = doc.documentElement;
	if (root.localName !== 'ResultList') {
		throw new Error(`Expected root element <ResultList>, got <${root.localName}>`);
	}

	const eventEl = root.getElementsByTagNameNS(IOF_NAMESPACE, 'Event')[0];
	if (!eventEl) {
		throw new Error('Missing <Event> element in ResultList');
	}

	const rl: ResultList = {
		iofVersion: root.getAttribute('iofVersion') ?? '3.0',
		event: parseEvent(eventEl),
		classResults: Array.from(
			root.getElementsByTagNameNS(IOF_NAMESPACE, 'ClassResult')
		)
			.filter((el) => el.parentElement === root)
			.map(parseClassResult)
	};

	const createTime = root.getAttribute('createTime');
	if (createTime) rl.createTime = createTime;
	const creator = root.getAttribute('creator');
	if (creator) rl.creator = creator;
	const status = root.getAttribute('status') as ResultListStatus | null;
	if (status) rl.status = status;

	return rl;
}
