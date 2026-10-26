# Grove design reference

These files are the approved designs, exported from the design canvas. They are reference markup, not runnable pages: they were written for a design tool's runtime (`<x-dc>`, `{{holes}}`, `class Component extends DCLogic`). Read them for exact colors, sizes, layout, copy, geometry and animation logic, then build the real thing as React components. Do not copy the DCLogic wrapper or the `support.js` script.

When the spec and these files disagree, `docs/SPEC-v2.md` wins.

**Important:** the UI chrome (colors, fonts, list style, buttons, check animation, streak icons) comes from `Skin.dc.html`. The older files below still use a navy, cyan, Barlow and Inter chrome. That chrome is superseded. Use those files only for layout, content, scenes and behavior, and restyle them in the arc's look.

## Files

| File | What it shows |
|---|---|
| `Skin.dc.html` | **The look reference.** The Garden tab in all three looks (journal, greenhouse, night) and four seasons: every token, font, gradient, the Night sky layer, the check animation (two-phase fx), and the animated streak icons (`animIcons()`). |
| `SkinNight`, `SkinGreenhouse`, `SkinJournalSpring`, `SkinGreenhouseAutumn` | The same screen with different look and season props. |
| `ThemePicker.dc.html` | The theme picker sheet: live preview, look cards, season cards, night-in-dark-mode toggle. |
| `Garden.dc.html` | The main Today screen and the whole garden engine. `seasons()` holds every season and mood color. `plantShape()` is the growth geometry. `componentDidMount()` is the wind, birds, clouds, snow and rain loop. Sky events (aurora, rainbow, night) are in `renderVals()`. This is the most important file. |
| `GardenLow`, `GardenDay1`, `GardenEnd`, `GardenSummer` | The same screen with different props: low mood, day 1 seeds, last day full garden, summer season. |
| `GardenAurora`, `GardenRainbow`, `GardenNight` | Rare sky events. |
| `Styles.dc.html` | Every season against every mood. |
| `Bloom.dc.html` | Today's bloom: petal flower, full-bloom burst (two-phase particle trick), bloom chain. |
| `Visitors.dc.html` | Visitor collection. Creature art is 64x64 SVG paths in `art`; locked visitors are silhouettes. |
| `Recap.dc.html` | Sunday recap story, four slides. |
| `ProgressArc.dc.html` | Progress, this arc: timelapse, numbers, plants ranked, week rhythm. |
| `ProgressAll.dc.html` | Progress, all time: tree rings, lifetime counts, your grove, tallest trees. |
| `PlantDetail.dc.html` | One habit's plant up close. |
| `Calendar.dc.html` | Month view. |
| `Arcs.dc.html` | All arcs list. |
| `NewArc.dc.html` | Start a new arc. |
| `Settings.dc.html` | Settings. |

Sample numbers in these files (day 40, 74%, visitor names found) are mock data. Real values come from the stats module.
