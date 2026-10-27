# NOTES

Resume point for Grove (v2). Spec: `docs/SPEC-v2.md`. Designs: `docs/design/` (README first). Decisions: `docs/DECISIONS.md`. Approved plan: phases 0 to 9 from SPEC-v2 section 12. History: `NOTES-archive.md`.

## Status

- Phase 0 (rebrand and data): done. v3 model, async storage adapter, v1 migration with backup, arc-scoped mutations and stats with a hand-worked fixture, four-tab shell with placeholders, Grove name and icon, spec fonts installed.
- Phase 1 (theme system and garden engine): done. Tokens and ThemeProvider/ThemeScope, scene loop with pause and freeze, NightSky, pure `lib/garden.ts`, `GardenScene`, showcase route behind `VITE_SHOWCASE` (deploy guard in the workflow). Screenshots reviewed (12 chrome, 20 garden, events, day 1, day 90).
- Phase 2 (Garden tab): done. Header and arc switcher sheet, date heading, garden card, mood row, habit rows with the two-phase check animation and animated streak icons, edit mode (drag reorder, X with undo toast), quick add, bloom mini flower, progress line, full-bloom moment (live transition only, scrolls into view), bloom chain card, before-start and finished states, empty states. Screenshots reviewed: 3 looks x 4 seasons (top and bottom), full bloom, before start.
- Phase 3 (Arcs, New arc, theme picker, switching, night in dark mode, arc complete): done. Screenshots reviewed in 3 looks x 2 seasons (arcs list, picker, New arc) plus arc complete.
- Phase 4 (Progress, Month view, Plant detail): done. Screenshots reviewed in 3 looks x 2 seasons.
- Phase 5 (rewards): done. Visitor rules and art for all 36, silent and live arrivals with garden entrances, rare skies (night, fireflies, bright stars, northern lights, rainbow, shooting star), Sunday recap with share. Screenshots reviewed: art sheet, visitors in 3 looks x 2 seasons, recap slides, skies.
- Phase 6 (Settings and data): done. This arc fields (name, theme, length, start, threshold) with limits that never end a running arc, habits editor sheet, scoring explainer (SPEC 9 in plain words), feel toggles, sounds, JSON export, import of v1 and v3 with a confirm, reset this arc. Screenshots reviewed in 3 looks x 2 seasons.
- Phase 7 (sync): code done. SQL with RLS and a newest-wins trigger (`supabase/migrations/0001_grove.sql`), RLS check (`supabase/tests/rls_check.sql`, 17 checks, verified on PGlite with a stand-in auth schema), sync engine against a strict fake remote, email-code sign in with the rate-limit line, Settings sync rows, one-time sign-in card, deploy keys from secrets. Screenshots reviewed in 3 looks x 2 seasons.
- Waiting on the owner: the steps in `docs/SYNC-SETUP.md` (project, SQL, RLS check output, email templates, keys, secrets). Then a two-device check after the next deploy.
- Phase 8 (iPhone app): code done, not yet run on a device. Capacitor 8 with SPM (`ios/`, JSON config), Preferences storage, haptics, 8pm and Sunday notifications with a one-time reminders card, status bar follows the look, icon and splash, `npm run ios`, `npm run ios:reinstall` (`scripts/ios-reinstall.sh`).
- Waiting on the owner: Xcode install and the iPhone steps. `@capacitor/filesystem` approved and wired: recap PNG and backup JSON go to the share sheet as files.
- Phase 9 (final): done in code. First-week flow e2e, every screen in 3 looks x 4 seasons (reviewed as contact sheets; fixed clipped Visitors tabs, stock focus ring, tiny young rings), `docs/ACCEPTANCE.md` (11 pass, sync partial, iPhone, 60fps on device and deploy pending the owner), frame-timing proxy `scripts/perf-proxy.mjs`.
- Next: owner items only. Paste the RLS check output; install Xcode and run the iPhone steps (include sharing a recap and a backup); push to deploy. Then update `docs/ACCEPTANCE.md` rows 12 to 15 with what the owner reports.

## Open issues

- RLS check has only run on PGlite with a stand-in auth schema; the real run on Supabase is the owner's step 5.
- The reinstall script is syntax-checked only; xcodebuild and devicectl need Xcode. iPhone file sharing is unit-tested, not yet seen on a device.

- Save banner clearing on the next good save is covered by `store.test.ts`; the e2e version returns in phase 2 when the Garden has check-offs.

## Owner notes (approved plan)

- `html-to-image` is pre-approved for the recap share image if SVG-to-canvas loses fonts.
- Sign in must show "Too many codes sent. Try again in a bit." on the Supabase OTP rate limit; mention the limit in the phase 7 steps.
- Free Apple ID only: no push, no Sign in with Apple, no TestFlight. Phase 8 adds `npm run ios:reinstall` with every command commented.

## Test counts

iPhone file sharing: 255 unit tests, 175 e2e. typecheck, test, build, build:native, e2e green (two full e2e runs).
Phase 2: 136 unit tests, 44 e2e.
Phase 3: 148 unit tests, 63 e2e. typecheck, test, build, e2e green.
Phase 4: 159 unit tests, 80 e2e. typecheck, test, build, e2e green.
Phase 9: 248 unit tests, 175 e2e. typecheck, test, build, build:native, e2e green (two full e2e runs). Frame proxy: 16.7 ms median, 16.8 ms p95.
Phase 8: 247 unit tests, 138 e2e. typecheck, test, build, build:native, e2e green (two full e2e runs).
Phase 7: 234 unit tests, 131 e2e. typecheck, test, build, e2e green (two full e2e runs).
Phase 6: 196 unit tests, 114 e2e. typecheck, test, build, e2e green (two full e2e runs).
Phase 5: 188 unit tests, 95 e2e. typecheck, test, build, e2e green (two full e2e runs). typecheck, test, build, e2e green.

Phase 1: 129 unit tests, 20 e2e. typecheck, test, build, e2e green.

Phase 0: 98 unit tests, 5 e2e. Review fixes: state stays loadable after start moves, reset syncs, no defaults saved over unread data, uuid habit ids. typecheck, test, build, e2e green.
