## Working conventions

- **Run `npm test`, `npm run check` and `npm run lint` after every meaningful change.** Don't
  let failures accumulate.
- **Commit after each phase and after each numbered subphase** where it makes
  sense as a standalone change.
- Update this game plan document as you progress.
- **Conventional commits, no emojis, brief subject lines.** Format:
  `type(scope): short description` — e.g. `feat(parser): add IOF XML parser`,
  `chore: remove jsdom dependency`, `fix(html): escape XML-derived values`.
  Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`.
- Always use `--save-exact` when installing npm dependencies.
- If adding documentation as markdown, adhere to the principle of one sentence per line.
- **README must be kept up to date.** After Phase 1 is done, update `README.md`
  with a one-paragraph intro and minimal usage instructions.
- Use latest node (v24)

## Objective

A static single-page application (SPA) that lets orienteering race organizers
edit IOF XML 3.0 result lists through a GUI, fix errors, and download the
corrected file.
All processing happens in the browser — no backend is required.

### Editable fields (non-exhaustive)

- Event name and dates
- Class name and course info (length, climb)
- Runner name (family + given), club/organisation, bib number
- Result status (OK, DNS, DNF, Disqualified, MissingPunch, etc.)
- Start time, finish time, total time
- Split times (control code + time); add, remove, reorder
- Add or remove runners from a class
- Relay: team name, team member results
- Patrol/relay toggle (PersonResult ↔ TeamResult)

### Chosen stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | **SvelteKit 2 + Svelte 5** (TypeScript) | Fine-grained reactivity via runes, tiny bundle, minimal boilerplate |
| Build | **Vite** (bundled with SvelteKit) | Fast HMR, first-class TS support |
| Adapter | **@sveltejs/adapter-static** | Emits plain HTML/JS/CSS; host anywhere |
| XML I/O | **Browser-native DOMParser / XMLSerializer** | Zero dependencies, spec-conformant namespace handling |
| Styling | **Tailwind CSS v4** | Utility-first, fully tree-shaken, low maintenance |
| Testing | **Vitest** | Native Vite integration, same config |
| Linting | **ESLint + eslint-plugin-svelte** | Catches Svelte-specific mistakes |
| Hosting | **Cloudflare Pages** (free tier) | Global CDN, no build-minutes cap on free plan |
| CI | **GitHub Actions** | Lint + test on every push; deploy on main |

No backend is required.
The user loads a `.xml` file, edits it in the browser, and downloads the result.

---

## Game plan

### Phase 0 — Project bootstrap [ ]

0.1. `npm create svelte@latest` — SvelteKit, TypeScript, ESLint, Vitest, no Playwright.
0.2. Install and configure `@sveltejs/adapter-static`; set `fallback: '404.html'`.
0.3. Install Tailwind CSS v4 following the SvelteKit integration guide.
0.4. Confirm `npm test` and `npm run lint` both pass on the empty project.
0.5. Add `examples/` and `iof.xsd` to the repo (already present).
0.6. Commit: `chore: bootstrap SvelteKit project with static adapter and Tailwind`.

### Phase 1 — IOF XML data model and round-trip parser [ ]

1.1. Define TypeScript types in `src/lib/iof/types.ts` covering:
     - `ResultList`, `Event`, `ClassResult`, `Course`
     - `PersonResult`, `TeamResult`, `TeamMemberResult`
     - `Result`, `SplitTime`
     - All `Status` enum values from the XSD
     - Relay legs, multi-race `raceNumber` attributes
1.2. Implement `src/lib/iof/parse.ts` — `DOMParser`-based XML → typed model,
     preserving unknown elements/attributes for lossless round-trip.
1.3. Implement `src/lib/iof/serialize.ts` — typed model → IOF XML string,
     correct namespace declaration, `iofVersion="3.0"`.
1.4. Write Vitest unit tests (`src/lib/iof/parse.test.ts`) round-tripping all
     five example files in `examples/`; assert structural equality.
1.5. `npm test` passes.
1.6. Update `README.md` with intro paragraph and file-upload usage sketch.
1.7. Commit: `feat(parser): add IOF XML 3.0 round-trip parser`.

### Phase 2 — File I/O [ ]

2.1. `src/lib/components/FileLoader.svelte` — `<input type="file" accept=".xml">`
     that emits a parsed `ResultList` to the parent.
2.2. `src/lib/components/ExportButton.svelte` — serializes current model and
     triggers a browser download of the `.xml` file.
2.3. Error handling: display a user-visible message for malformed XML or
     unrecognised root element.
2.4. `npm test && npm run lint`.
2.5. Commit: `feat(io): file upload and XML export`.

### Phase 3 — Read-only result display [ ]

3.1. `src/routes/+page.svelte` — top-level layout: event header, list of classes.
3.2. `EventHeader.svelte` — event name, dates, status badge.
3.3. `ClassResultPanel.svelte` — class name, course length/climb, result table.
3.4. `PersonResultRow.svelte` — position, name, club, bib, time, status.
3.5. `SplitTimeList.svelte` — expandable split table per runner (control +
     cumulative time + leg time).
3.6. `TeamResultPanel.svelte` — relay team header + team-member result rows.
3.7. `npm test && npm run lint`.
3.8. Commit: `feat(display): read-only result list rendering`.

### Phase 4 — Inline editing: runner level [ ]

4.1. Make name fields (Family, Given) inline-editable (`contenteditable` or
     `<input>` on click).
4.2. Editable organisation/club name and country code.
4.3. Editable bib number.
4.4. Status dropdown (all XSD status values).
4.5. Editable start time, finish time, total time (seconds input with
     `MM:SS` / `H:MM:SS` display helper).
4.6. Auto-recalculate `Position` and `TimeBehind` across the class after any
     time or status change.
4.7. Add runner button — inserts a blank `PersonResult` at the bottom of a class.
4.8. Remove runner button (with confirmation).
4.9. `npm test && npm run lint`.
4.10. Commit: `feat(edit): inline runner-level editing`.

### Phase 5 — Inline editing: split level [ ]

5.1. Edit control code and split time for each `SplitTime`.
5.2. Add split — appends a new `SplitTime` entry for a runner.
5.3. Remove split.
5.4. Reorder splits (up/down arrow buttons; drag-and-drop as stretch goal).
5.5. `npm test && npm run lint`.
5.6. Commit: `feat(edit): split time editing`.

### Phase 6 — Inline editing: class and event level [ ]

6.1. Edit event name and event dates.
6.2. Edit class name.
6.3. Edit course length and climb (per race number for multi-race events).
6.4. Add a new `ClassResult`.
6.5. Remove a `ClassResult` (with confirmation).
6.6. Toggle class type between individual (PersonResult) and relay (TeamResult);
     migrate results to the new shape with sane defaults.
6.7. `npm test && npm run lint`.
6.8. Commit: `feat(edit): class and event level editing`.

### Phase 7 — UX polish [ ]

7.1. Undo / redo — maintain a history stack of immutable snapshots; Ctrl+Z /
     Ctrl+Y keyboard shortcuts.
7.2. "Unsaved changes" indicator in the page title / header.
7.3. Keyboard navigation inside result tables (Tab, Enter to confirm, Escape
     to cancel).
7.4. Input validation — highlight cells with impossible values (negative time,
     finish before start, duplicate positions).
7.5. Responsive layout — full-featured on desktop (≥1024 px), usable on tablet.
7.5. Implement ligt mode / dark mode, selected with media query by the user system preference.
7.7. `npm test && npm run lint`.
7.8. Commit: `feat(ux): undo-redo, validation, keyboard nav, responsive layout`.

### Phase 8 — CI / CD and deployment [ ]

8.1. `.github/workflows/ci.yml` — lint + test on every push and pull request.
8.2. `.github/workflows/deploy.yml` — build and publish to Cloudflare Pages on
     push to `main` (using `cloudflare/pages-action`).

Manual steps by the user:
8.3. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets to the repo.
8.4. Update `README.md` with the live URL, full feature list, and local dev
     instructions (`npm run dev`).
8.5. Commit: `chore(ci): add GitHub Actions CI and Cloudflare Pages deployment`.

---

## Progress log

| Phase | Status | Commit |
|---|---|---|
| 0 — Bootstrap | done | feat(parser): add IOF XML 3.0 round-trip parser |
| 1 — Parser | done | feat(parser): add IOF XML 3.0 round-trip parser |
| 2 — File I/O | done | feat(app): full SvelteKit SPA with editing, UX polish, and CI |
| 3 — Display | done | feat(app): full SvelteKit SPA with editing, UX polish, and CI |
| 4 — Runner editing | done | feat(app): full SvelteKit SPA with editing, UX polish, and CI |
| 5 — Split editing | done | feat(app): full SvelteKit SPA with editing, UX polish, and CI |
| 6 — Class/event editing | done | feat(app): full SvelteKit SPA with editing, UX polish, and CI |
| 7 — UX polish | done | feat(app): full SvelteKit SPA with editing, UX polish, and CI |
| 8 — CI/CD | done | feat(app): full SvelteKit SPA with editing, UX polish, and CI |
