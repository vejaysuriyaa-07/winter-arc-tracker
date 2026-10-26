# NOTES

Resume point for Grove (v2). Spec: `docs/SPEC-v2.md`. Designs: `docs/design/` (README first). Decisions: `docs/DECISIONS.md`. Approved plan: phases 0 to 9 from SPEC-v2 section 12. History: `NOTES-archive.md`.

## Status

- Phase 0 (rebrand and data): done. v3 model, async storage adapter, v1 migration with backup, arc-scoped mutations and stats with a hand-worked fixture, four-tab shell with placeholders, Grove name and icon, spec fonts installed.
- Phase 1 (theme system and garden engine): done. Tokens and ThemeProvider/ThemeScope, scene loop with pause and freeze, NightSky, pure `lib/garden.ts`, `GardenScene`, showcase route behind `VITE_SHOWCASE` (deploy guard in the workflow). Screenshots reviewed (12 chrome, 20 garden, events, day 1, day 90).
- Next: phase 2, the Garden tab (SPEC 5.1): header and arc switcher, date heading, garden card, mood row, habit rows with the check animation and animated streak icons, edit mode with undo, quick add, bloom mini flower, progress line, full-bloom moment, bloom chain card, before-start state.

## Open issues

- Save banner clearing on the next good save is covered by `store.test.ts`; the e2e version returns in phase 2 when the Garden has check-offs.

## Owner notes (approved plan)

- `html-to-image` is pre-approved for the recap share image if SVG-to-canvas loses fonts.
- Sign in must show "Too many codes sent. Try again in a bit." on the Supabase OTP rate limit; mention the limit in the phase 7 steps.
- Free Apple ID only: no push, no Sign in with Apple, no TestFlight. Phase 8 adds `npm run ios:reinstall` with every command commented.

## Test counts

Phase 1: 129 unit tests, 20 e2e. typecheck, test, build, e2e green.

Phase 0: 98 unit tests, 5 e2e. Review fixes: state stays loadable after start moves, reset syncs, no defaults saved over unread data, uuid habit ids. typecheck, test, build, e2e green.
