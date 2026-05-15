import type {
	ResultList as RendererResultList,
	ResultStatus as RendererResultStatus
} from 'rankinglop-resultlist-generator';
import type {
	ClassResult,
	PersonRaceResult,
	PersonResult,
	ResultList,
	ResultStatus,
	SplitTime
} from '$lib/iof/types.js';

type RendererClassResult = NonNullable<RendererResultList['classResult']>[number];
type RendererPersonResult = NonNullable<RendererClassResult['personResult']>[number];
type RendererRaceResult = NonNullable<RendererPersonResult['result']>[number];
type RendererSplitTime = NonNullable<RendererRaceResult['splitTime']>[number];

// The editor's ResultStatus is a superset of the renderer's. Map the extras
// to the closest renderer-compatible value (or undefined when there is no
// sensible equivalent).
function mapStatus(s: ResultStatus): RendererResultStatus | undefined {
	switch (s) {
		case 'Finished':
			return 'OK';
		case 'Moved':
		case 'MovedUp':
			return undefined;
		default:
			return s;
	}
}

function mapSplitTime(st: SplitTime): RendererSplitTime {
	return {
		controlCode: st.controlCode,
		time: st.time,
		status: st.status
	};
}

function mapRaceResult(r: PersonRaceResult): RendererRaceResult {
	return {
		startTime: r.startTime,
		finishTime: r.finishTime,
		time: r.time,
		timeBehind: r.timeBehind,
		position: r.position,
		status: mapStatus(r.status),
		splitTime: r.splitTimes.map(mapSplitTime)
	};
}

function mapPersonResult(pr: PersonResult): RendererPersonResult {
	return {
		person: {
			name: {
				family: pr.person.name.family,
				given: pr.person.name.given
			}
		},
		organisation: pr.organisation
			? {
					name: pr.organisation.name,
					shortName: pr.organisation.shortName
				}
			: undefined,
		result: pr.results.map(mapRaceResult)
	};
}

function mapClassResult(cr: ClassResult): RendererClassResult {
	const firstCourse = cr.courses[0];
	return {
		clazz: { name: cr.class.name },
		course: firstCourse
			? [
					{
						name: firstCourse.name,
						length: firstCourse.length,
						climb: firstCourse.climb,
						numberOfControls: firstCourse.numberOfControls
					}
				]
			: undefined,
		personResult: cr.personResults.map(mapPersonResult)
	};
}

/**
 * Convert the editor's ResultList model into the input shape expected by
 * rankinglop-resultlist-generator's createGenericResultListHtml.
 *
 * Team results are omitted — the renderer only supports individual results.
 */
export const toRendererResultList = (rl: ResultList): RendererResultList => ({
	iofVersion: rl.iofVersion,
	createTime: rl.createTime,
	creator: rl.creator,
	event: rl.event
		? {
				name: rl.event.name,
				startTime: rl.event.startTime
					? { date: rl.event.startTime.date, time: rl.event.startTime.time }
					: undefined,
				endTime: rl.event.endTime
					? { date: rl.event.endTime.date, time: rl.event.endTime.time }
					: undefined
			}
		: undefined,
	classResult: rl.classResults.map(mapClassResult)
});
