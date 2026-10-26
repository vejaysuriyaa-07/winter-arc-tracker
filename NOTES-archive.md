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
