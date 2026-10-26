# Grove: v2 Spec

Grove turns habit tracking into a garden. You run arcs (a Winter Arc, a Study Arc, a Summer Arc), each arc is its own garden in its own season, every habit is a plant that grows when you do it, and your mood each day sets the weather. Consistency brings flowers, birds and visitors. Long term, every arc you finish joins your grove.

This replaces the Winter Arc Tracker v1 spec and the v1.1 plan. Anything from v1 that v2 doesn't mention (wave hero, levels, tree stages, insights screen, goals, sleep) is gone.

Approved designs: `docs/design/` (read its README first). This spec wins when they disagree.

## 1. Scope

In v2:
- Rebrand to Grove. Multiple arcs, each with a season theme, length, start date and its own habits. Several arcs can run at once; Today shows one, with a switcher.
- The garden engine (section 6), mood as weather, rare skies.
- Today, Progress (this arc and all time), Plant detail, Month view, Arcs, New arc, Arc complete, Visitors, Sunday recap, Settings, Sign in.
- Rewards: bloom, chain, visitors, rare skies, weekly recap (section 7).
- Sync across devices with Supabase (section 10). The app also works fully signed out.
- Native iPhone app with Capacitor: real haptics, local notifications, durable storage (section 11). The web build keeps deploying to GitHub Pages.

Not in v2: friends or social, Android build, home screen widgets, decorations or seed packets, payments, AI coach.

## 2. Stack

- Existing: Vite, React, TypeScript strict, Tailwind, React Router (HashRouter), Motion, vite-plugin-pwa, Vitest, Playwright, self-hosted fonts via fontsource, replacing Barlow Condensed and Inter: Fraunces and Instrument Sans (Field journal look), Young Serif and Hanken Grotesk (Greenhouse look), Instrument Serif and Geist (Night look).
- New: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/haptics`, `@capacitor/local-notifications`, `@capacitor/preferences`, `@capacitor/share`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@supabase/supabase-js`.
- Anything else (for example an image export library for sharing the recap) needs my OK first.

## 3. Navigation

Bottom tab bar, four tabs: Garden (today), Progress, Arcs, Settings. Month view, Plant detail, Visitors, New arc and the Sunday recap open from those tabs.

## 4. Design system

### 4.1 Themes = look x season, chosen per arc

Every arc has a theme made of a **look** (the UI around the garden) and a **season** (the garden itself and the accent). The user picks both when starting an arc and can change them later in Settings, using the theme picker (`ThemePicker.dc.html`). A setting "Night look in dark mode" (on by default) switches any arc to the Night look while the iPhone is in dark mode.

The UI chrome reference is `docs/design/Skin.dc.html` (all three looks, all four seasons, every token below). The navy, cyan, Barlow and Inter chrome in the older design files is superseded; only their layouts, content and scenes still apply.

**Looks**

| | Field journal | Greenhouse | Night |
|---|---|---|---|
| Feel | Warm paper notebook | Sage glasshouse | Living night sky |
| Background | #F8F4EB to #EFE8DB, season tint wash at the top that deepens as the day fills, faint tint glow bottom right | #ECEFE6 to #DDE2D3, same tint wash | #151913 to #0D100B, twinkling stars and a drifting aurora glow that brighten as the day fills and flare on each check |
| Text / muted / line | #272520 / #6B6555 / #DCD3C2 | #1D2820 / #5B675C / #CBD2C2 | #EDE6D5 / #A39D8C / #2A3026 |
| Display font / body font | Fraunces (italic wordmark) / Instrument Sans | Young Serif / Hanken Grotesk | Instrument Serif (italic wordmark) / Geist |
| Habit list | Plain list with hairline dividers; done rows get a tint wash from the left | Soft tiles with inner highlight and shadow; done tiles shift toward the tint with a colored shadow | One grouped card; done rows get an accent wash and a 3px accent edge |
| Mood control | Five outlined circles; selected is an ink-filled circle | Five shaded tiles; selected is an accent gradient | Segmented control; selected segment glows in the accent |
| Garden frame | 20px radius, hairline border, soft drop shadow | 26px radius, floating shadow | 22px radius, accent-tinted glow |

**Season accents per look** (check fills, progress line, Edit, primary buttons)

| Season | Field journal accent / tint | Greenhouse accent / tint | Night accent |
|---|---|---|---|
| Winter | #3E5F75 / #D3E3EE | #355A6E / #C9DCE4 | #A9C6D6 |
| Spring | #9E4C66 / #F2D6DE | #8E4560 / #E8D0DA | #E4A7B6 |
| Summer | #7D5A0C / #F3E2B8 | #76600F / #E7DFB8 | #E6BA62 |
| Autumn | #9C4A26 / #F1D4C0 | #8E4423 / #E8CDBE | #DD9260 |

- Scene palettes (skies per season x mood, ground, trees, flowers, precipitation) come from `seasons()` in `docs/design/Garden.dc.html` and are the same in every look.
- Surfaces use subtle gradients, not flat fills: buttons, chips, checkboxes and the progress line are softly shaded from a lighter tint of the accent to the accent.
- Gold #F5B83D for full bloom and celebrations. Soft red #F87171 only for misses and destructive actions.
- Avoid stock framework palettes and default UI fonts. Every color comes from the tables above.
- 44px minimum tap targets. Designed at 390px wide. Respect safe areas on iPhone. Tabular figures for anything that counts up.

### 4.2 Motion

- One requestAnimationFrame loop per screen writing to refs, never React state per frame. Pause when hidden or off screen. Settings toggle "Wind and animations" and the system reduced-motion setting freeze everything to a static frame.
- **Checking a habit** (all looks, from `Skin.dc.html`): the checkbox pops in with a spring, a ring ripples out, seven sparks burst (glowing firefly sparks in Night), a band of light sweeps across the row, and the streak icon springs up. In Night, the aurora also flares.
- **Streak icons** (from `Skin.dc.html`, `animIcons()`): 0 days is a seed that slowly breathes; 1 to 6 days is a sprout swaying with the wind; 7+ days is a flickering flame (glowing in Night, number in ember color). Weather adds to it by mood: Great a sparkle glint, Good just the breeze, Okay a drifting cloud, Low raindrops dripping onto it (snowflakes in winter, flames shrink in rain), Rough faster rain or snow, harder shaking and a lightning flicker.

## 5. Screens

### 5.1 Garden (Today)

Top to bottom, as in `Skin.dc.html` (layout and chrome) with the scene from `Garden.dc.html`:
1. Header: "Grove" wordmark in the look's display font, arc switcher chip (arc name, opens a sheet listing active arcs).
2. Big date heading: weekday in the display font at about 48px with a subtle ink-to-accent gradient, the date under it. No day counter.
3. Garden card, 300px tall: the scene (section 6). No numbers or labels on it.
4. Mood row: "How are you feeling?", five weather buttons (Great sunny, Good clear, Okay cloudy, Low rain or snow, Rough storm or blizzard), current label on the right in italic display. Changing mood changes the weather and the streak icons instantly and is saved for the day.
5. Habits header: "Today" in the display font with "X of Y", a compact bloom flower (about 40px, one petal per habit), Edit button. A thin shaded progress line under it.
6. Habit rows: checkbox, name, optional detail, animated streak icon and number (section 4.2). In edit mode each row shows an X (44px) and a drag handle for reordering.
7. Quick add input.
8. Bloom chain card (section 7.2).

Checking the last habit plays the full-bloom moment: the large petal flower from `Bloom.dc.html` animates over the garden card (petals turn gold, particle burst), then fades, leaving the day's flower planted in the garden.

Removing a habit (X): the habit leaves the list, its plant wilts and stops growing, and a toast says "<Habit> removed. Its tree stops growing." with Undo. Hard delete only if the habit was created today or later and has no check-offs; otherwise archive it.

Before an arc's start date: the garden shows seed mounds in bare ground and "Starts in N days". Check-offs are disabled.

### 5.2 Progress: This arc (`ProgressArc.dc.html`)

Segmented control (This arc, All time). Garden timelapse with play button and a slider from day 1 to today (the garden re-renders at that day). Four tiles: days kept (X of Y), arc score, current streak, best streak. Row linking to Month view. "Your plants, tallest first": every habit with a mini tree sized by growth, days done, and a bar. "Your week": seven bars Mon to Sun, weakest highlighted with a short line like "Sundays are your dry spot". A Visitors row (found count, next visitor) linking to Visitors.

### 5.3 Progress: All time (`ProgressAll.dc.html`)

Tree rings: one ring per calendar month since the first arc, ring color = the arc that ran that month (grey between arcs), thickness = that month's kept-day rate, slight wobble so it reads as wood, bark ring outside. Tapping a ring shows the month and its rate. Lifetime counts: trees grown to full size, flowers, longest streak, arcs finished, check-offs, days tended. Your grove: a horizontal row of every arc's garden (finished arcs frozen at their last day). Tallest trees: habits with the most days done across all arcs.

### 5.4 Plant detail (`PlantDetail.dc.html`)

Opened by tapping a plant row or a plant in the garden. Big tree in its season scene, swaying. Tiles: done this arc, streak, best streak, planted date. A grid of every day this arc (done, missed, today). The same habit across arcs. Edit habit, Remove from this arc.

### 5.5 Month view (`Calendar.dc.html`)

Month grid starting Monday, cells shaded by completion (full, most, some, missed with red dot, not logged dashed, today outlined, future dim). Legend. "Last 7 days" card: score and change vs the week before, full days, weakest day, streak and best, arc so far. Tap a past day to see and backfill its checklist (edit toggle, as in v1).

### 5.6 Arcs (`Arcs.dc.html`) and New arc (`NewArc.dc.html`)

Arcs: two-column cards with a mini garden in the arc's season, name, status (Day X of Y, Starts on, or Finished with score) and a progress bar. "Start a new arc" opens New arc: name, garden theme (look and season, using the theme picker cards from `ThemePicker.dc.html`), length (30, 60, 90, custom), start date, "Bring habits from <current arc>" toggle with habit chips, and a primary button "Plant this arc". The New arc screen restyles itself live in the chosen look and season.

Each arc keeps its own theme, so switching arcs on the Garden tab switches the whole app's look. The Arcs list shows each arc's card in its own look and season.

### 5.6b Theme picker (`ThemePicker.dc.html`)

A sheet: live preview of the Garden tab in the chosen theme, three look cards (Field journal, Greenhouse, Night), four season cards with mini scenes, the "Night look in dark mode" toggle, and "Use this theme". The sheet itself restyles live as you pick.

### 5.7 Arc complete

After an arc's last day ends, the next open shows a celebration: the full garden with the flock, then a summary (score, best streak, visitors found, full days) and "Start your next arc". The garden is frozen and added to Your grove.

### 5.8 Visitors (`Visitors.dc.html`)

Season tabs, "X of 9 found", a "Next visitor" card (closest locked visitor, its rule and progress), and a 3-column grid. Found: colored art on a sky tile, name, "Came on day N". Locked: dark silhouette, rule, progress bar.

### 5.9 Sunday recap (`Recap.dc.html`)

A tap-through story (tap right for next, left for previous, segment bars on top), four slides: score vs the week before; garden last Sunday vs now with what grew; new visitors (skip if none); highlights (never missed, most improved, needs love, coming up). Share exports the current slide as an image to the share sheet.

### 5.10 Settings (`Settings.dc.html`)

Laid out in the arc's look (the old `Settings.dc.html` gives content and order only). This arc: name, garden theme (opens the theme picker, shows look and season), length, started, "A day counts when X% is done", habits. Feel: night look in dark mode, haptics, sounds, wind and animations, notifications (8pm nudge, Sunday recap). Sync: sign in or account, last synced. Your data: export, import. Reset this arc (red, confirm).

### 5.11 Sign in

Email and a 6-digit code (Supabase email OTP). Optional, reachable from Settings and a one-time prompt after the first full day. Signing in merges local data into the account.

## 6. The garden engine

Port from `docs/design/Garden.dc.html` into a `GardenScene` component plus pure helpers in `lib/garden.ts`.

- Layers, back to front: sky gradient (season x mood), sun or moon, stars, aurora bands, rainbow, clouds, back hill, back-row plants, front hill with grass tufts, flowers, front-row plants, today's bloom flower, found visitor (if present), night overlay, fireflies, birds, snow or rain.
- Plants: one per habit, nine slots in two rows (back row smaller). More than nine habits: add slots by narrowing spacing; never overlap bases. Winter draws pines (three tiers and a snow cap); other seasons draw round trees (up to four canopy circles, spring blossoms in pink).
- Growth: `g = min(1, daysDone / fullGrowthDays)`, `fullGrowthDays = max(7, round(arc.lengthDays * 0.78))`. g = 0 is a seed mound; under 0.08 a sprout; then trunk height `10 + g*125` and canopy as in `plantShape()`.
- Wilting: an archived habit's plant keeps the size it reached, turns brown, leans 9 degrees, and sways less.
- Flowers: five wildflowers from day 1 so the garden is never empty, plus one flower per kept day, gold-centered for full days. Positions are seeded by index so they never move.
- Birds by arc progress (day / length): under 0.15 none, then 1, 2, 3, and a flock of 5 from 0.9.
- Weather by mood: clouds, rain or snow amounts and wind strength as in the design (rough is about 2.2x wind).
- Wind: constant sway per plant with random gusts; leaves shake harder in gusts.
- Performance: 60fps on an iPhone. Cap animated nodes around 150. One loop per scene. Static frame under reduced motion.

## 7. Rewards

### 7.1 Days

- Kept day: completion is at or above the arc's threshold (default 80%).
- Full day (full bloom): 100%.
- Today never breaks anything while it's in progress.

### 7.2 Chain

Chain = consecutive kept days ending today (or yesterday if today isn't kept yet). Shown as the bloom chain: seven mini flowers for the last seven days (gold center = full, accent = kept, faded = missed), plus a teaser line pointing at the next visitor. Missing a day resets the chain but never damages plants.

### 7.3 Visitors

Each season has nine visitors with the same rule ladder:

| # | Rule | Winter | Spring | Summer | Autumn |
|---|---|---|---|---|---|
| 1 | 3 kept days in a row | Robin | Bee | Ladybug | Squirrel |
| 2 | 5 full days | Cardinal | Butterfly | Dragonfly | Hedgehog |
| 3 | 10 kept days | Rabbit | Songbird | Frog | Crow |
| 4 | 15 kept days | Squirrel | Hedgehog | Hummingbird | Owl |
| 5 | 7 full days in a row | Red fox | Fawn | Turtle | Fox |
| 6 | A perfect week (Mon to Sun all full) | Deer | Swan | Heron | Elk |
| 7 | 30 full days | Snowy owl | Rabbit family | Fireflies | Geese |
| 8 | 2 perfect weeks | Northern lights | Blossom rain | Meteor shower | Harvest moon |
| 9 | Rare: 1 in 50 on any full day | Shooting star | Rainbow moth | Golden butterfly | White deer |

- For arcs shorter than 90 days, scale counts by `lengthDays / 90`, rounded, minimum 3.
- Art: flat 64x64 SVG, at most three colors, same style as the winter set in `Visitors.dc.html`. Locked visitors render as a single dark silhouette.
- Arrival: the visitor appears in the garden with a short entrance, a toast "A <visitor> moved in", and a medium haptic. After that, a random found visitor shows up in the garden on full days.
- Found visitors are stored per arc and never lost.

### 7.4 Rare skies

- Night: local time 19:00 to 05:59 shows a night sky (stars, moon). If today is full: fireflies (spring and summer) or brighter stars (autumn and winter).
- Northern lights: winter arc, at night, within 7 days of finishing a perfect week.
- Rainbow: today's mood is low or rough and today is full. The rain stops and a rainbow shows for the rest of the day.
- Shooting star: crosses the sky once when that visitor is found.

### 7.5 Sunday recap

Built for each finished Monday-to-Sunday week. Available from Sunday 18:00 local. A card on Garden and Progress opens it; on iPhone a notification says it's ready.

## 8. Data model (v3)

```ts
type Season = "winter" | "spring" | "summer" | "autumn";
type Mood = "great" | "good" | "okay" | "low" | "rough";
type Look = "journal" | "greenhouse" | "night";

type Arc = {
  id: string; name: string; season: Season; look: Look; // default "journal"
  startDate: string; lengthDays: number; threshold: number; // percent, default 80
  createdAt: string; frozenAt?: string; updatedAt: string; deleted?: boolean;
};
type Habit = {
  id: string; arcId: string; name: string; detail?: string; order: number;
  createdAt: string; archivedAt?: string; updatedAt: string; deleted?: boolean;
};
type DayLog = {
  id: string; arcId: string; date: string; // YYYY-MM-DD local
  completedHabitIds: string[]; mood?: Mood; updatedAt: string;
};
type VisitorFound = { id: string; arcId: string; visitorId: string; foundOn: string; updatedAt: string };
type Settings = { autoNight: boolean; haptics: boolean; sounds: boolean; motion: boolean; nudge: boolean; recap: boolean; updatedAt: string };

type AppState = {
  version: 3;
  arcs: Arc[]; activeArcId: string | null;
  habits: Habit[]; logs: Record<string, DayLog>; // key `${arcId}:${date}`
  visitors: VisitorFound[]; settings: Settings;
  ui: { celebrated: Record<string, boolean>; recapSeen: string[] };
  sync: { lastPulledAt?: string; queue: SyncOp[] };
};
```

- Migration: v1 (and v2 if the v1.1 work landed) migrates into one arc named "Winter Arc", season winter, look journal, keeping the start date, length, threshold, habits and logs. Moods carry over where present. Old exports import the same way. Keep the raw old data under a backup key on first migration.
- Every record has `updatedAt` (and `deleted` tombstones where relevant) for sync.
- All derived values (growth, chain, kept days, visitor progress, rings, recap) are pure functions in `lib/stats.ts` and `lib/garden.ts`, taking `today` and `now` as arguments, with fixture tests.

## 9. Scoring rules (shown under "How scoring works" in Settings)

- Scheduled habits on day D: created on or before D and not archived on or before D.
- Daily completion = done scheduled / scheduled. Days with nothing scheduled are skipped.
- Arc score = all done / all scheduled across the arc so far, today included.
- Per-habit rate = days done / days scheduled for that habit in the arc.
- Rings: monthly kept-day rate across every arc that ran that month.

## 10. Sync (Supabase)

- Tables: `arcs`, `habits`, `day_logs`, `visitors_found`, `settings`, each with `id uuid`, `user_id uuid` (references `auth.users`), the fields above, `updated_at`, and `deleted` where needed. Row Level Security on every table: a user can only select, insert, update and delete rows where `user_id = auth.uid()`.
- SQL lives in `supabase/migrations/*.sql`, committed. I run it in the Supabase SQL editor (give me exact steps).
- Keys: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.local` (never committed) and GitHub Actions secrets for the web deploy. No other secret goes in the client.
- Offline-first: the local store drives the UI. Every change writes locally and adds an op to `sync.queue`. When signed in and online, push the queue (upsert by id), then pull rows changed since `lastPulledAt`. Conflicts: newest `updatedAt` wins per row.
- First sign in uploads local data. Signing out keeps local data on the device.
- Settings shows "Synced just now", "Syncing", "Offline, will sync later" or "Sync failed, tap to retry".
- Unit tests for the sync engine against a fake remote, including offline queueing and conflict resolution.

## 11. Native app (Capacitor, iOS)

- App id `com.vejaysuriyaa.grove`, name Grove, icon and splash from the italic Fraunces "Grove" wordmark on warm paper with a small pine.
- Storage adapter: `@capacitor/preferences` on native, localStorage on web, one interface in `lib/storage.ts`.
- Haptics (respect the Settings toggle): light impact on check; success notification on full bloom; warning on remove; medium impact twice when a visitor arrives. No-op on web.
- Local notifications (opt-in on first full day): 20:00 if the chain is 2 or more and today isn't kept yet ("Your chain is at N. A few habits left."); Sunday 18:00 "Your week in the garden is ready". Cancel the 20:00 one once today is kept.
- Share via `@capacitor/share` on native, Web Share API on web.
- Scripts: `npm run ios` builds the web app, syncs Capacitor and opens Xcode.
- Running on my iPhone uses a free Apple ID for now (the install lasts 7 days). Give me exact steps when we get there.

## 12. Build order (verify after each phase)

0. Rebrand and data: Grove name everywhere (title, manifest, icons, wordmark), remove v1-only screens, v3 data model, storage adapter, migration from v1 and v2 with tests, scoring helpers with fixture tests.
1. Theme system and garden engine: the three looks and four seasons as tokens (section 4.1) applied through one theme provider, self-hosted fonts, Night sky layer; `GardenScene` with all seasons, moods, growth, wilting, flowers, birds, wind, weather and sky events (props for now), pure math tested, reduced motion.
2. Garden tab: header and arc switcher, date heading, mood row, habits with the check animation and animated streak icons, edit mode, X with undo, quick add, compact bloom flower, progress line, full-bloom moment, bloom chain card, before-start state. Screenshot every look x season.
3. Arcs: arcs list, new arc flow with the theme picker, switching (switches the look), theme picker in Settings, night look in dark mode, arc complete celebration.
4. Progress: this arc (timelapse, tiles, plants, week), month view with backfill, all time (rings, counts, grove, tallest), plant detail.
5. Rewards: visitors with rules, art for all four seasons, arrival in the garden, rare skies wired to real triggers, Sunday recap with share.
6. Settings and data: settings screen, scoring explainer, export and import (v3), reset.
7. Sync: Supabase schema and RLS, email code sign in, sync engine with tests, sync status UI. Stop and give me exact steps for creating the project, running the SQL and adding the keys.
8. Native: Capacitor iOS, storage adapter on Preferences, haptics, notifications, share, icon and splash. Stop and give me exact steps to run it on my iPhone.
9. Final: Playwright at 390x844 through every flow, screenshots of every screen compared with `docs/design`, web deploy, acceptance checklist.

## 13. Acceptance criteria

- Checking a habit grows its plant, fills a petal, plays the check animation and updates counts live, and survives a reload.
- Every screen renders correctly in all three looks and four seasons, each arc remembers its own theme, and Night takes over in dark mode when that setting is on.
- Streak icons show seed, sprout or flame by streak length and react to the day's mood as listed in section 4.2.
- The last habit of the day plays the full-bloom moment once (never on reload) and plants a gold-centered flower.
- Mood changes the weather instantly, per season, and is saved for that day.
- Removing a habit wilts its plant, Undo restores it, and past days never change.
- Day 1 shows seeds and wildflowers; the last day shows a full garden with a flock.
- Visitors unlock exactly by their rules (fixture tests), arrive in the garden once, and stay found.
- Rare skies appear only when their triggers are met (tests with a fake clock).
- Progress numbers match hand-computed fixture values; the timelapse matches the garden at each day.
- v1 data migrates into a "Winter Arc" with nothing lost.
- Signed in on two devices, a change on one shows on the other after sync; offline changes sync later; no data leaks across users (RLS test).
- On iPhone: haptics fire as listed, notifications arrive at the right times, data survives app restarts.
- Scenes hold 60fps on an iPhone and freeze under reduced motion or the Settings toggle.
- `npm run typecheck`, `npm run test`, `npm run build` and `npm run e2e` all pass, and the web deploy works.
