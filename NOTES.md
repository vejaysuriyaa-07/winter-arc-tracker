# NOTES

Resume point for Grove (v2). Spec: `docs/SPEC-v2.md`. Designs: `docs/design/` (README first). Decisions: `docs/DECISIONS.md`. Approved plan: phases 0 to 9 from SPEC-v2 section 12. History: `NOTES-archive.md`.

## Status

- Phase 0 (rebrand and data): done. v3 model, async storage adapter, v1 migration with backup, arc-scoped mutations and stats with a hand-worked fixture, four-tab shell with placeholders, Grove name and icon, spec fonts installed.
- Next: phase 1, theme system (three looks x four seasons from `Skin.dc.html`) and the garden engine (`lib/garden.ts`, `GardenScene`) with a DEV-only showcase route for screenshots.

## Open issues

- Save banner clearing on the next good save is covered by `store.test.ts`; the e2e version returns in phase 2 when the Garden has check-offs.

## Owner notes (approved plan)

- `html-to-image` is pre-approved for the recap share image if SVG-to-canvas loses fonts.
- Sign in must show "Too many codes sent. Try again in a bit." on the Supabase OTP rate limit; mention the limit in the phase 7 steps.
- Free Apple ID only: no push, no Sign in with Apple, no TestFlight. Phase 8 adds `npm run ios:reinstall` with every command commented.

## Test counts

Phase 0: 98 unit tests, 5 e2e. Review fixes: state stays loadable after start moves, reset syncs, no defaults saved over unread data, uuid habit ids. typecheck, test, build, e2e green.
