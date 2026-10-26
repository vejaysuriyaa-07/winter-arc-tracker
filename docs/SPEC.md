# Winter Arc Tracker: v1 Spec

A gamified daily habit tracker for a Winter Arc (a ~90-day self-discipline block over winter). A dark, game-like dashboard where checking off habits fills a living wave, pushes a consistency score higher, and makes streaks addictive.

The fantasy in one sentence: turning your life around feels like playing a game, where every checked habit visibly fills a wave and levels up your consistency score.

## 1. Scope

- Single-page web app, local-first, single user. No login, no backend.
- All data in localStorage through one storage module, with JSON export/import so progress is never trapped.
- Arc: default 90 days, selectable start date. Header shows "Day 23 / 90" and days left.
- Before the start date: Today shows "Arc starts in N days" with the habit list as a preview (check-offs disabled).
- After the last day: Today shows an "Arc complete" card (overall consistency, longest streak, level) with a "Start a new arc" button that opens Settings. Old logs stay.

## 2. Tech stack

- Vite + React + TypeScript (strict) + Tailwind CSS
- React Router with HashRouter (static hosting, no server rewrites needed)
- Motion (framer-motion) for micro-interactions
- Hand-written SVG for the wave and all charts. No chart library.
- canvas-confetti for the 100% burst
- vite-plugin-pwa: manifest, icons, offline service worker, installable on iPhone via Add to Home Screen
- Vitest for `lib/` unit tests, Playwright for the end-to-end smoke test
- Deploy: GitHub Actions workflow to GitHub Pages (Vite `base` set to the repo name)

## 3. Design system

- Dark theme only. Background #0A0F0D, cards #121816, 1px borders around #1F2A25. Cards rounded-2xl; chips and buttons use a smaller radius so hierarchy reads.
- Accent: electric green (#22C55E family) for completion, progress, and the wave. Gold (#F5B83D) only for 100% days and level-ups. Soft red (#F87171) only for missed habits.
- Type: a bold condensed display face for numbers and scores (e.g. Archivo Condensed or Barlow Condensed), a clean sans for body (e.g. Inter). All numbers use tabular figures so count-ups don't jitter.
- Vibe: game HUD, not a spreadsheet. Big numbers, glowing progress, satisfying check animations. The wave is the one loud element; keep everything around it quiet.
- Mobile first: designed at 390px wide, one-thumb use, 44px minimum tap targets, bottom tab bar (Today, Calendar, Insights, Goals, Settings).

## 4. Screens

### 4.1 Today (default screen)

Top to bottom:

1. Header: "WINTER ARC" wordmark, Day X / 90 pill, current date, streak flame with the current streak number.
2. Hero wave card (section 6.1): wave fill = today's completion %. Huge % on top of the wave. Below it: "X of Y habits done", overall consistency, "Level N" and "32 / 50 check-offs to Level 4".
3. Habit list: one row per scheduled habit, in the user's order. Row: name, optional detail ("10 pages"), category tag, big checkbox. Checking a habit:
   - pops/scales the checkbox,
   - raises the wave with a splash,
   - counts the consistency score up,
   - fires confetti only when the day crosses into 100%.
4. Quick add: one input + category picker. The new habit is scheduled from today onward.
5. Daily check-in: mood (5 emoji), last night's sleep (hours + quality 1-5), and a "One win today:" text field. All saved to today's log.

Midnight rollover: re-read the current date on window focus, on visibilitychange, and once a minute, so an app left open overnight shows the new day.

### 4.2 Calendar

- Month grid, one cell per day. Prev/next navigation limited to months that overlap the arc.
- Cell shading buckets: not logged (dark, dashed outline), 0%, 1-49%, 50-79%, 80-99%, 100% (brightest green + gold ring). Days outside the arc are dimmed and not tappable. Future days are not tappable.
- Each week row shows its average %. The month header shows the month average.
- Tapping a day opens a bottom sheet with that day's checklist. Today is editable. Past arc days are read-only with an "Edit" toggle for backfilling.
- Mood strip: the month's daily mood emoji in a row under the grid.

### 4.3 Insights

- Overall consistency: one big % with its formula in small text.
- Current streak and longest streak.
- Sleep: sleep score trend plus average hours. Empty state until the first entry, never a fake number.
- Habit leaderboard: every habit ranked by its own consistency, best first, a small bar each, with sample size ("12 / 15 days"). Ties broken alphabetically. Archived habits shown dimmed at the bottom. Solo leaderboard: habits compete with each other, not with other people.
- Consistency wave chart (section 6.2) with 7-day, 30-day, and all-time toggles.
- Weekday breakdown: average completion per weekday (Mon to Sun) as bars, weakest weekday highlighted.
- Every card has an empty state that says what to do first.

### 4.4 Goals and extras

- Yearly goals: name, target number, current count, +1 / -1 buttons, progress bar.
- Tree growth: one component on the Goals screen. Stages seed, sprout, sapling, tree, blooming at 0 / 50 / 150 / 300 / 500 lifetime check-offs (constants in `stats.ts`). Purely visual, hand-drawn SVG, one illustration per stage.
- Settings:
  - arc start date, arc length (default 90), streak threshold (default 80%), sleep target hours (default 8)
  - habits: add, rename, edit detail and category, reorder (up/down buttons), delete
  - export JSON; import JSON (validate, show a clear error on a bad file, confirm before replacing)
  - reset arc: confirm dialog, clears all day logs, sets start date to today, keeps habits and goals
  - "How scoring works" sheet with the rules from section 8 in plain language

## 5. Default habits

1. Wake up at 5 AM (morning)
2. Meditation (mind)
3. Gym (body)
4. Read, detail "10 pages" (mind)
5. Eat healthy (body)
6. Plan next day (discipline)
7. Journaling (mind)
8. Cold shower (body)
9. No social media (discipline)

Users can add their own and delete any default. Deleting a habit that has any check-offs archives it (archivedAt = today) so past days keep their percentages. Deleting a habit with no check-offs removes it completely.

## 6. The wave effect

There are two waves. Both are core to the feel, not decoration.

### 6.1 Hero fill wave (Today)

- A card with a clipped wave container. Inside, an SVG with two layered sine waves (back one at 60% opacity, front one solid) anchored to the bottom.
- Vertical position = today's completion %: 0% sits just below the card (empty), 100% fills it to the top.
- Always drifting horizontally: translate the path left in a seamless loop (wave shape repeated twice across the path width). Back and front layers drift at different speeds.
- Habit checked: fill rises to the new % over ~600ms with ease-out, and a one-time splash plays (amplitude briefly doubles, then settles). Habit unchecked: fill lowers smoothly, no splash.
- Crossing into 100%: the wave turns gold, the % pulses once, and a short confetti burst fires. Opening the app on an already-complete day shows gold with no confetti.
- Implementation: one `WaveProgress` component taking a `percent` prop (0-100). Drift via CSS keyframes on transform. Fill level and splash tweened with requestAnimationFrame writing to refs/attributes, never React state per frame.
- prefers-reduced-motion: static fill level, no drift, no splash, no confetti.

### 6.2 Consistency wave chart (Insights)

- Daily completion % across arc days so far, drawn as a smooth curve (catmull-rom to bezier), filled underneath with a green gradient fading to transparent.
- The line draws itself on mount (stroke-dashoffset, ~1s; instant with reduced motion).
- Hovering or tapping a point shows a tooltip with the date and %.
- Days before the arc start are not plotted. Unlogged arc days plot at 0% but as hollow markers labeled "not logged", not as failures. Today's point is marked "in progress".

## 7. Data model

```ts
type Category = "morning" | "body" | "mind" | "discipline" | "custom";

type Habit = {
  id: string;
  name: string;
  detail?: string;          // e.g. "10 pages"
  category: Category;
  order: number;            // list position
  createdAt: string;        // YYYY-MM-DD local; scheduled from this day
  archivedAt?: string;      // YYYY-MM-DD local; not scheduled from this day on
};

type DayLog = {
  date: string;             // YYYY-MM-DD local
  completedHabitIds: string[];
  mood?: 1 | 2 | 3 | 4 | 5;
  sleepHours?: number;
  sleepQuality?: 1 | 2 | 3 | 4 | 5;
  journalWin?: string;
};

type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  createdAt: string;
};

type ArcSettings = {
  startDate: string;        // YYYY-MM-DD local
  lengthDays: number;       // default 90
  streakThreshold: number;  // percent, default 80
  sleepTargetHours: number; // default 8
};

type AppState = {
  version: 1;
  settings: ArcSettings;
  habits: Habit[];
  logs: Record<string, DayLog>; // keyed by date
  goals: Goal[];
  ui: { lastCelebratedLevel: number };
};
```

- Stored under one localStorage key (`winter-arc:v1`). Load validates the shape and migrates by `version`. Export downloads AppState as JSON. Import validates, then replaces after confirmation.
- A DayLog is created lazily on the first interaction that day. No DayLog means not logged.
- Default habits get createdAt = arc start date. When the start date changes, habits created on or before the old start date move to the new start date, so they stay scheduled from day 1.
- Derived values are computed, never stored: today's %, overall consistency, streaks, per-habit consistency, week/month/weekday averages, level, tree stage, sleep score. All live in `lib/stats.ts` as pure functions that take `today` as an argument.

## 8. Scoring rules (shown in the UI, no hidden math)

- Arc days so far: arc start date through the earlier of today and the arc's last day.
- Scheduled habits on day D: createdAt <= D and (no archivedAt or archivedAt > D).
- Daily completion = completed scheduled habits / scheduled habits x 100. Check-offs of habits not scheduled that day are ignored.
- Overall consistency = all completed / all scheduled across arc days so far, today included live. Unlogged past days count as 0 done.
- Streak: a day is kept when its completion >= the streak threshold. Current streak = consecutive kept days ending today; if today isn't kept yet, count back from yesterday instead (today is in progress and doesn't break the streak until it's over). Longest streak = longest run inside the arc. Days before the arc don't count.
- Per-habit consistency = days completed / days scheduled for that habit, over arc days so far.
- Week, month, and weekday averages = mean of daily completion over arc days so far in that group, unlogged days as 0.
- Sleep score = 50 x min(hours / sleep target, 1) + 50 x (quality / 5), only for nights with both values.
- Level = floor(lifetime check-offs / 50) + 1, where lifetime check-offs = completed scheduled habits across all logs. Today shows progress to the next level. The level-up toast fires when level > ui.lastCelebratedLevel, then updates it, so reloads never repeat it.
- No fake data: until the first ever check-off, the consistency and streak cards show an empty state ("Check off your first habit to start your score"), not 0%.

## 9. File structure

```
src/
  main.tsx
  App.tsx               # router, layout, bottom tab bar
  types.ts
  pages/
    Today.tsx
    Calendar.tsx
    Insights.tsx
    Goals.tsx
    Settings.tsx
  components/
    WaveProgress.tsx    # hero fill wave
    WaveChart.tsx       # consistency wave chart
    HabitRow.tsx
    DaySheet.tsx        # day detail bottom sheet
    StreakFlame.tsx
    TreeGrowth.tsx
    ProgressRing.tsx
    EmptyState.tsx
    Toast.tsx
  lib/
    dates.ts            # local-date helpers, no UTC bugs
    storage.ts          # load/save/migrate, export/import
    store.ts            # app store hook, live updates across screens
    stats.ts            # all derived stats, pure
    *.test.ts
e2e/
  smoke.spec.ts
docs/
  SPEC.md
  DECISIONS.md
.github/workflows/deploy.yml
```

## 10. Build order (verify after each step)

1. Scaffold: Vite, TS strict, Tailwind, router + tab bar, design tokens, types, `dates.ts`, `storage.ts` with the 9 default habits and a 90-day arc starting today. Tests for dates (month/year boundaries, DST change days, local vs UTC) and storage (round trip, bad import rejected).
2. `stats.ts` with full tests against a hand-written fixture (about 14 days, expected values worked out in comments). The fixture must cover: an unlogged day, a habit added mid-arc, a habit archived mid-arc, a 100% day, a broken streak, and today in progress.
3. Today screen: habit list with check/uncheck persisted, `WaveProgress` wired to the live %, stats and level on screen, quick add, daily check-in.
4. Calendar: shading, week/month averages, day sheet with edit toggle, mood strip.
5. Insights: consistency, streaks, sleep trend, leaderboard, wave chart, weekday bars.
6. Goals, tree growth, settings, export/import, reset, scoring sheet.
7. Polish: check animation, wave splash, 100% gold + confetti, level-up toast, empty states, reduced motion, PWA manifest + icons + offline.
8. Final: Playwright smoke test at 390x844 (fresh state, check all habits, wave hits 100% and turns gold, reload, still 100%, calendar today cell has a gold ring, insights consistency matches). Screenshot every screen at phone width and review them. Add the GitHub Pages deploy workflow.

## 11. Acceptance criteria

- Checking a habit instantly moves the wave, the %, and the streak with no reload, and the state survives a refresh.
- A 100% day shows the gold wave + confetti, and its calendar cell gets a gold ring.
- Insights numbers match the hand-computed fixture values (consistency, streaks, leaderboard order).
- Deleting a habit never changes a past day's %.
- No screen shows invented data; a brand-new arc shows helpful empty states.
- Leaving the app open past midnight rolls Today over to the new day.
- Fully usable at phone width with one thumb.
- Installable to the iPhone home screen and works offline after first load.
- `npm run typecheck`, `npm run test`, `npm run build`, and `npm run e2e` all pass.

## 12. Not in v1

No accounts, backend, social features, friend leaderboards, notifications, AI coach, or payments. Those are v2. Keep v1 fast, local, and satisfying.
