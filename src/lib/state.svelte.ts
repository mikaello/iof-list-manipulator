// Global application state using Svelte 5 runes
import { SvelteDate } from 'svelte/reactivity';
import type { ResultList } from '$lib/iof/types.js';

const MAX_HISTORY = 50;

// ── Changelog entry ────────────────────────────────────────────────────────
export interface HistoryEntry {
	time: SvelteDate;
	label: string;
	/** 'load' | 'edit' | 'undo' | 'redo' | 'clear' */
	kind: 'load' | 'edit' | 'undo' | 'redo' | 'clear';
}

// ── Diff helper ────────────────────────────────────────────────────────────
function describeChange(beforeJson: string, afterJson: string): string {
	try {
		const b = JSON.parse(beforeJson) as ResultList;
		const a = JSON.parse(afterJson) as ResultList;

		if (b.event.name !== a.event.name) return `Event renamed → "${a.event.name}"`;

		if (b.classResults.length !== a.classResults.length) {
			return a.classResults.length > b.classResults.length ? 'Class added' : 'Class removed';
		}

		// Sort helper for stable person comparison independent of list order
		const personKey = (p: { person: { name: { given: string; family: string } } }) =>
			`${p.person.name.family}\0${p.person.name.given}`;

		for (let ci = 0; ci < a.classResults.length; ci++) {
			const bc = b.classResults[ci];
			const ac = a.classResults[ci];
			if (!bc) continue;

			if (bc.class.name !== ac.class.name) return `Class renamed → "${ac.class.name}"`;

			// Course controls changed (before person loop so it takes priority)
			if (JSON.stringify(bc.courses) !== JSON.stringify(ac.courses)) {
				return `Controls updated — ${ac.class.name}`;
			}

			// Individual results — sort by name for stable comparison
			if (bc.personResults.length !== ac.personResults.length) {
				return ac.personResults.length > bc.personResults.length
					? `Runner added — ${ac.class.name}`
					: `Runner removed — ${ac.class.name}`;
			}
			const bPersons = [...bc.personResults].sort((x, y) =>
				personKey(x).localeCompare(personKey(y))
			);
			const aPersons = [...ac.personResults].sort((x, y) =>
				personKey(x).localeCompare(personKey(y))
			);
			for (let ri = 0; ri < aPersons.length; ri++) {
				const bp = bPersons[ri];
				const ap = aPersons[ri];
				if (!bp) continue;
				const aName = `${ap.person.name.given} ${ap.person.name.family}`.trim() || `Runner ${ri + 1}`;
				const bName = `${bp.person.name.given} ${bp.person.name.family}`.trim() || `Runner ${ri + 1}`;
				if (bName !== aName) return `Renamed: "${aName}" — ${ac.class.name}`;
				if ((bp.organisation?.name ?? '') !== (ap.organisation?.name ?? ''))
					return `Club updated — ${aName}`;
				const br = bp.results[0];
				const ar = ap.results[0];
				if (br && ar) {
					if (br.time !== ar.time) return `Time updated — ${aName}`;
					if (br.status !== ar.status) return `Status → ${ar.status} — ${aName}`;
					if ((br.bibNumber ?? '') !== (ar.bibNumber ?? '')) return `Bib updated — ${aName}`;
					const bPunched = br.splitTimes.filter((s) => s.status !== 'Missing');
					const aPunched = ar.splitTimes.filter((s) => s.status !== 'Missing');
					if (bPunched.length !== aPunched.length)
						return bPunched.length < aPunched.length
							? `Split added — ${aName}`
							: `Split removed — ${aName}`;
					for (let si = 0; si < aPunched.length; si++) {
						if (
							bPunched[si]?.time !== aPunched[si]?.time ||
							bPunched[si]?.controlCode !== aPunched[si]?.controlCode
						)
							return `Split updated — ${aName}`;
					}
				}
			}

			// Relay
			if (bc.teamResults.length !== ac.teamResults.length) {
				return ac.teamResults.length > bc.teamResults.length
					? `Team added — ${ac.class.name}`
					: `Team removed — ${ac.class.name}`;
			}
			for (let ti = 0; ti < ac.teamResults.length; ti++) {
				const bt = bc.teamResults[ti];
				const at = ac.teamResults[ti];
				if (!bt) continue;
				if (bt.name !== at.name) return `Team renamed → "${at.name}"`;
				if ((bt.organisation?.name ?? '') !== (at.organisation?.name ?? ''))
					return `Team club updated — ${at.name}`;
				if (bt.time !== at.time) return `Team time updated — ${at.name}`;
				if (bt.status !== at.status) return `Team status → ${at.status} — ${at.name}`;
				if (bt.teamMembers.length !== at.teamMembers.length)
					return at.teamMembers.length > bt.teamMembers.length
						? `Member added — ${at.name}`
						: `Member removed — ${at.name}`;
				for (let mi = 0; mi < at.teamMembers.length; mi++) {
					const bm = bt.teamMembers[mi];
					const am = at.teamMembers[mi];
					if (!bm) continue;
					if (bm.time !== am.time) return `Leg time — leg ${am.leg ?? mi + 1} in ${at.name}`;
					if (bm.status !== am.status) return `Member status → ${am.status} in ${at.name}`;
					if (bm.splitTimes.length !== am.splitTimes.length)
						return `Splits updated — leg ${am.leg ?? mi + 1}`;
				}
			}
		}
		return 'Edit';
	} catch {
		return 'Edit';
	}
}

// The active result list loaded by the user
export const appState = (() => {
	let resultList = $state<ResultList | null>(null);
	let parseError = $state<string | null>(null);
	let isDirty = $state(false);
	let rawXml = $state<string | null>(null);

	// Undo/redo stacks hold serialized snapshots
	let past = $state<string[]>([]); // [oldest, ..., most recent before current]
	let future = $state<string[]>([]); // [most recent undo, ..., newest undo]

	// Human-readable change log
	let changeLog = $state<HistoryEntry[]>([]);
	// The clean state at load time, used to diff the very first edit
	let initialSnapshot = $state<string | null>(null);

	let snapshotTimer: ReturnType<typeof setTimeout> | null = null;

	function addLog(label: string, kind: HistoryEntry['kind']) {
		changeLog = [...changeLog.slice(-(MAX_HISTORY - 1)), { time: new SvelteDate(), label, kind }];
	}

	function scheduleSnapshot() {
		if (snapshotTimer) clearTimeout(snapshotTimer);
		snapshotTimer = setTimeout(() => {
			if (resultList) {
				const before = past.length > 0 ? past[past.length - 1] : null;
				const snap = JSON.stringify(resultList);
				const label = before ? describeChange(before, snap) : 'Edit';
				addLog(label, 'edit');
				past = [...past.slice(-(MAX_HISTORY - 1)), snap];
				future = [];
			}
			snapshotTimer = null;
		}, 500);
	}

	return {
		get resultList() {
			return resultList;
		},
		get parseError() {
			return parseError;
		},
		get isDirty() {
			return isDirty;
		},
		get rawXml() {
			return rawXml;
		},
		get canUndo() {
			return past.length > 0;
		},
		get canRedo() {
			return future.length > 0;
		},
		get changeLog(): HistoryEntry[] {
			return changeLog;
		},
		setResultList(rl: ResultList, xml?: string) {
			resultList = rl;
			parseError = null;
			isDirty = false;
			past = [];
			future = [];
			rawXml = xml ?? null;
			initialSnapshot = JSON.stringify(rl);
			addLog(`Loaded: ${rl.event.name}`, 'load');
		},
		setParseError(msg: string) {
			parseError = msg;
			resultList = null;
			isDirty = false;
			rawXml = null;
			past = [];
			future = [];
		},
		markDirty() {
			if (!isDirty) {
				// Snapshot the state just before the first change in a batch
				if (resultList) {
					const before = past.length > 0 ? past[past.length - 1] : initialSnapshot;
					const snap = JSON.stringify(resultList);
					const label = before ? describeChange(before, snap) : 'Edit';
					addLog(label, 'edit');
					past = [...past.slice(-(MAX_HISTORY - 1)), snap];
					future = [];
				}
				isDirty = true;
			} else {
				scheduleSnapshot();
			}
		},
		markClean() {
			isDirty = false;
		},
		undo() {
			if (!resultList || past.length === 0) return;
			const current = JSON.stringify(resultList);
			future = [current, ...future.slice(0, MAX_HISTORY - 1)];
			const prev = past[past.length - 1];
			past = past.slice(0, -1);
			resultList = JSON.parse(prev) as ResultList;
			isDirty = past.length > 0;
			addLog('↩ Undo', 'undo');
		},
		redo() {
			if (!resultList || future.length === 0) return;
			const current = JSON.stringify(resultList);
			past = [...past.slice(-(MAX_HISTORY - 1)), current];
			const next = future[0];
			future = future.slice(1);
			resultList = JSON.parse(next) as ResultList;
			isDirty = true;
			addLog('↪ Redo', 'redo');
		},
		clear() {
			resultList = null;
			parseError = null;
			isDirty = false;
			rawXml = null;
			past = [];
			future = [];
			changeLog = [];
			initialSnapshot = null;
		}
	};
})();
