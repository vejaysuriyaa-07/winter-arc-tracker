# NOTES

Resume point for the Winter Arc Tracker build. Spec: `docs/SPEC.md`. Decisions: `docs/DECISIONS.md`.

## Status

- Phase 1 (scaffold): done. Vite 8, React 19, TS 7 strict, Tailwind v4, React Router 8 HashRouter, Vitest 3, Playwright 1.64 (Chromium 1248 cached). `dates.ts` and `storage.ts` with tests (29 passing; corrupt stored data is parked under a backup key before defaults replace it). `store.ts` (useSyncExternalStore over storage) and `today.ts` (midnight rollover) in place; pages are placeholders.
- Next: Phase 2, `src/lib/stats.ts` with the 14-day fixture (`stats.fixture.ts`) and one test per stat.

## Open issues

- Phase 1 reviewer pass was stopped before it reported; a self-check stood in for it (store snapshot stability, no UTC date paths, validation covers every field). Skipped, not failed.

## Test counts

Phase 1: 29 unit tests, 0 e2e.
