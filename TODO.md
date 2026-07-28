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

## Carried forward

- **Fonts are installed but not applied.** `@fontsource-variable/archivo` and
  `@fontsource-variable/inter` are dependencies; wiring them up is step 5.
- **`assetUrl` / `menuUrl` are unused until step 5.** Every component must read
  asset paths through them — `menuUrl` in particular handles both the mirrored
  local path and the un-mirrored CDN form.
- **Overrides are applied but not editable.** `applyOverrides` runs before every
  time comparison from day one; the editor UI is step 10.
