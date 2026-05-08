// IOF XML 3.0 TypeScript type definitions
// Based on the IOF Interface Standard Version 3.0 XSD

export const IOF_NAMESPACE = 'http://www.orienteering.org/datastandard/3.0';

// ---- Enumerations -------------------------------------------------------

export type ResultStatus =
	| 'OK'
	| 'Finished'
	| 'MissingPunch'
	| 'Disqualified'
	| 'DidNotFinish'
	| 'Active'
	| 'Inactive'
	| 'OverTime'
	| 'SportingWithdrawal'
	| 'NotCompeting'
	| 'Moved'
	| 'MovedUp'
	| 'DidNotStart'
	| 'DidNotEnter'
	| 'Cancelled';

export const ALL_RESULT_STATUSES: ResultStatus[] = [
	'OK',
	'Finished',
	'MissingPunch',
	'Disqualified',
	'DidNotFinish',
	'Active',
	'Inactive',
	'OverTime',
	'SportingWithdrawal',
	'NotCompeting',
	'Moved',
	'MovedUp',
	'DidNotStart',
	'DidNotEnter',
	'Cancelled'
];

export type ResultListStatus = 'Complete' | 'Delta' | 'Snapshot';

export type SplitTimeStatus = 'OK' | 'Missing' | 'Additional';

// ---- Leaf types ---------------------------------------------------------

export interface PersonName {
	family: string;
	given: string;
}

export interface Country {
	code: string;
	name: string;
}

export interface Organisation {
	id?: string;
	name: string;
	shortName?: string;
	country?: Country;
}

export interface Person {
	id?: string;
	name: PersonName;
	birthDate?: string;
	sex?: 'F' | 'M';
}

export interface SplitTime {
	controlCode: string;
	time?: number;
	status?: SplitTimeStatus;
}

export interface SimpleCourse {
	id?: string;
	name?: string;
	length?: number;
	climb?: number;
	numberOfControls?: number;
}

export interface CourseControl {
	code: string;
	/** e.g. 'Normal', 'Start', 'Finish', 'ButterflyLoop' */
	type?: string;
}

export interface Course {
	id?: string;
	name?: string;
	length?: number;
	climb?: number;
	numberOfControls?: number;
	raceNumber?: number;
	/** Explicit control sequence from <CourseControl> elements, if present in the source XML. */
	courseControls?: CourseControl[];
}

// ---- Result types -------------------------------------------------------

export interface PersonRaceResult {
	raceNumber?: number;
	bibNumber?: string;
	startTime?: string;
	finishTime?: string;
	time?: number;
	timeBehind?: number;
	position?: number;
	status: ResultStatus;
	course?: SimpleCourse;
	splitTimes: SplitTime[];
}

export interface PersonResult {
	entryId?: string;
	person: Person;
	organisation?: Organisation;
	results: PersonRaceResult[];
}

export interface TeamMemberResult {
	entryId?: string;
	person?: Person;
	organisation?: Organisation;
	leg?: number;
	legOrder?: number;
	bibNumber?: string;
	startTime?: string;
	finishTime?: string;
	time?: number;
	timeBehind?: number;
	position?: number;
	status: ResultStatus;
	splitTimes: SplitTime[];
}

export interface TeamResult {
	entryId?: string;
	name: string;
	organisation?: Organisation;
	bibNumber?: string;
	teamMembers: TeamMemberResult[];
	time?: number;
	timeBehind?: number;
	position?: number;
	status?: ResultStatus;
}

// ---- Class / course -----------------------------------------------------

export interface EventClass {
	id?: string;
	name: string;
	shortName?: string;
}

export interface ClassResult {
	class: EventClass;
	courses: Course[];
	personResults: PersonResult[];
	teamResults: TeamResult[];
}

// ---- Event --------------------------------------------------------------

export interface EventDate {
	date: string;
	time?: string;
}

export interface IofEvent {
	id?: string;
	name: string;
	startTime?: EventDate;
	endTime?: EventDate;
}

// ---- Top-level document -------------------------------------------------

export interface ResultList {
	iofVersion: string;
	createTime?: string;
	creator?: string;
	status?: ResultListStatus;
	event: IofEvent;
	classResults: ClassResult[];
}
