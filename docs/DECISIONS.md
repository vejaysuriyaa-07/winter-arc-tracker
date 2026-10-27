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
35. Theme tokens are a pure port of `Skin.dc.html` (`src/theme/tokens.ts`); ThemeProvider writes them as `--g-*` CSS variables on `<html>` and Tailwind colours and fonts read those variables. ThemeScope applies a different look and season to a subtree (arc cards, New arc, theme picker).
36. Cards, sheets and tiles that `Skin.dc.html` does not draw use the look's list style: hairline paper card (journal), soft tile (greenhouse), grouped dark card (night).
37. The scene showcase route (`#/dev/showcase`) is compiled in only when `VITE_SHOWCASE=1`, which the Playwright build sets; the deploy build does not, so it never ships.
38. Fewer than nine plants spread across the design's nine slots (one plant takes the centre); more than nine narrow the spacing, then shrink so bases keep half a pixel apart.
39. When a scene would pass 150 animated nodes, precipitation gives way first, then fireflies, then stars; every habit keeps its plant.
40. Gradient text uses `background-image`, never the `background` shorthand, because rewriting the shorthand resets `background-clip` when the look changes.
41. The full-bloom flower in the garden keeps a gold centre (the design file used the season's bloomB) because SPEC 13 says full bloom plants a gold-centred flower.
42. Under reduced motion or the motion toggle, the frozen frame is redrawn after every render, so a changed scene (mood, a new habit) is also static and correctly placed.
43. The bloom chain strip shows each of the last seven calendar days: gold centre full, accent kept, faded missed, outlined while today is open, nearly invisible outside the arc or with nothing scheduled. Its teaser reads "Keep the chain going. Kept days bring visitors to your garden." until visitors exist (phase 5).
44. Before the start date the habit list shows day 1's habits disabled, the header reads "Day 1", the garden shows seed mounds with a "Starts in N days" pill, and no chain card. After the last day the garden and list freeze at the last day (the celebration comes in phase 3).
45. Full bloom plays once per arc and day, and only when a check made on this screen completes the day: removing the last open habit, a sync pull or another tab never plays it, and unchecking then re-checking does not replay it. When it plays, the garden card scrolls into view so it is seen.
48. A finished arc's Garden is read-only: no Edit, no quick add, no check-offs, no mood changes.
46. Physical feedback goes through `lib/feedback.ts` (no-op on the web); the native build plugs in haptics in phase 8.
47. With no arc, the Garden tab says "Start your first arc to plant a garden." with a button to New arc; an arc with no habits says "Add your first habit below."
49. A new arc defaults to the season of the calendar month (Dec-Feb winter, Mar-May spring, Jun-Aug summer, Sep-Nov autumn), the current arc's look, 90 days, and today; it can start today or later; custom length is 1 to 365 days. An empty name uses "<Season> Arc".
50. "Bring habits" copies the chosen habits' names and details into the new arc as new habits starting on its first day (fresh seeds); the old arc keeps its own.
51. The arc-complete celebration shows once per finished arc, the first time the app is open after its last day ends (live at midnight when open). Closing it freezes the arc (`frozenAt`). Imported data and data migrated from v1 mark arcs already finished as celebrated, and a frozen arc (frozen on any device) never celebrates, so history never celebrates on load. Two arcs ending the same day celebrate one after the other.
52. The arc switcher lists every arc except finished arcs that are already frozen (they stay on the Arcs tab); tapping an arc card on the Arcs tab makes it active and opens the Garden.
53. The theme picker and New arc preview show the person's own garden and habits (or day-1 seeds with the habits being added), never sample data. The design's duplicate "Done" in the picker is dropped; "Use this theme" applies.
54. Sheets, toasts and full-screen overlays render through a portal at the end of `<body>`, so the tab bar never covers them.
55. Settings has only the garden theme row and the night-look switch until phase 6.
56. Overlays keep a stack: only the topmost answers Escape (held keys do not repeat), the app behind is inert, focus moves into the overlay and returns on close.
57. Radio groups (look, season, length) use roving focus: one Tab stop, arrow keys move the choice.
58. "Your plants, tallest first" lists every habit of the arc, archived ones too (dimmed, wilted mini tree), by days done then name; the bar is the habit's rate. The weakest weekday is highlighted in the accent, not red (red is for misses).
59. "The same habit across arcs" and "Tallest trees" match habits by name, ignoring case and spaces at the ends.
60. Tree rings scale down to fit the 280px box once there are too many months; months with no arc are grey. Tapping is done with a row of 44px month buttons under the rings (the rings themselves are too thin to tap reliably).
61. The Month view shows every month the arc touches; days before today in the arc open a day sheet that is read-only until "Edit this day" (today's sheet is editable at once). The legend shows all done, kept, some, missed, not logged and today.
62. Removing a habit (Garden X or Plant detail) can be undone only on the same day: undoing an older removal would schedule it on past days again and change their numbers. After that day the plant stays removed (a new habit can be added instead). Plant detail shows the same-day undo as "Put it back in this arc" instead of a toast.
63. Every route change scrolls to the top.
64. Plant tap targets in the garden are as wide as their share of the row spacing, up to 44px, so they never overlap; with nine or more plants they can be narrower than 44px, and every plant also has a full-size row in Progress.
65. A finished or frozen arc is read-only everywhere: no backfill in the Month view, no edit or remove in Plant detail.
66. Visitor rules: 1 best run of kept days, 2 and 7 full days, 3 and 4 kept days, 5 best run of full days, 6 and 8 finished Mon-Sun weeks with every scored day full, 9 a seeded 1-in-50 roll (FNV-1a of arc id and date) on a full day. Counts scale with `max(3, round(n * min(1, length/90)))`; weeks and the rare roll do not scale.
67. A visitor's `foundOn` is the first day its rule held (rules only ever become true). Visitors earned before a launch, in an import or from another device join silently (no toast, no entrance); only rules that come true while the app is open arrive live with a toast, a haptic and a one-time entrance (`ui.celebrated["visitor:<id>"]`).
68. "Next visitor" is the closest locked ladder visitor (highest progress, ties in ladder order); the rare one only once the ladder is done. Run rules show the current run as progress. Visitors whose names are plural or are skies have their own wording ("The geese moved in", "The northern lights came out").
69. Visitors are counted by their own season, never the arc's current one: changing an arc's season keeps its earlier visitors (shown on their season's tab) and the new season's earned visitors join quietly. The Visitors tabs show visitors found in any arc; the next-visitor card and progress bars use only the active arc's records.
70. Rare skies are drawn only for the live garden on an active day; the timelapse, recap and thumbnails show plain skies. The shooting star crosses once, on the day the rare visitor arrives, until its entrance is seen.
71. The recap covers each Mon-Sun week that touches the arc, available from Sunday 18:00 local; the card offers the newest unseen week. The score is done over scheduled for that week; "Your best week yet" shows when it is the highest so far and there was an earlier week; "needs some love" is the arc's weakest weekday.
72. The recap share image uses `html-to-image` (pre-approved): a canvas drawn from SVG cannot load the self-hosted web fonts, so the image would lose the look. On the web it opens the share sheet when the browser can share files, otherwise it downloads.
73. Garden entrances queue: the oldest arrival that has not made its entrance shows first (a backfill can date one in the past), then the next. Live visitor checks skip finished arcs; another tab's changes sync quietly.
74. The recap share image is made when a slide settles, so Share runs straight inside the tap (iOS refuses sharing after a long wait); it has an opaque background; only a user cancel counts as cancelled, any other refusal downloads the image.
75. Recap weeks are numbered from the Monday of the arc's first week.
76. Sounds are short WebAudio tones made in code (no audio files): a soft tick on a check, a rising chord on full bloom, a two-note chime when a visitor arrives. They play only on those live moments and only when Sounds is on.
77. The 8pm nudge and Sunday recap toggles are stored now; the notifications themselves arrive with the iPhone app in phase 8, and Settings says so.
78. Settings fields save on blur or Enter; a number outside its range (length 1 to 365, threshold 1 to 100) snaps back instead of saving.
79. Import always asks first, showing what the file holds (arcs, habits, days logged), and replaces everything on yes. A file that is not a Grove or Winter Arc backup is refused with a note and nothing changes.
80. Reset this arc keeps the arc's name, theme, current habits and visitors found, clears its check-offs, moods and removed habits, and starts it again today; the confirm sheet explains it and suggests a backup first.
81. The sign-in prompt card moves to phase 7, where sign in exists.
82. Settings edits (threshold, length, start) never end a running arc: length cannot drop below today's day number and the start cannot move so the arc ends before today. A finished or frozen arc shows its dates and threshold as text.
83. Visitors earned by an arc edit (for example a lower threshold) join quietly, like a theme change: no toast, sound or haptic. The rules for earning them are unchanged.
84. The start date saves on Enter or when the field loses focus, never per keystroke, so in-between dates never move habits.
85. A file that is not a backup gets one plain note, without the validator's technical reason.
86. Synced tables are keyed by (user_id, id), so the same backup imported into two accounts never collides. The settings row's id is the user's id.
87. A database trigger keeps the newest row: a write with an older updated_at is ignored but the kept row is re-stamped, so the stale writer pulls the winner back; the server stamps synced_at. Devices pull by synced_at (server time), reaching back one extra minute so a late commit is never missed; merging twice is harmless.
88. Day logs and found visitors get ids made from their key (arc and date, arc and visitor), so two devices create the same row; merging also matches logs by arc and date.
89. A sync round is push, pull, push: the pull can earn visitors quietly, and those go up in the same round. Pulled data never celebrates: visitors join quietly and finished arcs that arrive are marked celebrated.
90. Signing in with the first account on a device (or the same one again) queues every local row and pulls everything once, merging the device into the account. A different account never gets the last account's gardens: the old data is saved to a backup key and the device starts empty and fills from the account. Signing out is local only and keeps the data.
91. Importing a backup stamps its rows with the import time, tombstones arcs and habits it does not contain and empties its missing day logs, so the import also replaces the account's data on the next sync. Found visitors cannot be deleted; extra ones stay.
92. The sign-in session is stored through the storage module, next to app data, under its own prefix.
93. The sign-in card counts a full day today as the first full day. Its buttons are "Sign in" and "Maybe later"; either one answers it for good.
94. The browser tests build with a fake sync host and answer its requests themselves; the deploy workflow refuses a build that contains that host.
95. A row the server would refuse (an id that is not a uuid, a value outside the table checks) stays on the device and is not sent, so one bad row never blocks sync.
96. Pulls page by (synced_at, id), never by offset. A sign in or sign out ends any sync in flight before it changes anything; a stale run applies nothing.
97. The sign-in card waits until the saved session has been read, and signing in from Settings also answers it.
98. The Capacitor config is JSON, not TypeScript: the Capacitor CLI cannot load a .ts config with this Node and TypeScript pair.
99. The iOS project uses Swift Package Manager (no CocoaPods) and is portrait only.
100. One 8pm nudge is pending at a time: today's while today is still open (planning stops two minutes before 20:00), otherwise tomorrow's with the chain carried over, so a day the app is never opened still gets it. Never on a day with nothing due. It is replanned on every change, on return to the front and every five minutes while open. The Sunday note repeats weekly. Both need a running arc.
101. Reminders are offered once in the iPhone app with a card after the first full day ("Turn on" asks iOS for permission), shown after the sign-in card is answered. In Settings, turning a reminder on asks too; if iOS says no, Settings explains where to turn them on.
102. No copy from browser storage into the iPhone app's storage: the app is a separate install that never had web data.
103. PARTIAL at first: until files could be shared on the iPhone (needs @capacitor/filesystem, then awaiting approval), the backup was shared as text and the recap share sent its title as text. Superseded by 108.
104. The reminders card is skipped when a reminder is already on; Settings checks iOS permission when it opens.
105. Tree rings zoom in on a young tree (up to 2.5x) so one or two months fill the card; ring proportions are unchanged.
106. The Visitors season tabs are a four-column grid so all four fit at 390px.
107. Focus rings use the look's accent instead of the browser's stock ring; text fields keep their own focus style.
108. With @capacitor/filesystem (owner approved), the iPhone writes the recap image and the backup to the app's cache folder and hands them to the share sheet as real files (PNG and JSON). A closed share sheet counts as cancelled; any other failure, conversion included, shows a retry note. The cache folder is left for iOS to clear.
