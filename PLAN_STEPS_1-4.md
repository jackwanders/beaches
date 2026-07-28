# Execution plan: build steps 1–4 — scaffold, asset mirror, data layer, `candidates()`

**For the implementation agent.** Read `IMPLEMENTATION_PLAN.md` and `CLAUDE.md` first —
they are authoritative; this file sequences steps 1–4 of the build order and records
decisions already made. Do not proceed past step 4 (home screen onward needs user input).
Every step ends with `npm run build` and `npm run test` green — a step is not done until
both pass.

## Context

Fresh repo containing only `CLAUDE.md`, `IMPLEMENTATION_PLAN.md`, and the two seed files
(`data/venues.json`, 27 venues; `data/services.json`, 44 services). Seed data is given —
correct genuine errors only, never restructure or regenerate. Known traps, verified
present in the data:

- `bobby-dees-snacks` and `mr-mac-snacks` carry `meal: "lunch"` — never parse `id` for meal.
- `the-dive-snacks` and `calypsos-snacks` have `opens: null` / `closes: null` — always-open
  plus an "hours unconfirmed" badge, never hidden.
- `cricketers-latenight` is the only `crossesMidnight: true` service (22:00–02:00).
- `gap` appears in the `meals` array but no service carries it — it is a clock state.
- `marios` is `operational: false` — excluded from query paths, kept for the browse list.
- `calypsos` has null `heroSource` and `logoSource`; two services have null `menuPath`.

## Decisions pre-resolved (append each to `TODO.md` as you apply it)

1. **JSON is imported at build time**, not fetched at runtime. The spec allows either;
   importing means no loading state, no fetch error path, no base-path concern for the
   JSON, and offline-by-default via the bundle. Images/PDFs stay static in `public/`.
2. **`base` is written once**: `vite.config.ts` imports `CONFIG.BASE` from
   `src/config.ts` and sets `base: CONFIG.BASE`. One literal, both mandated locations.
3. **Mirrored assets are renamed to slugs** (`assets/venues/<slug>.jpg`,
   `assets/logos/<slug>.png`, `assets/menus/<service-id>.pdf`) instead of keeping CDN
   filenames with apostrophes/commas/parens. URL-encoding happens once, at download time.
4. **Strict meal filter during real meals**: at lunch, only `meal === "lunch"` services
   compete; open snack services do not pad the list ("two honest answers is the correct
   output"). During **gap**, the filter is open-now across all meals.
5. **02:00–06:00** (undefined in the spec's inference table) maps to `breakfast`, so the
   never-zero rule surfaces "X opens at 6:30" rather than an empty late-night list.

## Step 1 — Scaffold

Vite + React + TS + Tailwind + Vitest, base path set correctly.

- `npm create vite` (react-ts template), then add: `tailwindcss` + `@tailwindcss/vite`
  (v4 style, no separate config file), `vitest`, `tsx` (runs the mirror script),
  `@fontsource-variable/archivo`, `@fontsource-variable/inter` (self-hosted fonts are
  plumbing, not design — install now, apply in step 5).
- `src/config.ts` — the CONFIG block **verbatim from IMPLEMENTATION_PLAN.md** (BASE
  `/beaches/`, TRIP_START `2026-08-15`, TRIP_NIGHTS 5, HOME_VILLAGE `italian`,
  HAS_UNDER_12 true, SUNSET `19:15`, ARRIVE_BEFORE_SUNSET_MINUTES 30, RESULTS 3),
  including the spec's comment block. These values are decided — do not ask about them.
- `vite.config.ts` — `import { CONFIG } from './src/config'`, `base: CONFIG.BASE`.
- Strip the Vite demo to a minimal `App.tsx` shell; keep `index.html` lean
  (manifest/SW/meta tags are step 11, not now). No hardcoded leading `/` anywhere.
- `package.json` scripts: `dev`, `build` (`tsc -b && vite build`), `preview`,
  `test` (`vitest run`), `mirror` (`tsx scripts/mirror-assets.ts`).
- Vitest: node environment, no jsdom — logic tests only per spec. No component tests.

**Check:** `npm run build` passes; `npm run preview` serves the shell at `/beaches/`
with no 404s.

## Step 2 — `scripts/mirror-assets.ts`

Node script (run via `tsx`), using global `fetch`:

- Walk both JSON files. Download every non-null `heroSource`, `logoSource`,
  `menuUrlBase + menuPath`, plus `resort.mapImage`. **URL-encode menu paths** —
  filenames contain apostrophes, commas, parentheses.
- Write to `public/assets/venues/<slug>.<ext>`, `public/assets/logos/<slug>.<ext>`,
  `public/assets/menus/<service-id>.pdf`, `public/assets/map.jpg` (extension from the
  source URL).
- **On success only**, rewrite the JSON field in place to the local relative path
  (`assets/menus/kimonos-dinner.pdf` — no leading slash). On failure, leave the remote
  URL untouched and log it. Skip files that already exist (idempotent, resumable).
- Handle the null cases (Calypso's hero/logo, two null `menuPath`s) — skip, don't crash.
- `src/lib/assets.ts` — the helper the spec requires: a path starting with `http` is
  returned as-is (remote fallback); anything else gets `import.meta.env.BASE_URL`
  prefixed (`BASE_URL` already ends in `/` — concatenate, don't add one). Every
  component reads asset paths through this helper.
- Run the script. **If there is no network egress or the CDN blocks it**: per spec, do
  not stall and do not ask — commit the script, leave the JSON pointing at remote URLs,
  add a `TODO.md` line ("run `npm run mirror` locally"), and continue. The helper makes
  the app work either way.

**Check:** ~55 files in `public/assets/` (26 heroes, 26 logos, ~42 menus, map);
rewritten JSON has no remaining `cdn.sandals.com` URLs (or `TODO.md` records the skip);
`npm run build` still passes and `dist/` contains the assets.

## Step 3 — Types and data layer

- `src/types.ts` — plain colocated types, no runtime validation library:
  - `Meal = 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'lateNight'`
  - `ClockState = Meal | 'gap'` — **gap is a clock state, never a service value**
  - `Format`, `DressCode`, `Confidence`, `Venue`, `Service` — `Service` includes
    optional `crossesMidnight`, `note`, `dataWarning`, and the spec-mandated optional
    `closedDays?: number[]` (populated later by the override editor)
  - `Overrides = Record<string, Partial<Pick<Service, 'opens' | 'closes' | 'closedDays'>> & { closed?: boolean }>`
- `src/data.ts` — imports both JSON files; exports `services`, `venues`,
  `venueBySlug`, `keywordVocabulary`, the resort record, and `activeServices`
  (services whose venue is `operational` — Mario's two services excluded from query
  paths; the venue itself stays for the browse list + "closed for refurbishment" badge).
  Never derive `meal` from `id` anywhere.
- `src/lib/storage.ts` — tiny namespaced localStorage get/set for `btc:v1:*` keys
  (needed now for `btc:v1:overrides`; favorites/notes reuse it in step 9). The origin
  is shared with other projects — never write an un-namespaced key.
- `src/lib/overrides.ts` — `applyOverrides(services, overrides)`: merges stored
  hours/`closedDays`/`closed` onto services **before any time comparison**. The editor
  UI is step 10; the application layer exists from day one.

**Check:** `tsc` clean; a smoke test asserts 44 services and 27 venues load, and that
both `-snacks`-suffixed lunch services read `meal: "lunch"` from the field.

## Step 4 — `candidates()` + clock inference + tests

`src/lib/clock.ts`:

- `minutesOfDay(t: Date)` and `clockState(t): ClockState` per the spec's inference
  table, half-open intervals `[start, end)`: 06:00 breakfast, 11:00 lunch, 15:30 gap,
  17:00 dinner, 21:30 lateNight (through 02:00); 02:00–06:00 → breakfast (decision 5).
  Device local time directly — no timezone handling (spec: TCI = Eastern in August).

`src/lib/candidates.ts`:

- `isOpenAt(s, minutes)` — `opens === null` → always open; `crossesMidnight` → open
  when `minutes >= opens || minutes < closes`; otherwise `opens <= minutes < closes`.
- `candidates(t, opts)` exactly per the spec's 7-step pipeline:
  1. Meal from `opts.meal`, else `clockState(t)`.
  2. Overrides applied **first** (via `applyOverrides`), before any time comparison.
  3. Real meal → `s.meal === meal` AND open at `t`; gap → open at `t`, any meal
     (decision 4). Operate on `activeServices` only.
  4. Drop `minAge > youngestInParty` (driven by the HAS_UNDER_12 setting).
  5. Cravings → keyword intersection. Moods → predicate map straight from the spec's
     table (pure data; implemented now so step 6 only wires chips to it).
  6. **Never zero:** if the filtered set is empty, search forward in time (wrapping
     past midnight) for the next services matching the same filters; return them with
     `opensAt` set. Return type `Candidate = { service: Service; opensAt?: number }`
     so the UI can render "Soy opens at 5:30 — sushi tonight?".
  7. Rank: has `signatureDishes` → `confidence === 'verified'` → Google rating →
     proximity (village match to `CONFIG.HOME_VILLAGE`; GPS is a later enhancement) →
     venue name alphabetical. Then rotate the full ranked list by
     `dayOfMonth % length` — seeded by date only, stable within a day.
- Returns the **full ranked list**. Windowing is a separate pure helper
  `rerollWindow(list, page)` returning 3 per page, wrapping to the start, never
  reshuffling. If fewer than 3 exist, return what there is — no padding with closed
  venues, no relaxing `minAge`.

`src/lib/*.test.ts` (Vitest, colocated), covering exactly the spec's test list:

- Clock boundaries at 06:00, 11:00, 15:30, 17:00, 21:30, plus the 02:00/05:59 edges.
- `cricketers-latenight` open at 23:30 **and** 00:30; closed at 02:30.
- `minAge` with `youngestInParty` under and over 12 — Sky appears at breakfast
  regardless, drops at dinner only when under-12 (the canonical meal-keyed case).
- Null-hours services (`the-dive-snacks`, `calypsos-snacks`) treated as open.
- An override on `schooners-breakfast` `closes` changes the open-at result.
- Reroll windowing including wrap on a list whose length is not divisible by 3.
- Never-zero: sushi craving at 09:00 returns Soy with `opensAt` 1050 (17:30).
- Gap at 16:00 returns a non-empty open-now list (Cricketer's, cafés, trucks).
- Day-seeded rotation is deterministic for a fixed date.

**Check:** `npm run build` && `npm run test` both green.

## Files created

```
src/config.ts  src/types.ts  src/data.ts
src/lib/{assets,storage,overrides,clock,candidates}.ts  (+ colocated *.test.ts)
scripts/mirror-assets.ts
public/assets/{venues,logos,menus}/*   (if egress allows)
TODO.md                                (decisions 1–5, plus mirror status if skipped)
```

## Verification (end of step 4)

1. `npm run build` — tsc + vite build clean.
2. `npm run test` — full Vitest suite green.
3. `npm run preview` — shell serves under `/beaches/`, no 404s.
4. Spot-check the acceptance items already testable at this layer: `candidates()` at
   16:00 is non-empty; sushi at 09:00 shifts forward to Soy; Sky and Butch's differ
   by meal; editing Schooners' hours via an override changes the result.

## Out of scope here (steps 5–12)

Home screen, time rail, chips, detail sheet, search, favorites/notes/export, override
editor UI, manifest + service worker, GitHub Actions deploy. Do not start these —
UI/UX direction needs the user.
