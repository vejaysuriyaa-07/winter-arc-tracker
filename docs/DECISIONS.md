# Decisions

One line each: what was chosen and why. Numbering follows the approved build plan.

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
