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

## Carried forward

- **Overrides are applied but not editable.** `applyOverrides` runs before every
  time comparison from day one; the editor UI is step 10.
- **`menuUrl` is still unused.** Step 7's detail sheet is the first thing that
  links a menu PDF.
- **No favicon yet** — `/favicon.ico` 404s in the console. Icons and manifest
  are step 11.
