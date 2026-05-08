// IOF XML 3.0 serializer — typed model → IOF XML string
import {
	IOF_NAMESPACE,
	type ClassResult,
	type Course,
	type EventDate,
	type Organisation,
	type Person,
	type PersonRaceResult,
	type PersonResult,
	type ResultList,
	type SimpleCourse,
	type SplitTime,
	type TeamMemberResult,
	type TeamResult
} from './types.js';

const NS = IOF_NAMESPACE;

// ---- helpers ------------------------------------------------------------

function el(doc: Document, localName: string): Element {
	return doc.createElementNS(NS, localName);
}

function textEl(doc: Document, localName: string, text: string | number): Element {
	const e = el(doc, localName);
	e.textContent = String(text);
	return e;
}

function optText(
	doc: Document,
	parent: Element,
	localName: string,
	value: string | number | undefined
): void {
	if (value !== undefined && value !== '') {
		parent.appendChild(textEl(doc, localName, value));
	}
}

// ---- sub-serializers ----------------------------------------------------

function serializeOrganisation(doc: Document, org: Organisation): Element {
	const e = el(doc, 'Organisation');
	if (org.id) e.appendChild(textEl(doc, 'Id', org.id));
	e.appendChild(textEl(doc, 'Name', org.name));
	if (org.shortName) e.appendChild(textEl(doc, 'ShortName', org.shortName));
	if (org.country) {
		const c = el(doc, 'Country');
		c.setAttribute('code', org.country.code);
		c.textContent = org.country.name;
		e.appendChild(c);
	}
	return e;
}

function serializePerson(doc: Document, person: Person): Element {
	const e = el(doc, 'Person');
	if (person.sex) e.setAttribute('sex', person.sex);
	if (person.id) e.appendChild(textEl(doc, 'Id', person.id));
	const nameEl = el(doc, 'Name');
	nameEl.appendChild(textEl(doc, 'Family', person.name.family));
	nameEl.appendChild(textEl(doc, 'Given', person.name.given));
	e.appendChild(nameEl);
	if (person.birthDate) e.appendChild(textEl(doc, 'BirthDate', person.birthDate));
	return e;
}

function serializeSplitTime(doc: Document, st: SplitTime): Element {
	const e = el(doc, 'SplitTime');
	if (st.status) e.setAttribute('status', st.status);
	e.appendChild(textEl(doc, 'ControlCode', st.controlCode));
	if (st.time !== undefined) e.appendChild(textEl(doc, 'Time', st.time));
	return e;
}

function serializeSimpleCourse(doc: Document, course: SimpleCourse): Element {
	const e = el(doc, 'Course');
	if (course.id) e.appendChild(textEl(doc, 'Id', course.id));
	if (course.name) e.appendChild(textEl(doc, 'Name', course.name));
	if (course.length !== undefined) e.appendChild(textEl(doc, 'Length', course.length));
	if (course.climb !== undefined) e.appendChild(textEl(doc, 'Climb', course.climb));
	if (course.numberOfControls !== undefined)
		e.appendChild(textEl(doc, 'NumberOfControls', course.numberOfControls));
	return e;
}

function serializePersonRaceResult(doc: Document, result: PersonRaceResult): Element {
	const e = el(doc, 'Result');
	if (result.raceNumber !== undefined) e.setAttribute('raceNumber', String(result.raceNumber));
	optText(doc, e, 'BibNumber', result.bibNumber);
	optText(doc, e, 'StartTime', result.startTime);
	optText(doc, e, 'FinishTime', result.finishTime);
	if (result.time !== undefined) e.appendChild(textEl(doc, 'Time', result.time));
	if (result.timeBehind !== undefined) e.appendChild(textEl(doc, 'TimeBehind', result.timeBehind));
	if (result.position !== undefined) e.appendChild(textEl(doc, 'Position', result.position));
	e.appendChild(textEl(doc, 'Status', result.status));
	if (result.course) e.appendChild(serializeSimpleCourse(doc, result.course));
	for (const st of result.splitTimes) {
		e.appendChild(serializeSplitTime(doc, st));
	}
	return e;
}

function serializePersonResult(doc: Document, pr: PersonResult): Element {
	const e = el(doc, 'PersonResult');
	if (pr.entryId) e.appendChild(textEl(doc, 'EntryId', pr.entryId));
	e.appendChild(serializePerson(doc, pr.person));
	if (pr.organisation) e.appendChild(serializeOrganisation(doc, pr.organisation));
	for (const result of pr.results) {
		e.appendChild(serializePersonRaceResult(doc, result));
	}
	return e;
}

function serializeTeamMemberResult(doc: Document, tmr: TeamMemberResult): Element {
	const e = el(doc, 'TeamMemberResult');
	if (tmr.entryId) e.appendChild(textEl(doc, 'EntryId', tmr.entryId));
	if (tmr.person) e.appendChild(serializePerson(doc, tmr.person));
	if (tmr.organisation) e.appendChild(serializeOrganisation(doc, tmr.organisation));
	const resultEl = el(doc, 'Result');
	if (tmr.leg !== undefined) resultEl.appendChild(textEl(doc, 'Leg', tmr.leg));
	if (tmr.legOrder !== undefined) resultEl.appendChild(textEl(doc, 'LegOrder', tmr.legOrder));
	optText(doc, resultEl, 'BibNumber', tmr.bibNumber);
	optText(doc, resultEl, 'StartTime', tmr.startTime);
	optText(doc, resultEl, 'FinishTime', tmr.finishTime);
	if (tmr.time !== undefined) resultEl.appendChild(textEl(doc, 'Time', tmr.time));
	if (tmr.timeBehind !== undefined)
		resultEl.appendChild(textEl(doc, 'TimeBehind', tmr.timeBehind));
	if (tmr.position !== undefined) resultEl.appendChild(textEl(doc, 'Position', tmr.position));
	resultEl.appendChild(textEl(doc, 'Status', tmr.status));
	for (const st of tmr.splitTimes) {
		resultEl.appendChild(serializeSplitTime(doc, st));
	}
	e.appendChild(resultEl);
	return e;
}

function serializeTeamResult(doc: Document, tr: TeamResult): Element {
	const e = el(doc, 'TeamResult');
	if (tr.entryId) e.appendChild(textEl(doc, 'EntryId', tr.entryId));
	e.appendChild(textEl(doc, 'Name', tr.name));
	if (tr.organisation) e.appendChild(serializeOrganisation(doc, tr.organisation));
	optText(doc, e, 'BibNumber', tr.bibNumber);
	if (tr.time !== undefined) e.appendChild(textEl(doc, 'Time', tr.time));
	if (tr.timeBehind !== undefined) e.appendChild(textEl(doc, 'TimeBehind', tr.timeBehind));
	if (tr.position !== undefined) e.appendChild(textEl(doc, 'Position', tr.position));
	if (tr.status) e.appendChild(textEl(doc, 'Status', tr.status));
	for (const tmr of tr.teamMembers) {
		e.appendChild(serializeTeamMemberResult(doc, tmr));
	}
	return e;
}

function serializeCourse(doc: Document, course: Course): Element {
	const e = el(doc, 'Course');
	if (course.raceNumber !== undefined) e.setAttribute('raceNumber', String(course.raceNumber));
	if (course.id) e.appendChild(textEl(doc, 'Id', course.id));
	if (course.name) e.appendChild(textEl(doc, 'Name', course.name));
	if (course.length !== undefined) e.appendChild(textEl(doc, 'Length', course.length));
	if (course.climb !== undefined) e.appendChild(textEl(doc, 'Climb', course.climb));
	if (course.numberOfControls !== undefined)
		e.appendChild(textEl(doc, 'NumberOfControls', course.numberOfControls));
	return e;
}

function serializeClassResult(doc: Document, cr: ClassResult): Element {
	const e = el(doc, 'ClassResult');

	const classEl = el(doc, 'Class');
	if (cr.class.id) classEl.appendChild(textEl(doc, 'Id', cr.class.id));
	classEl.appendChild(textEl(doc, 'Name', cr.class.name));
	if (cr.class.shortName) classEl.appendChild(textEl(doc, 'ShortName', cr.class.shortName));
	e.appendChild(classEl);

	for (const course of cr.courses) {
		e.appendChild(serializeCourse(doc, course));
	}
	for (const pr of cr.personResults) {
		e.appendChild(serializePersonResult(doc, pr));
	}
	for (const tr of cr.teamResults) {
		e.appendChild(serializeTeamResult(doc, tr));
	}
	return e;
}

function serializeEventDate(doc: Document, tagName: string, ed: EventDate): Element {
	const e = el(doc, tagName);
	e.appendChild(textEl(doc, 'Date', ed.date));
	if (ed.time) e.appendChild(textEl(doc, 'Time', ed.time));
	return e;
}

// ---- public API ---------------------------------------------------------

export function serializeResultList(rl: ResultList): string {
	const doc = document.implementation.createDocument(NS, 'ResultList', null);
	const root = doc.documentElement;
	// The namespace is declared automatically by createDocument; only add xsi here.
	root.setAttributeNS(
		'http://www.w3.org/2000/xmlns/',
		'xmlns:xsi',
		'http://www.w3.org/2001/XMLSchema-instance'
	);
	root.setAttribute('iofVersion', rl.iofVersion);
	if (rl.createTime) root.setAttribute('createTime', rl.createTime);
	if (rl.creator) root.setAttribute('creator', rl.creator);
	if (rl.status) root.setAttribute('status', rl.status);

	// Event
	const eventEl = el(doc, 'Event');
	if (rl.event.id) eventEl.appendChild(textEl(doc, 'Id', rl.event.id));
	eventEl.appendChild(textEl(doc, 'Name', rl.event.name));
	if (rl.event.startTime)
		eventEl.appendChild(serializeEventDate(doc, 'StartTime', rl.event.startTime));
	if (rl.event.endTime)
		eventEl.appendChild(serializeEventDate(doc, 'EndTime', rl.event.endTime));
	root.appendChild(eventEl);

	for (const cr of rl.classResults) {
		root.appendChild(serializeClassResult(doc, cr));
	}

	const serializer = new XMLSerializer();
	const xmlStr = serializer.serializeToString(doc);
	// Strip any XML declaration the serializer may have added (it can declare
	// encoding="UTF-16" which would be wrong for a UTF-8 Blob), then add our own.
	const stripped = xmlStr.replace(/^<\?xml[^?]*\?>\s*/i, '');
	return `<?xml version="1.0" encoding="UTF-8"?>\n${stripped}`;
}
