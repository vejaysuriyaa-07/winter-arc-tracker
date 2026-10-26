# NOTES

Resume point for the Winter Arc Tracker build. Spec: `docs/SPEC.md`. Decisions: `docs/DECISIONS.md`.

## Status

- Phase 1 (scaffold): done. Vite 8, React 19, TS 7 strict, Tailwind v4, React Router 8 HashRouter, Vitest 3, Playwright 1.64 (Chromium 1248 cached). `dates.ts` and `storage.ts` with tests (29 passing; corrupt stored data is parked under a backup key before defaults replace it). `store.ts` (useSyncExternalStore over storage) and `today.ts` (midnight rollover) in place; pages are placeholders.
- Phase 2 (stats): done. `src/lib/stats.ts` pure, `stats.fixture.ts` is a 14-day arc with the expected values worked in comments (unlogged day, habit added mid-arc, habit archived mid-arc, 100% day, broken streak, today in progress, zero-scheduled variant). 34 stats tests. Reviewer confirmed all fixture arithmetic; its one gap (not-kept final arc day after the arc) was added as a test.
- Phase 3 (Today): done. WaveProgress (CSS drift, rAF fill tween to refs, gold at 100%), HabitRow, StreakFlame, ProgressRing, QuickAdd, CheckIn, ArcStatusCard (before/complete). Pure `mutations.ts` + store actions. Playwright config (Chromium phone emulation, TZ pinned) with `e2e/screens.spec.ts` (screenshots) and `e2e/today.spec.ts` (live update, reload persistence, quick add, check-in). Review fixes: sleep-hours input keeps local text; days-left in header; no-op writes keep state identity.
- Phase 4 (Calendar): done. Month grid with buckets (`bucketFor`), week/month averages, nav bounded by `arcMonths`, day sheet keyed by date with Edit toggle, mood strip as a 16-column wrapping grid, `useSheet` (Escape + scroll lock). Review fix: chosen month falls back when settings change under it. `e2e/calendar.spec.ts` asserts buckets, outside/future cells, averages, mood strip, nav bounds, read-only past day.
- Phase 5 (Insights): done. Consistency with formula, streaks, sleep (avg hours, avg score, sparkline), leaderboard, WaveChart (catmull-rom, gradient, draw-in with a forced flush, tooltip, hollow/today markers, 7/30/all keyed), weekday bars with weakest in red. Leaderboard, wave and weekday cards show empty states until the first check-off. e2e asserts hand-computed 67%, tie order, 7/13 markers, tooltip, reduced-motion instant line.
- Phase 6 (Goals, Settings): done. Goals with +1/-1, progress bar, remove with confirm; TreeGrowth (five hand-drawn stages from `TREE_STAGES`); Settings with draft-based number fields (commit on blur/Enter), habit edit/reorder/delete (DECISIONS 3 via `isHardDeletable`), export (Blob download), import (validate, error, confirm, replace), reset, scoring sheet. Review fixes: number fields no longer snap mid-typing; goal target must be > 0 in the validator; extra mutation tests. `store.ts` also gained `markCelebratedLevel`, used by Phase 7.
- Next: Phase 7 (polish + PWA) is drafted and its e2e passes; review pending. Then Phase 8 (smoke and rollover specs drafted, deploy workflow written).

## Open issues

- Phase 1 reviewer pass was stopped before it reported; a self-check stood in for it (store snapshot stability, no UTC date paths, validation covers every field). Skipped, not failed.

## Test counts

Phase 1: 29 unit tests, 0 e2e.
Phase 2: 63 unit tests, 0 e2e.
Phase 3: 77 unit tests, 11 e2e.
Phase 4: 80 unit tests, 12 e2e (counts at the phase 4 file set; working tree holds later phases' tests too).
Phase 5: 83 unit tests, 15 e2e (at the phase 5 file set).
Phase 6: 94 unit tests, 19 e2e (at the phase 6 file set).
