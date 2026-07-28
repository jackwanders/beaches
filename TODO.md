# TODO

Decisions taken without asking, per `IMPLEMENTATION_PLAN.md` → "If something is
still ambiguous". Each is reversible; none violate a non-goal.

## Steps 1–4

- **JSON is imported at build time, not fetched.** The spec allows either.
  Importing means no loading state, no fetch error path, no base-path concern for
  the JSON, and offline-by-default via the bundle. Images and PDFs stay static in
  `public/`. — `src/data.ts`
- **`base` is written once.** `vite.config.ts` imports `CONFIG.BASE` from
  `src/config.ts`. One literal, both of the mandated locations.
- **Mirrored assets are renamed to slugs** (`assets/venues/<slug>.jpg`,
  `assets/logos/<slug>.png`, `assets/menus/<service-id>.pdf`) rather than keeping
  CDN filenames with apostrophes, commas and parentheses. Two services share one
  PDF (Cricketer's lunch and late night); each gets its own copy under its own id.
- **Strict meal filter during a real meal.** At lunch only `meal === 'lunch'`
  services compete; open snack bars do not pad the list. Two honest answers is
  the correct output. During the **gap** the filter is open-now across all meals.
- **02:00–06:00 maps to `breakfast`.** The spec's inference table leaves it
  undefined. This way the never-zero rule surfaces "Schooners opens at 7:30"
  rather than an empty late-night list.
- **An explicit `opts.meal` survives the never-zero forward search; an inferred
  one does not.** "Sushi at 9am" should answer "Soy opens at 5:30" — the inferred
  meal is only a proxy for *now*. But "where should we eat dinner tonight?" asked
  at 9am must return dinner, not breakfast. If an explicit meal plus a craving
  matches nothing at all, the meal is dropped rather than returning zero.
- **"Surprise us" applies no filter** instead of picking randomly. The day-seeded
  rotation already supplies the variety, and a random pick would change the list
  between renders — which the spec forbids.
- **`closedDays` is checked against the day of `t` only**, not against the day a
  forward-shifted service would actually open. A service closed today can
  therefore be offered as "opens at 5:30" on a day it is shut. Revisit if the
  check-in sheet turns out to list many closures. — `src/lib/candidates.ts`

## Data corrections

- **Pinta's `logoSource` set to `null`.** The published URL
  (`…/restaurants-logo/logo-pinta.png`) returns 404, as do seven plausible
  variants. `null` is already a supported state (Calypso's), so the UI renders it
  the same way instead of showing a broken image. Note recorded on the venue.

## Step 5 — home screen

Design forks the user was asked about up front, since taste cannot be defaulted:
**64px hero thumbnails on cards**, **proportional 6am–2am rail**, and **three
cards plus a named "Also open" line in the gap**.

Everything below was decided without asking, per "If something is still
ambiguous".

- **Rail spans 06:00–02:00, not 24h.** 1200 minutes, proportional widths. The
  02:00–06:00 dead zone would eat a sixth of the bar on a phone and nothing on
  the property is open then. In that window the marker pins to the left edge at
  40% opacity. — `src/lib/rail.ts`
- **`MEAL_WINDOWS` extracted to `clock.ts`.** The rail and `clockState` now read
  one table, so they cannot disagree about where a meal ends. A test walks all
  1440 minutes asserting the rail's active segment matches `clockState` — the
  failure this guards against is the screen quietly lying.
- **The rail is one divided pill, not five chips.** Only the outer ends round;
  meal boundaries are 3px dividers in the ground colour, drawn inside each
  segment (`border-box`) so the geometry still sums to 100%.
- **One colour per meal**, walking the day: sand breakfast, turquoise lunch,
  blue dinner, violet late night. All cool-to-neutral — signal orange must keep
  meaning "closing soon", so no meal borrows a warm accent. Unfilled track sits
  at 45%, not 25%: below that the upcoming meals turn muddy and become
  indistinguishable, which is the problem the colours exist to solve.
- **The gap is a band like any other, in flat slate `#7C93A1`** — the only
  window with no hue, because it is the only one with nothing being served. It
  fills as it elapses like every other segment. An earlier outlined-hole
  treatment was dropped: once the dividers existed, an outline read as a
  rendering artefact rather than a state.
- **No per-segment labels.** The gap is 7.5% of the bar, ~26px on a phone. One
  caption names the active window instead.
- **The marker is foam, not orange.** Orange means closing-soon and nothing
  else; spending it on the marker would blunt the card badge.
- **`CLOSING_SOON_MINUTES: 45`** in `CONFIG`. Enough to cross a 600m property
  and be seated. Visual only — it does not affect ranking.
- **`?t=HH:MM` freezes the clock, `?u12=0` drops the under-12 filter.** Ships to
  production: it makes every acceptance check verifiable on the real phone, and
  no user triggers it by accident. A `SIM` chip shows whenever it is active.
  **`?u12=0` is currently the only way to see the three 12+ services** — the
  party-composition toggle has no assigned step in the build order; it should
  ride with the step-10 settings screen.
- **The clock ticks every 15s and resyncs on `visibilitychange`.** iOS throttles
  a backgrounded PWA's timers, and unlocking the phone is exactly when the app
  gets used.
- **Reroll resets on clock-state change only**, via `key={state}`. Keying it on
  the list would throw the user's position away once a minute, because
  `candidates()` recomputes as the clock advances.
- **"Also open" names 6 venues, then `+N`.** At 16:00 the acceptance check
  expects Cricketer's named and it ranks seventh. Names are cheap; cards cost a
  decision.
- **Ratings render only when present** — 10 of 27 venues have one, so there is
  no placeholder and no reserved space.
- **Cards are `<article>`, not buttons.** The detail sheet is step 7; an unused
  `onSelect` prop now would be speculative.
- **Heroes are downscaled to 128px thumbnails** (`assets/thumbs/<slug>.jpg`,
  generated by `npm run mirror`, `sharp` added as a devDependency). The heroes
  are 1920px marketing shots averaging 608KB — three on the home screen was
  1.87MB of first paint for three 64px squares; it is now 12KB. Full heroes are
  still what the step-7 detail sheet uses. — `thumbUrl` in `src/lib/assets.ts`

## Step 6 — chips

- **Chips are scoped to the meal, derived from the data.** The seed keywords
  are already sharply meal-specific — breakfast carries eggs/pastry/pancakes
  and no pizza; only Soy carries sushi and only at dinner. A global row spent
  most of its width on things that could not be served for hours: intersected
  with breakfast, the previous hand-curated twelve left exactly two live chips
  and hid the three that matter. Both rows now come from the same pool
  `candidates()` competes over — meal, party age, and open-now during the gap —
  so a chip can never be offered when nothing behind it is servable.
  — `cravingChipsAt` / `moodChipsAt` in `src/lib/chips.ts`
- **A denylist, not an allowlist.** `vegetarian, buffet, grill, fried, cheese,
  rice` describe a service rather than name a want, and `format`/`dressCode`
  already cover that ground. Everything else in the vocabulary is a craving.
  An allowlist would need re-curating by hand every time the data gained a term.
- **The row is uncapped.** A frequency-ordered top-N drops exactly the chips
  worth tapping: sushi and teppanyaki carry one dinner service each and rank
  last, so a cap would leave Soy and Kimonos unreachable from the chips at any
  hour. A test asserts every service is reachable from its own meal's row. The
  row is a scrolling control surface, not a results list — the three-result
  rule does not apply to it. Dinner is the widest at 20 chips.
- **Moods are meal-scoped too.** Every `dressCode: "evening"` service is a
  dinner service, so "Somewhere nice" was a guaranteed dead end at breakfast.
- **The chip pool applies the party-age filter.** Caught by the reachability
  test: `duck` is carried by Le Petit Chateau alone, which is 12+, so with
  `HAS_UNDER_12` on it was a chip that could only ever return nothing.
- **Selected cravings clear when the meal turns over**, since a keyword
  selected at lunch may not exist at dinner. Moods persist — they are
  meal-agnostic predicates.
- **Consequence: "tapping sushi at 09:00 offers Soy at 17:30" is no longer
  reachable from the chip row**, because sushi is not a breakfast craving. The
  forward-shift behaviour in `candidates()` is unchanged and still tested; that
  acceptance check now belongs to step 8's search, which spans the full
  vocabulary. The forward shift is still reachable from the chips before a meal
  opens — tapping `eggs` at 06:15 returns "opens at 6:30".
- **"Surprise us" is not offered as a chip.** The spec defines it as "no
  filter, random from valid set", but step 4 already removed the randomness — a
  random pick would change the list between renders, which the spec forbids.
  What is left is "show me a different three from the valid set", which is
  exactly what the reroll button does. A chip duplicating the button below it
  is one more decision for no gain. `MOOD_PREDICATES.surprise` stays as a
  harmless no-op.
- **Mood chips use the spec's full labels** ("Toes in the sand"), not the home
  mockup's `quick sand nice cool` — those read as ASCII shorthand for the
  ids, and the full phrases are what make the chips legible.
- **Cravings are OR'd, moods are AND'd**, per `candidates()` from step 4. Two
  cravings widen; two moods narrow.
- **A dead-end state exists, because a craving plus a mood can legitimately
  match nothing at any hour.** "sushi" + "quick and easy" has no answer on the
  property — Soy is the only sushi and it is à la carte. The never-zero rule
  covers *time*, not impossible filter pairs, so the screen names the
  combination and offers "Start over" rather than rendering silence.
- **Reroll now resets on filter change as well as clock-state change**, via the
  same `key`. Still never on a clock tick.
- **The gap's "Also open" line is suppressed while filters are active** — it
  lists venues from the unfiltered set, which would contradict the chips.

## Menu PDF extraction — measured, not recommended

The spec files dish-level PDF parsing as progressive enhancement. Measured
against all 42 mirrored menus with `pypdf`, it should **not** feed the craving
chips:

- **13 of 42 menus carry no extractable text** — the buffet signage the spec
  predicted. Giuseppe's dinner yields the single word "buffet" and would lose
  the hand-assigned pasta, pizza, salad, fish and dessert.
- **Extraction is noisy.** It roughly doubles keywords per service, 5.1 → 10.7.
  Soy gains `cheese` (cream cheese in a roll) and Butch's, a steakhouse, gains
  `jerk`, `curry`, `ice cream` and `pork` from side dishes and prose. Tapping a
  craving would stop narrowing anything.
- **It also misses.** `teppanyaki` at Kimonos, `lobster` at Schooners and
  `pizza` at Pinta live in styled or rasterised text and never extract, so the
  hand-assignment is strictly better where both exist.

The hand-assigned keywords are the higher-precision layer and should stay the
chip vocabulary. Extraction belongs where the spec put it — under the keyword
hits in step 8's search, where recall helps and a false positive costs a
scroll rather than a wrong recommendation.

## Carried forward

- **Overrides are applied but not editable.** `applyOverrides` runs before every
  time comparison from day one; the editor UI is step 10.
- **`menuUrl` is still unused.** Step 7's detail sheet is the first thing that
  links a menu PDF.
- **No favicon yet** — `/favicon.ico` 404s in the console. Icons and manifest
  are step 11.
