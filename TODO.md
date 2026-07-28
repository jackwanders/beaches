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

## Step 7 — detail sheet

- **Native `<dialog>` + `showModal()`**, not a hand-rolled modal. It brings the
  focus trap, Escape-to-close and `::backdrop` with it, which is a lot of
  correctness for a repo that is not adding a modal library. Backdrop clicks
  are caught by comparing `e.target` to the dialog itself.
- **The card is the stretched-link pattern, not a `<button>` wrapper.** A
  button may only contain phrasing content, so wrapping the card in one would
  have made the `<h2>` invalid and dropped its heading semantics for screen
  readers. Instead the heading owns the button and its `::after` stretches over
  the card, so the tap target is the whole card and the heading stays a
  heading. The focus ring moves to the card via `focus-within`.
- **Every service the venue runs is listed, not just the one tapped**, ordered
  by an explicit `MEAL_ORDER` rather than by `opens` — two services have null
  hours and would sort unpredictably. The tapped service is highlighted. This
  is the meal-keyed payoff: Sky shows breakfast with no age limit directly
  above dinner at 12+, and Butch's shows walk-in breakfast above
  reservation-and-evening-attire dinner.
- **Full-size heroes are used here**, not the 128px thumbnails — this is the
  surface the mirroring investment was for, one image at a time after a
  deliberate tap.
- **`menuVintage` rides in the link label** ("Menu (2024)"); undated buffet
  signage just reads "Menu" rather than inventing a year.
- **`dataWarning` renders in full**, where the home card only had room for a
  "check hours" badge.
- **Body scroll is locked while the sheet is open.** `showModal()` blocks
  interaction behind it but iOS will still scroll the page underneath.
- **Star and note controls are not here yet.** The spec lists them as part of
  the detail sheet, but the build order puts favorites and notes at step 9.
  The sheet is the surface they will attach to.

## Step 8 — search

- **Search is a full-screen dialog behind a header icon**, not an input on the
  home screen. The home screen's job is three cards; a permanent search field
  would be a fourth thing to look at. One tap to open, and the vocabulary is
  right there.
- **An empty query lists the whole 39-term vocabulary.** It doubles as the
  answer to "what can I even search for here?", which is the real question a
  controlled vocabulary raises. Suggestions match anywhere in the term, with
  prefix matches ranked first — `ice` gives `ice cream` before `rice`.
- **Results are a browse surface**, per the spec's "the three-result rule
  applies only to the home screen". Every service carrying the keyword is
  shown, across every meal.
- **Open-now is a sort, not a filter.** Open services lead, ranked the same way
  the home screen ranks them; closed ones follow ordered by how soon they open,
  each carrying "Opens at 5:30 PM". `rank()` is now exported from
  `candidates.ts` so both surfaces agree on quality order.
- **Each result names its meal.** The same venue appears once per service —
  Neptunes shows up for both lunch and dinner under `salad` — so collapsing
  them to the venue would lose exactly the distinction the data exists to make.
- **Matched signature dishes are listed, where known.** Searching `salad`
  surfaces "Greek salad" under Neptunes and "Conch salad" under Barefoot;
  services carrying the keyword with no dish naming it simply show none.
- **The party-age filter applies here too**, for consistency with every other
  surface — `duck` returns nothing while `HAS_UNDER_12` is on.
- **The detail sheet stacks over search** rather than replacing it. Both are
  native dialogs, so Escape closes the top one and returns to the results with
  the query intact.
- **Menu PDF text is not searched.** See the measurement below — it stays the
  progressive enhancement the spec describes, and was not built for v1.

## Step 9 — favorites, notes, export/import, iOS banner

- **Stars are per service, not per venue.** Neptunes at lunch and Neptunes at
  dinner are different meals out, and the whole data model exists to keep them
  apart. `btc:v1:favorites` holds service ids.
- **Notes are independent of stars.** An earlier pass gated the note field on
  being starred, which was wrong: "kids do not want to eat here" is a note
  worth keeping on a place you would never star, and it is arguably more useful
  than a star because it stops a bad suggestion twice. The field collapses to
  an "Add a note" link until used, so three service blocks do not stack three
  empty inputs. An empty note is deleted rather than stored as an empty string.
- **Export and import live in a "Your stars" dialog behind a header icon**, not
  a bottom-tab settings screen — same reasoning as the `Now | Explore`
  decision, and step 11's override editor will land in the same dialog.
- **Import merges, it never replaces.** Import exists to recover from Safari
  eviction or to move to a new phone; in both cases silently discarding what is
  already on the device is the one outcome nobody wants. On a note collision
  the imported copy wins, since it is the one just deliberately pasted.
- **Imported ids are validated against the real service list.** The input is
  pasted by hand and may be truncated, stale, or not a backup at all. Unknown
  ids are dropped and unparseable input throws a readable message rather than
  writing junk into storage.
- **The iOS banner waits for the first star _or note_.** Asking someone to
  install the app before they have anything to lose is asking for a commitment
  in exchange for nothing — but a notes-only user has just as much to lose, so
  the trigger is either. It also checks for iPadOS, which reports itself as a
  Mac; `maxTouchPoints` disambiguates a real desktop Mac from an iPad.
- **Favorites have no browse surface yet.** The spec lists "Favorites — starred
  services with notes, grouped by meal" as a view, but it lands in step 10 as
  Explore's starred-only filter rather than as a standalone screen that step 10
  would immediately dismantle. Until then, stars are visible on the venue's own
  sheet and in the export.

## Step 10 — Explore

- **A `Now | Explore` segmented control in the header, not a bottom tab bar.**
  Mode switching is a once-per-trip-phase action, so it does not earn permanent
  thumb-reach real estate — and measured, the Now screen had only ~53px of
  vertical slack at 16:00, which a 56–64px tab bar plus safe-area inset would
  have spent, pushing the gap state into scrolling.
- **The app opens on the mode the trip dates imply.** Before and after the
  trip, Explore; during it, Now. One tap overrides. This is the first use of
  `CONFIG.TRIP_START` and `TRIP_NIGHTS`, which were dead until now.
- **The unit follows the grouping: venues by village, services by meal.** An
  earlier pass listed services in both, which put "Barefoot by the Sea" on
  three consecutive rows — clutter in a browse list, which is the one thing
  this app exists to avoid. The village row names which meals a venue serves
  instead ("breakfast · lunch · dinner") and leaves the hours to the sheet.
  Grouping by meal stays service-level, because a meal *is* a service.
- **Tapping a venue opens its sheet with nothing highlighted.** `DetailSheet`
  takes a `SheetTarget` of `{ venueSlug, focusServiceId? }`; a village row omits
  the focus because there is no one meal it refers to, while service rows and
  home cards still highlight theirs.
- **Under the starred filter, a village row survives if any of its services is
  starred**, since the row is the venue.
- **Explore is the catalogue, so it deliberately breaks the filters every other
  surface applies.** Mario's appears despite `operational: false` — this is the
  only screen where it is reachable at all, and it makes the step-7
  `!venue.operational` branch live rather than dead code. 12+ services appear
  regardless of `HAS_UNDER_12`, carrying their badge: hiding a restaurant from
  someone reading about the resort in July helps nobody.
- **Empty groups are dropped.** Seaside Village exists in the seed data and
  holds no venues at all, and the starred filter empties most groups.
- **Favorites are the starred filter here, not a third destination**, which is
  what keeps the top level at two and the header control sufficient. Notes
  render on the rows, which is the spec's "starred services with notes,
  grouped by meal".
- **The header label dropped from `text-3xl` to `text-2xl`.** "BETWEEN MEALS"
  is the longest label and at 3xl it truncated on a 375px phone once the clock
  and two icons shared the row — a real regression for 90 minutes a day. Still
  larger than the venue names on the cards. `Recommendations` also lost 16px of
  bottom padding to keep the 16:00 gap state off the scrollbar; it now clears
  by 25px at 412×915.
- **`App.tsx` owns what both modes share** — the clock, stars and notes, and
  the three dialogs. `Home` is now just the Now mode's content.

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

## Step 11 — override editor

- **Overrides were dead code until this step.** `applyOverrides` existed from
  step 3 and `candidates()` accepted an `overrides` option, but **nothing ever
  called `loadOverrides()`** — every surface passed `{}`. The step-5 note
  claiming they "run before every time comparison from day one" was true of the
  function and false of the app. They are now threaded through `candidates()`,
  `search()`, the detail sheet and Explore.
- **Editing happens on the detail sheet, not in a settings list.** The spec
  describes "a settings screen that lets the user edit any service's hours",
  but the correction gets noticed while looking at the wrong hours — so "Fix
  hours" sits under the hours it fixes. Picking a service out of a list of 44
  first would be the long way round. Settings keeps the *review*: which
  services you have corrected, and one button to reset them all.
- **The editor covers what the spec's known-gaps list needs**: `opens` and
  `closes` via native `<input type="time">` (a real picker on a phone, no
  custom widget), `closedDays` as seven day chips for the check-in sheet, and
  a "Not serving" toggle for `closed`.
- **A closed service stays visible where you can undo it.** `applyOverrides`
  drops it, because a recommendation must never name a place you marked shut;
  `withOverride` keeps it for the detail sheet and Explore, struck through and
  marked, so the edit is reversible.
- **An override holding nothing is deleted, not stored empty.** Clearing every
  field removes the key, so `isOverridden` stays honest and the Settings list
  does not fill with no-op entries.
- **Resetting overrides leaves stars and notes alone.** They are separate keys
  and separate kinds of thing: overrides are corrections to the seed data,
  stars and notes are yours. The backup export deliberately does not include
  overrides.

## Step 12 — manifest, service worker, precache

- **`vite-plugin-pwa`, as the spec prefers.** It derives the manifest's `scope`
  and `start_url`, and the worker's registration path and scope, from `base`.
  That is the entire point: a worker cannot control paths above its own
  location, so a hand-written `/sw.js` would register successfully under
  `/beaches/` and then cache nothing, silently, until someone was offline on a
  beach. Verified in a browser rather than reasoned about — scope resolves to
  `http://localhost:4173/beaches/`, the script to `/beaches/sw.js`, and
  `/sw.js` at the domain root 404s.
- **Everything is precached — 145 entries, 32.7 MB.** The 42 menu PDFs, 26
  heroes, 25 logos, 26 thumbnails, 10 font subsets and the shell. Runtime
  caching would only hold what had already been opened, which is the wrong
  half of "airplane mode after first load, all 42 menus open". Nothing in
  `public/` exceeds Workbox's 2 MiB per-file default, though the limit is
  raised to 4 MiB for headroom.
- **The precache manifest uses relative URLs**, which is correct: Workbox
  resolves them against the worker's own location. Confirmed against the live
  Cache Storage, where every one of the 140 unique entries is an absolute URL
  under `/beaches/`. The 145 → 140 difference is duplicate URLs, not gaps —
  checked, nothing declared is missing.
- **Both JSON files were already offline** by virtue of the step-1 decision to
  import them at build time; they are inside the JS bundle rather than fetched.
- **The icon is the time rail**, which is the app's own mark and original
  artwork — the resort's logos are mirrored for venue rows only and are not
  used here. Two sources: rounded corners for contexts that render the icon
  as-is, and a full-bleed square for the two that mask it themselves, Android
  maskable and iOS `apple-touch-icon` (which renders transparency as black).
  `npm run icons` renders them with `sharp`, already a devDependency.
- **iOS ignores the manifest's display mode**, so the
  `apple-mobile-web-app-*` meta tags are what make an installed shortcut open
  without Safari chrome. They also make the step-9 install banner worth acting
  on.

## Step 13 — deploy

- **Tests run in CI before the build.** "A step is not done until build and
  test both pass" applies to the deploy too; a broken `candidates()` should
  never reach the site, and the suite costs half a second.
- **`configure-pages` with `enablement: true`** turns Pages on for the repo on
  first run, so there is no manual settings toggle to forget. Pages was not
  enabled on the repo before this.
- **`concurrency: cancel-in-progress: false`.** A half-published Pages site is
  worse than a slightly stale one, so a running deploy finishes rather than
  being cancelled by a newer push.
- **`workflow_dispatch` is enabled** so a failed deploy can be retried without
  an empty commit.
- **The Pages artifact is ~33MB** — the mirrored heroes, logos and 42 menu
  PDFs, all precached by the service worker. Well inside Pages' 1GB limit.
- **Eight high-severity advisories are left unfixed, deliberately.** All eight
  are one root cause — a `brace-expansion` DoS reached through
  `workbox-build` → `minimatch`/`jake`/`ejs`. `npm audit --omit=dev` reports
  **0**: none of it ships to the browser, it only runs at build time over our
  own hardcoded globs. `npm audit fix` cannot resolve it without `--force`,
  which would break `vite-plugin-pwa`. Revisit when workbox updates its chain.

## Carried forward
- **`menuUrl` is still unused.** Step 7's detail sheet is the first thing that
  links a menu PDF.

