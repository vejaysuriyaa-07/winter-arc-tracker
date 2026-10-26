# NOTES

Resume point for the Winter Arc Tracker build. Spec: `docs/SPEC.md`. Decisions: `docs/DECISIONS.md`.

## Status

- Phase 1 (scaffold): done. Vite 8, React 19, TS 7 strict, Tailwind v4, React Router 8 HashRouter, Vitest 3, Playwright 1.64 (Chromium 1248 cached). `dates.ts` and `storage.ts` with tests (29 passing; corrupt stored data is parked under a backup key before defaults replace it). `store.ts` (useSyncExternalStore over storage) and `today.ts` (midnight rollover) in place; pages are placeholders.
- Phase 2 (stats): done. `src/lib/stats.ts` pure, `stats.fixture.ts` is a 14-day arc with the expected values worked in comments (unlogged day, habit added mid-arc, habit archived mid-arc, 100% day, broken streak, today in progress, zero-scheduled variant). 34 stats tests. Reviewer confirmed all fixture arithmetic; its one gap (not-kept final arc day after the arc) was added as a test.
- Next: Phase 3, Today screen (WaveProgress, HabitRow, StreakFlame, ProgressRing, QuickAdd, CheckIn) plus store actions and the e2e screenshot spec.

## Open issues

- Phase 1 reviewer pass was stopped before it reported; a self-check stood in for it (store snapshot stability, no UTC date paths, validation covers every field). Skipped, not failed.

## Test counts

Phase 1: 29 unit tests, 0 e2e.
Phase 2: 63 unit tests, 0 e2e.
