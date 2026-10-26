# Decisions

One line each: what was chosen and why. 1 to 18 are from the v1 build; v2 (Grove) starts at 19 and wins where they differ.

1. A day with zero scheduled habits is excluded from overall consistency, week/month/weekday averages and streak evaluation (neither kept nor broken); Today shows "Add a habit to start". Avoids 0/0 and false streak breaks.
2. Fonts are self-hosted via `@fontsource-variable/inter` and `@fontsource/barlow-condensed` so the PWA works offline without a Google Fonts request.
3. Deleting a habit hard-deletes only if `createdAt` >= today (never scheduled on a past day). Otherwise it is archived with `archivedAt` = today, so no past day's percentage can change (section 11).
4. `ui.lastCelebratedLevel` starts at 1 so first launch never toasts; reset arc sets it back to 1 and removes archived habits, which have no check-offs after the wipe.
5. If the stored level is already above `lastCelebratedLevel` on load (e.g. after import), it syncs silently with no toast: celebrations fire only on live transitions.
6. When today is past the arc, streaks are evaluated ending at the arc's last day.
7. The header pill reads "Day X / {lengthDays}" rather than a hard-coded 90.
8. Calendar weeks start Monday (matching the Mon-Sun weekday breakdown). A week row's average covers the displayed month's arc days so far in that row. Future and out-of-arc cells get no dashed outline; dashed means a past unlogged day.
9. Before the arc starts, Today shows the countdown card and the habit preview only (no quick add, no check-in). After the arc ends, the Arc complete card only.
10. Weakest weekday = lowest average among weekdays with at least one arc day; ties pick the first in Mon-Sun order.
11. Confetti fires on every live crossing into 100%, including uncheck then recheck.
12. The Settings habit list shows active habits only; archived habits appear dimmed on the leaderboard only.
13. Goals get a remove button with confirmation, since the spec gives no way to remove one.
14. Confirmations use an in-app sheet, never `window.confirm`.
15. `ProgressRing` shows level progress in the hero card.
16. The day sheet shows the checklist only; mood and sleep stay editable on Today, and the mood strip reads moods.
17. Tailwind v4 with tokens in `@theme` (no config file). Vite `base` is `/winter-arc-tracker/` in every mode so preview and e2e match Pages.
18. Unit tests pin `TZ=America/Los_Angeles` in `test/setup.ts` so the DST and UTC-offset cases are deterministic on every machine.

## Grove (v2)

19. No v2 data shape ever shipped, so migration handles v1 and v3 only. v1 becomes one "Winter Arc" (winter, journal); goals, sleep, levels and categories are dropped; v1 moods 1-5 map to rough, low, okay, good, great.
20. The raw v1 data is parked once under `grove:backup:v1` and the old v1 key is left in place (the v3 key wins once it exists), so nothing is lost if the first save fails. Unreadable data is parked under `grove:backup:unreadable:<time>`, one key per blob. A storage read error never falls back to saving defaults: the session runs read-only and shows the save banner. Migrated v1 habit ids are replaced with uuids.
21. Storage goes through an async `StorageAdapter` (localStorage now, Preferences on iOS later), so `main.tsx` loads the state before the first render. Writes are chained so an older state never lands after a newer one.
22. Ids are UUIDs so every record is also a valid Postgres uuid for sync. The settings row uses the fixed local id `settings`.
23. `SyncOp` is `{ table, id, at }`, upsert only, one pending op per row (coalesced). Deletes are `deleted` tombstones; day logs are never deleted (a reset empties them).
24. Habit `createdAt`/`archivedAt`, arc `startDate`, log `date` and visitor `foundOn` are local `YYYY-MM-DD`; every `createdAt` of an arc, `frozenAt` and `updatedAt` is an ISO timestamp.
25. `ui` adds `signInPrompted` and `notificationsPrompted`; celebration keys are `bloom:<arcId>:<date>`, `arc:<arcId>`, `visitor:<visitorFoundId>`. `ui` is never synced.
26. Removing a habit archives it from today (past days unchanged, plant wilts); it becomes a deleted tombstone only when created today or later with no check-offs. Undo clears both.
27. Per-habit streak (row icon) = consecutive scheduled days done, ending today or yesterday while today is open. Days with nothing scheduled are skipped by every streak and the chain (carries v1 decision 1).
28. Kept = completion at or above the arc threshold; full = 100%. Rings use kept days over scored days per calendar month across all arcs; months with no arc are grey gaps.
29. A perfect week is a Mon-Sun week fully inside the arc and already finished, where every scored day is full.
30. Fresh installs start with no arcs and no habits (no sample data); the Garden says "Start your first arc to plant a garden."
31. The Vite base and the Pages path stay `/winter-arc-tracker/` so the deployed URL does not change; only the product name is Grove.
32. v1 e2e specs for screens v2 removes (Today, Calendar, Insights, Goals, polish) were deleted with those screens. Their surviving behaviours return as v2 specs in later phases.
33. Resetting an arc restarts it today (clears `frozenAt`), empties its logs (kept and queued so the reset syncs), clears its bloom and arc celebrations and recap flags, tombstones archived habits, and keeps found visitors because SPEC 7.3 says they are never lost.
34. Moving an arc's start moves the habits that began with it, but an archived habit never starts after its archive day; removing a habit that starts in the future archives it on its own start day. Both keep every state loadable.
