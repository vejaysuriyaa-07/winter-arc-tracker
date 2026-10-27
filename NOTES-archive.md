# NOTES archive

## 2026-10-26: v1 Winter Arc Tracker (complete, superseded by Grove v2)

## Status

- Phase 1 (scaffold): done. Vite 8, React 19, TS 7 strict, Tailwind v4, React Router 8 HashRouter, Vitest 3, Playwright 1.64 (Chromium 1248 cached). `dates.ts` and `storage.ts` with tests (29 passing; corrupt stored data is parked under a backup key before defaults replace it). `store.ts` (useSyncExternalStore over storage) and `today.ts` (midnight rollover) in place; pages are placeholders.
- Phase 2 (stats): done. `src/lib/stats.ts` pure, `stats.fixture.ts` is a 14-day arc with the expected values worked in comments (unlogged day, habit added mid-arc, habit archived mid-arc, 100% day, broken streak, today in progress, zero-scheduled variant). 34 stats tests. Reviewer confirmed all fixture arithmetic; its one gap (not-kept final arc day after the arc) was added as a test.
- Phase 3 (Today): done. WaveProgress (CSS drift, rAF fill tween to refs, gold at 100%), HabitRow, StreakFlame, ProgressRing, QuickAdd, CheckIn, ArcStatusCard (before/complete). Pure `mutations.ts` + store actions. Playwright config (Chromium phone emulation, TZ pinned) with `e2e/screens.spec.ts` (screenshots) and `e2e/today.spec.ts` (live update, reload persistence, quick add, check-in). Review fixes: sleep-hours input keeps local text; days-left in header; no-op writes keep state identity.
- Phase 4 (Calendar): done. Month grid with buckets (`bucketFor`), week/month averages, nav bounded by `arcMonths`, day sheet keyed by date with Edit toggle, mood strip as a 16-column wrapping grid, `useSheet` (Escape + scroll lock). Review fix: chosen month falls back when settings change under it. `e2e/calendar.spec.ts` asserts buckets, outside/future cells, averages, mood strip, nav bounds, read-only past day.
- Phase 5 (Insights): done. Consistency with formula, streaks, sleep (avg hours, avg score, sparkline), leaderboard, WaveChart (catmull-rom, gradient, draw-in with a forced flush, tooltip, hollow/today markers, 7/30/all keyed), weekday bars with weakest in red. Leaderboard, wave and weekday cards show empty states until the first check-off. e2e asserts hand-computed 67%, tie order, 7/13 markers, tooltip, reduced-motion instant line.
- Phase 6 (Goals, Settings): done. Goals with +1/-1, progress bar, remove with confirm; TreeGrowth (five hand-drawn stages from `TREE_STAGES`); Settings with draft-based number fields (commit on blur/Enter), habit edit/reorder/delete (DECISIONS 3 via `isHardDeletable`), export (Blob download), import (validate, error, confirm, replace), reset, scoring sheet. Review fixes: number fields no longer snap mid-typing; goal target must be > 0 in the validator; extra mutation tests. `store.ts` also gained `markCelebratedLevel`, used by Phase 7.
- Phase 7 (polish + PWA): done. Check pop (Motion, `initial={false}`), wave splash (crest scaleY keyframe restarted via classList), gold + confetti + % pulse on a live crossing only, level-up toast (`useLevelUp`: silent sync on first load and on import), CountUp numbers via rAF to refs, `MotionConfig reducedMotion="user"`, PWA manifest + service worker (latin fonts precached), icons rendered by `scripts/make-icons.mjs`. e2e: gold/confetti, toast once, silent sync, import no-toast, manifest + SW, reduced motion.
- Phase 8 (final): done. `e2e/smoke.spec.ts` (SPEC 10.8 end to end), `e2e/rollover.spec.ts` (fake clock with an explicit PST offset; proves rollover, not reset), `.github/workflows/deploy.yml` (typecheck, unit, Playwright e2e, build, Pages deploy). Every screen screenshotted at 390x844 and reviewed. First deploy needs the repo's Pages source set to GitHub Actions; nothing has been pushed.
- Save-failure banner (2026-10-26): `useSaveFailed()` in the store; `App.tsx` shows a persistent alert on every screen while the last write was refused, cleared by the next successful save. `e2e/save-failure.spec.ts` throws from `Storage.prototype.setItem`, checks the banner across screens, restores storage and checks it clears.
- All eight phases complete. Acceptance checklist delivered in the session summary.

## Open issues

- Phase 1 review ran after the build finished (2026-10-26). Fixed: `save` no longer throws on a full or blocked storage (returns false, `lastSaveFailed()` exposed, subscribers still notified); validator rejects duplicate habit/goal ids, archivedAt before createdAt, fractional order and celebrated level, drops check-offs of unknown habits; backup key written only when absent; `isValidYMD` requires years 1000-9999; `addMonths` floor-mod; `today.ts` re-checks the day when the first subscriber arrives. New tests: `store.test.ts`, `today.test.ts`, extra dates and storage cases.

## Test counts

Phase 1: 29 unit tests, 0 e2e.
Phase 2: 63 unit tests, 0 e2e.
Phase 3: 77 unit tests, 11 e2e.
Phase 4: 80 unit tests, 12 e2e (counts at the phase 4 file set; working tree holds later phases' tests too).
Phase 5: 83 unit tests, 15 e2e (at the phase 5 file set).
Phase 6: 94 unit tests, 19 e2e (at the phase 6 file set).
Phase 7: 95 unit tests, 25 e2e (at the phase 7 file set).
Phase 8: 95 unit tests, 27 e2e. typecheck, test, build, e2e all green.
Post-build Phase 1 review: 113 unit tests, 27 e2e, all green.
Save-failure banner: 114 unit tests, 28 e2e, all green.

## 2026-10-26: Grove phase 0, rebrand and data

- New v3 model in `src/types.ts`; `lib/ids.ts`, `lib/migrate.ts` (v1 to v3), `lib/storage.ts` rewritten around an async `StorageAdapter`, `lib/mutations.ts` and `lib/stats.ts` rewritten arc-scoped, `lib/fixtures/arc14.ts` hand-worked fixture, `lib/store.ts` async init with chained writes.
- Removed v1-only screens, components, helpers, their tests and the matching e2e specs (DECISIONS 32). Removed canvas-confetti, Barlow and Inter; added the six spec fonts.
- Rebrand: title, manifest, package name, icon (italic Fraunces "Grove" with a small pine on warm paper; renderer embeds the font).
- e2e: smoke, migration, rollover, save-failure.
- Review (fresh-context reviewer): fixed archived habits starting after their archive day, v1 key removal before the v3 save, defaults saved over unreadable or unread data, reset not syncing and keeping frozenAt, non-uuid migrated ids. Added tests for each plus bucketFor, full runs, lifetime counts, perfect-week edges, store write order.
- Counts: 98 unit tests, 5 e2e.

## 2026-10-26: Grove phase 1, theme system and garden engine

- `src/theme/tokens.ts` (port of Skin.dc.html) with tests against SPEC 4.1; `ThemeProvider` and `ThemeScope` write `--g-*` variables, Tailwind reads them through `@theme inline`.
- `src/lib/garden.ts` (port of Garden.dc.html: palettes, plantShape, slots, flowers, birds, weather, sky, scene model, node cap) with tests; `gardenFromState` renders any arc at any day.
- `src/scenes/useSceneLoop.ts`, `GardenScene.tsx`, `NightSky.tsx`; `#/dev/showcase` behind `VITE_SHOWCASE`.
- Screenshot review found the date heading drawn as a gradient box after a look change (background shorthand reset background-clip); fixed with background-image.
- Review fixes: scoped utilities (`@theme inline`), body background keeps `fixed`, frozen frame redrawn after each render, Night stars steady when frozen, bloom transition frozen with the toggle, layout effects to avoid a first-paint flash, shared `activeArc`, node cap holds at 120 plants, frame-counted waits instead of timeouts, deploy guard for the showcase.
- Counts: 129 unit tests, 20 e2e.

## 2026-10-26: Grove phase 2, Garden tab

- `lib/today-view.ts` (rows, streak icon rules, mood labels, once-per-day bloom rule) with tests; `lib/feedback.ts` no-op hook for haptics.
- `components/garden/*`: Header with arc switcher sheet, MoodRow, HabitList (drag reorder by handle), HabitRow (two-phase check fx), StreakIcon with one page loop (`scenes/streakIcons.ts`), Bloom (mini, full-bloom moment, chain), QuickAdd; `components/ui/Sheet`, `UndoToast`.
- e2e `garden.spec.ts`: growth and counts with reload, mood saved, icons by streak and mood, remove with undo and unchanged past, full bloom once, before start, finished arc, quick add, drag reorder, chain strip, 12 look x season screenshots.
- Fixed while testing: screenshot loop reused the first seed (init scripts stack), the drag handle sat under the tab bar in the test, full bloom played off screen (now scrolls into view), mini bloom petals reshaped.
- Review fixes: frozen icons register before the static frame, bloom only after a local check, finished arcs read-only, check fx cancelled on fast uncheck, accessible names for rows and the switcher, 44px switcher, loop root always mounted.
- Counts: 136 unit tests, 44 e2e.

## 2026-10-26: Grove phase 3, arcs and themes

- `lib/arcs.ts` (status labels, arc-complete rule, summary, season by month, mark finished arcs celebrated) with tests; `previewModel` in `lib/garden.ts`.
- Arcs tab (cards in each arc's own theme), New arc (live restyle, look and season cards, length, start date, bring habits, add habits), ThemePicker sheet with live preview, minimal Settings (theme row, night-look switch), ArcComplete overlay via a gate in the shell.
- Fixed while testing: overlays sat under the tab bar (page z-index context), now portaled; arc card scenes cropped the plants; preview label fade.
- Review fixes: cleared start date no longer crashes, custom length validated, Cancel on a cold load, start date follows midnight, frozen arcs and migrated finished arcs never celebrate, celebration haptic on arrival, close-once guard, overlay stack with Escape, inert background and focus return, roving radio groups, dark-mode note in the picker.
- Counts: 148 unit tests, 63 e2e.

## 2026-10-26: Grove phase 4, progress, month view, plant detail

- `lib/progress.ts` (tiles, plants ranked, week line, timelapse range, plant days, habit across arcs, tree rings, best month, tallest trees) with fixture tests.
- Progress page (timelapse with play and slider, tiles, plants, week, visitors row; all time rings with month buttons, lifetime counts, grove strip, tallest trees), Month view (buckets, legend, last 7 days, backfill sheet with Edit), Plant detail (swaying tree, tiles, day grid, across arcs, edit, remove), plant taps in the garden, scroll to top on navigation.
- e2e `progress.spec.ts` with a hand-worked state (53% score, 76% last 7, +29, 12% ring, 41 check-offs).
- Process note: the scroll-to-top test was written together with its fix rather than shown failing first.
- Review fixes: same-day-only restore (past days never change), finished arcs read-only, deleted arcs' plants not found, tombstone undo, Close on deep links, non-overlapping plant tap targets, decorations ignore taps, timelapse keyed by arc, ring wording, memoized all-time numbers.
- Counts: 159 unit tests, 80 e2e.

## 2026-10-26: Grove phase 5, rewards

- `lib/visitors.ts` (36 visitors, rule ladder with scaling, seeded rare roll, first-day search, progress, next visitor, wording, garden visitor, per-season counting, pending entrances), `lib/sky.ts`, `lib/recap.ts`, `lib/share.ts`, `art/visitors.ts` (winter ported, 27 drawn), `syncVisitors` in mutations (silent on load, import, theme change and other tabs; live otherwise).
- UI: VisitorWatcher toasts, GardenVisitor entrance, Visitors page, Recap story with share, recap cards on Garden and Progress, chain teaser from the next visitor.
- Added dependency `html-to-image` (pre-approved for the share image).
- Fixed while testing: plural and sky visitor wording; a recap test that ignored earlier unseen weeks; a flaky spark check replaced by a stable counter.
- Review fixes: season change counting, iOS share inside the tap with an opaque image, recap week numbers, next-visitor scope, queued entrances, finished arcs skipped in live checks, quiet cross-tab sync, recap slide announcements.
- Counts: 188 unit tests, 95 e2e.

## 2026-10-26 Phase 6: Settings and data

- Built: Settings page in the arc's look (This arc, Feel, Your data, Reset), `components/settings/{Fields,Sheets}.tsx`, `lib/backup.ts` (file name, summary of a backup), `lib/sounds.ts` (WebAudio tones on check, full bloom, visitor arrival, only when Sounds is on), `arcEditLimits` in `lib/arcs.ts`.
- Screenshot fix: number fields had a curved underline; they now use the look's input style. Nudge copy shortened.
- Review fixes, each with a test that failed first: start date committed on every change (now on Enter or blur; Chromium keeps focus inside a date field on blur(), so Enter commits directly); edits could end a running arc and fire the arc-complete overlay (limits); finished arcs were editable (now text); lowering the threshold announced visitors live (now quiet sync in the updateArc action); scoring copy (removal day, per-habit rate, rings as a rate, 7-day minimum); reset copy omitted removed habits; blank habit name; unhandled audio resume rejection; technical import error text.
- Test expectations changed: the first Settings test now presses Enter after setting the start date (the field commits on Enter by design); the invalid-file note expects the new plain copy.
- Deferred: import vs sync queue (phase 7), native export (phase 8). Logged in NOTES open issues.
- Counts: 196 unit, 114 e2e. Hygiene check passed.

## 2026-10-26 Phase 7: Sync

- Built: `supabase/migrations/0001_grove.sql` (five tables keyed by (user_id, id), RLS per command, anon revoked, trigger keeps the newest row and stamps synced_at), `supabase/tests/rls_check.sql`, `lib/sync-engine.ts` (rows, push, keyset pull, merge, import, sign-in rule, guard), `lib/sync.ts` (the only Supabase module: client, OTP sign in, remote, driver, status), `lib/prompts.ts`, `lib/ids.ts` stableId, auth session storage and last-account memory in `lib/storage.ts`, Sign in page, Settings sync rows, sign-in card, `docs/SYNC-SETUP.md`.
- SQL verified in the scratchpad on PGlite with a stand-in auth schema: migration runs twice cleanly, 17 RLS checks pass, the check fails as expected with RLS off on one table, a stale upsert keeps the newer row and re-stamps it.
- e2e: the test build points at `http://supabase.test`, answered by `e2e/fakeSupabase.ts`; the deploy workflow refuses a build containing that host; Playwright never reuses a running server.
- Test expectation changes: engine tests moved to uuid fixture ids once the fake server enforced uuids; the incremental pull test asserts the one-minute overlap rule instead of zero rows; the in-flight test checks the round's final push; the export round trip compares content without timestamps (imports are restamped by design).
- Review fixes (each with a failing run first, except the e2e account-switch test, written after its fix): different account on one device, runs outliving sign out, bad rows blocking sync, stale writes not coming back, offset paging, arcs finished through a pull, import leftovers, prompt flash, read-only store status.
- Counts: 234 unit, 131 e2e. Hygiene check passed.

## 2026-10-26 Phase 8: iPhone app

- Built: Capacitor 8.5 core and iOS, plugins preferences, haptics, local-notifications, share, status-bar, splash-screen; `capacitor.config.json` (the CLI cannot load a .ts config with TypeScript 7 on Node 23.1); `ios/` created by `cap add ios` (SPM, no Xcode needed); portrait only; `VITE_TARGET=native` build (base ./, no PWA); index.html icon links follow the base; `lib/nudges.ts` (plan, prompt rule, haptic map, plan application), `lib/native.ts`, `nativeStorage` in storage.ts, reminders card, Settings permission handling, showcase view for the card, icon and splash via `scripts/make-icons.mjs`, `scripts/ios-reinstall.sh`.
- Review fixes, with failing runs first: nudge on days with nothing due; tomorrow's nudge when today is kept; cutoff before 20:00 and retry after a failed schedule; card skipped when a reminder is on; permission state on Settings; cards wait for the session; replan timer; reachable wired iPhone first and optional team id in the script; Preferences import moved into storage.ts.
- PARTIAL: recap image and backup file sharing on iPhone wait for `@capacitor/filesystem` approval.
- Counts: 247 unit, 138 e2e. Hygiene check passed.

## 2026-10-26 Phase 9: Final

- Built: `e2e/flows.spec.ts` (a first week end to end: first arc, three days, four scaled autumn visitors arriving once, Sunday recap, second arc in night summer, switch back, export, reset, import), `e2e/screens.spec.ts` (14 screens x 3 looks x 4 seasons into `screenshots/p9/`), `docs/ACCEPTANCE.md`, `scripts/perf-proxy.mjs`.
- Screenshot review (contact sheets, looks by seasons) found: Visitors season tabs clipped "Autumn" at 390px (now a 4-column grid, each tab checked to fit); the arc-complete button showed the browser's blue focus ring (now the look's accent, in the base layer so fields keep outline-none, colour checked against the arc's accent); a one-month tree ring was a dot in an empty card (`ringsViewBox` zooms up to 2.5x, unit-tested).
- Review fixes: focus rule layering, perf evidence committed, flow absence checks wait for the garden to render, real full-bloom check, reset checked through Progress, explicit -07:00 times, screenshot paths, per-tab fit check, reduced motion instead of a sleep for the arc-complete still.
- Test expectation note: the flow expects four autumn visitors on day 3 because a 30-day arc scales the counts down (decision 6).
- Counts: 248 unit, 175 e2e. Hygiene check passed.

## 2026-10-26 iPhone file sharing, and a flaky test fixed

- `@capacitor/filesystem` approved: the recap PNG and the backup JSON are written to the app cache and shared as files (`shareAsFile` in share.ts with injected writer and share, unit-tested for order, cancel, write failure and conversion failure). Decision 108 supersedes 103.
- Flaky e2e found during the gate: "this arc: tiles, plants and week match the hand-worked numbers" failed in about 1 run in 20 under load. Cause: its arc id was random, and the rare visitor's 1-in-50 roll is seeded by the arc id, so on some ids a shooting star arrived and the "0 of 9 found" line read "1 of 9". Fix: the test data pins the arc id (`withArcId`); the first-week flow pins ids with a fixed `crypto.randomUUID` sequence kept across reloads. Verified with 15 and 5 repeated parallel runs.
- Counts: 255 unit, 175 e2e. Hygiene check passed.
