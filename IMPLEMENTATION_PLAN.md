# Beaches Turks & Caicos — Dining Decider

A single-purpose static web app for one family, one resort, five nights in August 2026.

## The job

Answer "where should we eat?" in under five seconds, with as few taps as possible, on a phone, in bright sun, possibly with wet hands.

The enemy is decision fatigue. The resort has 27 dining venues and 44 distinct services. Every feature in this app exists to **shrink** that number, never to present it. A screen that shows nine options has failed.

Four questions the app must answer:

1. Where should we eat now?
2. Where should we eat later today?
3. What's good at this place?
4. Where should we eat dinner tonight or tomorrow?

## Configuration — every open decision, pre-resolved

Put these in `src/config.ts` as the single place the user edits. **Do not stop to ask about any of these; the defaults below are the answers.** Flag them in a comment block so they're easy to find later.

```ts
export const CONFIG = {
  // Repo/base — see "Base path" below. Change to '/' if the repo is
  // named jackwanders.github.io.
  BASE: '/beaches/',

  // Trip window. Used for the reservations nag and sunset times.
  // If these are wrong the app still works; nothing hard-fails.
  TRIP_START: '2026-08-15',
  TRIP_NIGHTS: 5,

  // Room location. Drives village-level proximity when GPS is
  // unavailable or the venue has no coordinates.
  HOME_VILLAGE: 'italian',

  // Party composition. Drives the minAge filter. `true` means the
  // three 12+ dinner services are hidden by default.
  HAS_UNDER_12: true,

  // Sunset in Providenciales, mid-August, drifting ~1 min earlier
  // per day. Good enough; do not add an ephemeris library.
  SUNSET: '19:15',
  ARRIVE_BEFORE_SUNSET_MINUTES: 30,

  // Recommendation count. The whole product thesis.
  RESULTS: 3,
}
```

**Timezone:** use the device's local time directly. Turks & Caicos is UTC−4 year-round and US Eastern is UTC−4 in August, so a phone left on Eastern shows correct resort time for this trip. Do not add timezone conversion or a tz library.

**Party composition is a settings toggle**, not a prompt. Default it on, let the user flip it, persist to `btc:v1:settings`. When off, the 12+ services appear normally.

## Non-goals — do not build these

These were considered and deliberately cut. Do not add them back.

- **No meal planning or itinerary.** The user does not want to pre-assign dinners, even tentatively. No calendar, no week view, no "plan your trip."
- **No visit logging or "already visited" tracking.** No write path for history. The family will remember where they ate.
- **No backend, no API, no database.** Static files only.
- **No accounts, no sync, no sharing of user state.** Two phones, two independent local states, by design.
- **No reservation booking.** Not possible; reservations happen through the resort app or concierge on property.
- **No live wait times or crowding.** No data source exists.
- **No light mode.** The dark palette is deliberate — sun legibility and OLED battery. One theme.
- **No i18n, no analytics, no error reporting, no cookie banner.** Two users, one week.

## Stack

- Vite + React + TypeScript
- Tailwind for styling
- No router needed — single screen with modal detail views
- Data loaded from two static JSON files at build time or first fetch
- Deployed to GitHub Pages via GitHub Actions on push to `main`

The user is a React Native / TypeScript engineer. Idiomatic modern React is fine; don't over-abstract a 44-record app.

### GitHub Pages specifics

- The repo must be public unless the user has GitHub Pro.
- HTTPS is automatic, which service workers require.

#### Base path — read this before writing any path anywhere

The site may be served from either:

- **Domain root** — repo named `jackwanders.github.io` → served at `/`
- **Subpath** — any other repo name, e.g. `beaches` → served at `/beaches/`

**Set the base in exactly one place and derive everything else from it.** Do not hardcode a leading `/` anywhere in the app.

```ts
// vite.config.ts
const BASE = '/beaches/'   // or '/' for the root repo — the ONLY place this is written
export default defineConfig({ base: BASE })
```

Everywhere else, read `import.meta.env.BASE_URL`. Vite populates it from `base` at build time.

| Thing | Wrong | Right |
|---|---|---|
| JSON fetch | `fetch('/data/services.json')` | `fetch(\`${import.meta.env.BASE_URL}data/services.json\`)` |
| Asset src | `/assets/venues/x.jpg` | `${import.meta.env.BASE_URL}assets/venues/x.jpg` |
| SW registration | `register('/sw.js')` | `register(\`${import.meta.env.BASE_URL}sw.js\`, { scope: import.meta.env.BASE_URL })` |
| Manifest `start_url` | `/` | `/beaches/` |
| Manifest `scope` | `/` | `/beaches/` |
| Manifest icon paths | `/icon.png` | `icon.png` (relative, resolves against the manifest's own location) |
| `apple-touch-icon` | `/apple-touch-icon.png` | `%BASE_URL%apple-touch-icon.png` |

`BASE_URL` always carries a trailing slash, so concatenate without adding one.

**The service worker scope rule is the one that will silently break you.** A worker can only control paths at or below its own location. A worker served from `/sw.js` cannot control `/beaches/` — registration succeeds and then nothing caches. The worker file must land at `/beaches/sw.js`, which means it goes in `public/` so Vite copies it to `dist/` unchanged, and its precache manifest must list base-prefixed URLs.

**Lower-risk alternative:** use `vite-plugin-pwa`, which derives the manifest `scope`, `start_url`, and the worker registration path from `base` automatically. If you use it, setting `base` correctly is the only manual step. Prefer this unless there's a reason not to.

**Verify before moving on:** build, serve `dist/` under the subpath, and confirm in DevTools → Application that the service worker shows a scope of `/beaches/` and status *activated*, and that the manifest resolves its icons. A 404 on `sw.js` or a scope of `/` means this is wrong.

## Data model

Two seed files are provided in `data/`.

### `venues.json` — 27 records

Stable, meal-independent attributes: slug, display name, tagline, village, cuisine, coordinates where known, Google place ID / rating / review count where known, and source URLs for hero image and logo.

### `services.json` — 44 records

**This is the primary table.** One record per venue × meal. Everything time-varying or meal-varying lives here:

| Field | Notes |
|---|---|
| `id` | `venue-meal`, e.g. `neptunes-dinner` |
| `venue` | FK to venues.slug |
| `meal` | `breakfast` \| `lunch` \| `dinner` \| `snacks` \| `lateNight` |
| `opens`, `closes` | minutes from local midnight; `null` where unpublished |
| `crossesMidnight` | true only for `cricketers-latenight` |
| `format` | `buffet` \| `alacarte` \| `hybrid` \| `quickservice` \| `truck` |
| `dressCode` | `casual` \| `evening` |
| `reservation` | boolean |
| `minAge` | `null` or `12` |
| `menuPath` | append to `menuUrlBase`; **URL-encode** — filenames contain apostrophes, commas, parentheses |
| `menuVintage` | year of the menu PDF, or null for undated buffet signage |
| `confidence` | `verified` (real à la carte menu) \| `inferred` (buffet signage, keywords hand-assigned) |
| `keywords[]` | controlled vocabulary, see below |
| `signatureDishes[]` | hand-curated from reviews and guides |
| `note`, `dataWarning` | surface `dataWarning` in the UI |

### Three traps in the seed data

1. **`gap` appears in the `meals` array but no service has it.** It is a *clock state*, not a service value. Never filter services by `meal === "gap"` — you'll get an empty set. See the meal inference table.
2. **Never parse `id` to derive `meal`.** Two ids end in `-snacks` while carrying `meal: "lunch"` (`bobby-dees-snacks`, `mr-mac-snacks`). `id` is an opaque key. Read the `meal` field.
3. **Two services have `opens: null` and `closes: null`** (`the-dive-snacks`, `calypsos-snacks`). **Treat null hours as always-open** and render them with an "hours unconfirmed" badge. Do not hide them and do not invent hours.

**Venues with `operational: false`** (currently Mario's only) are excluded from all recommendation and search results, but remain visible in the All Venues browse list with a "closed for refurbishment" badge. Do not delete them.

**Why meal-keyed matters.** Three venues are unrepresentable any other way:

- **Sky** — no age limit at breakfast, 12+ at dinner
- **Butch's** — walk-in and casual at breakfast, reservation and evening attire at dinner
- **Arizona's** — buffet at lunch, à la carte at dinner, entirely different keywords

Never collapse a service back to its venue.

### Local state (localStorage only)

```
btc:v1:favorites  →  ["neptunes-dinner", "kimonos-dinner"]
btc:v1:notes      →  { "neptunes-dinner": "eggs benedict" }
btc:v1:overrides  →  { "schooners-breakfast": { "closes": 690 } }
```

Namespace-prefix every key: project pages share the `<username>.github.io` origin with every other project the user hosts.

## The core query

Everything on the home screen comes from one function.

```ts
function candidates(t: Date, opts: {
  meal?: Meal
  cravings?: string[]
  moods?: MoodId[]
  youngestInParty?: number
}): Service[]
```

1. Determine meal — from `opts.meal` if set, otherwise infer from the clock (below)
2. Filter to services open at `t` (handle `crossesMidnight`; treat `opens === null` as always-open)
3. Drop services where `minAge > youngestInParty`
4. If cravings set, keep services whose `keywords` intersect
5. If moods set, keep services matching the mood predicate
6. Apply local `overrides` before any time comparison
7. Rank, take 3

### Meal inference from the clock

| Local time | Meal |
|---|---|
| 06:00–11:00 | breakfast |
| 11:00–15:30 | lunch |
| 15:30–17:00 | **gap** |
| 17:00–21:30 | dinner |
| 21:30–02:00 | lateNight |

**The gap is a first-class state, not an empty result.** Between roughly 15:30 and 17:00 lunch is over and dinner hasn't started. Say so plainly and list what's actually open: Cricketer's, Café de Paris, Jojo Java, Brü, Yoyo's, Bobby Dee's, Mr. Mac. Do not render an empty lunch list.

### Two hard rules

- **Always return exactly three.** Three plus a reroll is a decision; nine is homework.
- **Never return zero.** If a craving matches nothing open now, shift forward in time rather than hiding it: *"Soy opens at 5:30 — sushi tonight?"* Same for anything closed. This is where meal-keyed data earns its keep.

### Where the three-result rule applies

Only to the **home screen recommendation surface**. Search results, the All Venues list, and Favorites show everything that matches — those are browse surfaces and the user asked for them.

### Reroll

`candidates()` returns the full ranked list; the home screen renders a window of three. Reroll advances the window by three and wraps to the start when it runs out. It does not reshuffle — a user who rerolls past something wants to be able to get back to it.

**If fewer than three candidates exist,** render what there is. Do not pad with closed venues, and do not relax the `minAge` filter to reach three. At 06:15 there may be exactly two answers, and two honest answers is the correct output.

### Ranking

Deterministic, in this order: has `signatureDishes` → `confidence === "verified"` → Google rating where present → proximity if a fix is available → alphabetical by venue name as the final tiebreak.

Then apply a day-seeded rotation to the final list so the same three don't lead every day: rotate the array by `dayOfMonth % length`. Seeded by date only, so it's stable within a day — the list must not change between renders.

## Screens

### Home — the only screen that matters

```
┌─────────────────────────────┐
│  DINNER          6:42 PM    │   inferred meal + clock
│  ═════════════▓▓▓▓░░░░░     │   time rail (signature)
├─────────────────────────────┤
│  pizza  pasta  sushi  ...   │   craving chips, horiz scroll
│  quick  sand  nice  cool    │   mood chips
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │ NEPTUNES        4.5★  │  │
│  │ Mediterranean · Key W │  │
│  │ open till 9:30        │  │
│  │ "Lamb shank"          │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │   3 cards, no more
│  ┌───────────────────────┐  │
├─────────────────────────────┤
│      [ show me others ]     │   reroll
└─────────────────────────────┘
```

No chips tapped = the time-based default. That state must be genuinely useful on its own, because it's the state the app is in 90% of the time.

### Detail sheet

Hero image, village, hours for every service at that venue, signature dishes, dress code and reservation badges, age limit if any, menu PDF link, star and note controls, `dataWarning` if present.

### Other views

- **Favorites** — starred services with notes, grouped by meal
- **All venues** — flat browsable list, for pre-trip reading
- **Search results** — see below

## Chips

### Craving chips

Rendered from `keywordVocabulary` in `services.json`, ordered by how many services carry each: pizza, pasta, sushi, seafood, steak, burgers, tacos, jerk, salad, coffee, dessert, ice cream.

### Mood chips

Predicates over service fields, not a stored column:

| Chip | Predicate |
|---|---|
| Quick and easy | `format` in truck, quickservice |
| Toes in the sand | venue in barefoot, schooners, neptunes, bayside, arizonas |
| Somewhere nice | `dressCode === "evening"` |
| Cool and indoors | venue in giuseppes, reflections, cricketers, kimonos, soy, marios, pinta |
| Kids are feral | `format` in truck, quickservice, plus pinta, arizonas |
| Surprise us | no filter, random from valid set |

Either chip row alone produces an answer. Both together narrows. Neither gives the default.

## Search

A single input with autosuggest over the ~40-term controlled vocabulary — **not** over extracted menu text.

This is deliberate. Autosuggest over thousands of extracted dish strings is unusable; nobody types "Grilled Mahi Mahi with Scotch Bonnet Beurre Blanc." Forty curated terms give instant, predictable suggestions.

Typing `pasta` returns the services carrying that keyword, each showing which signature dishes matched where known. Results respect open-now as a sort, not a filter — show closed matches below, with their next opening time.

**Progressive enhancement, not required for v1:** parsing the menu PDFs for dish-level text and layering those hits under the keyword hits. Roughly half the PDFs are buffet signage rather than dish lists, so extraction alone would miss that Giuseppe's is the pasta buffet. The keyword layer is the floor; extraction only ever adds.

## Favorites and notes

Star any service; attach a free-text note. Per-device, never shared. Two people, two independent states, deliberately.

**The iOS eviction trap.** Safari clears localStorage after 7 days without a visit. The usage pattern here — browse and star in July, don't reopen until August — triggers exactly that. Installing to the home screen exempts the site. So:

- Show a one-time dismissible banner on iOS: *"Add to Home Screen to keep your stars."*
- Ship an export button that copies both keys as JSON, and an import that accepts it. Ten lines, and it covers eviction, a cleared cache, or a new phone.

## PWA and offline

**Re-read "Base path" under GitHub Pages specifics before writing the manifest or the service worker.** Both are base-sensitive, and a wrong service worker scope fails silently — registration succeeds, nothing caches, and you don't find out until you're offline on a beach.

- Web app manifest, standalone display, portrait, `apple-touch-icon` and `apple-mobile-web-app-*` meta tags for iOS
- `start_url` and `scope` both set to the base path
- Service worker precaches the app shell, both JSON files, all hero images, all logos, and all 42 menu PDFs — every entry base-prefixed
- Fully functional with the network off after first load

## Asset mirroring — do this before anything else

Every image and menu PDF currently points at `cdn.sandals.com`. Write `scripts/mirror-assets.ts` that walks both JSON files, downloads every `heroSource`, `logoSource`, and `menuUrlBase + menuPath`, writes them to `public/assets/{venues,logos,menus}/`, and rewrites the JSON to local paths.

Two reasons this isn't optional: cross-origin assets are painful to precache, so offline mode would fail for the menus — the thing most worth having offline. And Sandals can re-path those files at any time, including mid-trip.

Expect roughly 30–60 MB total. Well within Pages limits.

**If the sandbox has no network egress,** or the CDN blocks the requests: do not stall and do not ask. Write the script, leave the JSON pointing at the remote URLs, mark the step incomplete in a `TODO.md` at the repo root, and continue building. The user runs `npm run mirror` on their own machine afterward. The app must work either way — read every asset path through a helper that returns the local path if present and the remote URL otherwise.

**Fonts must be self-hosted**, not loaded from Google Fonts at runtime. A CDN font request breaks offline mode and blocks first paint on resort wifi. Use `@fontsource` packages so they're bundled and precached. Suggested pairing, substitute freely if something fits the direction better: `@fontsource-variable/archivo` (condensed weights for venue names) with `@fontsource-variable/inter` for body and tabular numerals.

## Geolocation

Optional and lazy. Do not request permission on load — request it the first time the user opens a view where proximity matters, with a one-line explanation.

On denial, timeout, or a venue with `lat: null`: fall back silently to village-level proximity, ranking `CONFIG.HOME_VILLAGE` first, then everything else. Never show an error, never re-prompt, never block a recommendation on a location fix. Only 10 of 27 venues have coordinates, so the fallback path is the common path — build it first and treat GPS as the enhancement.

## App icon

Generate a simple original SVG icon and export the PNG sizes the manifest needs (192, 512, plus a 180 `apple-touch-icon`). A fork-and-palm-frond mark, or the time rail motif, in the palette below. Do not use the resort's logos for the app icon — they're theirs, and they're mirrored for venue rows only.

## Testing

Vitest. Cover the logic that's easy to get subtly wrong and impossible to notice: meal inference at every boundary (11:00, 15:30, 17:00, 21:30), `crossesMidnight` for `cricketers-latenight` at 23:30 and 00:30, `minAge` filtering with `HAS_UNDER_12` both ways, null-hours services treated as open, overrides applied before comparison, and reroll windowing including the wrap.

No component or E2E tests. This is a two-user app for one week.

## Design direction

Take a real point of view. Avoid the three defaults that AI-generated design clusters around — warm cream with a serif and terracotta accent, near-black with one acid accent, and broadsheet hairline-rule layouts.

**Subject world:** Grace Bay water, resort signage, and the printed meal board the resort hands out at check-in. The app is a personal version of that board.

- **Palette** — deep ocean ground `#0B2B3C`, high-luminance turquoise `#39C7C0`, sand `#E8DCC4`, warm signal orange `#F07830` for closing-soon, off-white `#F7FAFA` for type. Chosen for legibility in direct sun, which is the real constraint; the dark ground also drains less battery on OLED.
- **Type** — a condensed grotesque for venue names, at signage scale. A humanist sans for body. Tabular numerals for all times, so the hours columns align.
- **Signature element — the time rail.** A horizontal bar under the header showing the day's meal windows with a live "now" marker sliding across it. It encodes the single truest thing about this app: everything is a function of the clock. It also makes the 15:30 lunch cliff and the gap visible before they bite.
- Spend boldness only on the rail. Everything else stays quiet: large tap targets, high contrast, no decoration.
- Quality floor without announcing it: responsive to small phones, visible keyboard focus, `prefers-reduced-motion` respected.

**Copy:** plain and active. Empty states give direction, not mood — *"Lunch is over. Dinner starts at 5:00. Open right now:"* rather than *"Nothing found."*

## Known data gaps — surface these, don't hide them

The seed data is a July snapshot for an August trip. Build an **override editor** on day one: a settings screen that lets the user edit any service's hours or mark it closed, persisted to `btc:v1:overrides` and applied before every time comparison. Without it, the first correction requires a laptop.

Specific issues already flagged in the data:

- **Mario's** is marked `operational: false` — listed as under refurbishment with no reopening date
- **Bobby Dee's** official hours read 11:00 AM – 6:00 AM, almost certainly a typo for 6:00 PM; encoded as 6:00 PM, flagged
- **Calypso's Snow Cone Station** appears only on the village page, not the restaurants feed; no hours or menu
- **The Dive** has no hours and no menu — drinks only
- **Day-of-week closures exist but are not published.** Google suggests Schooners skips Wednesday breakfast; a reviewer reported Le Petit Chateau closed on a Friday. The schema has no day dimension — add optional `closedDays[]` and let the override editor populate it from the printed check-in sheet.
- **Google and the official site disagree** on Cricketer's close (midnight vs 2:00 AM) and Barefoot's dinner open (5:00 vs 5:30). Official wins for hours; Google wins for coordinates and ratings.
- **Only 10 of 27 venues have coordinates.** Proximity is a tiebreaker, not a primary sort — the property is 95 acres and roughly 600m end to end, so nothing is more than a ten-minute walk. Fall back to village-level grouping. The user can hand-place the remaining pins from `resort.mapImage` if desired.

## Nice-to-haves, in priority order

1. **Reservations nag.** Kimonos and Butch's dinner are the only two services with `reservation: true`, both bookable only after check-in, both fill fast. A dismissible first-run card is a few lines and prevents the most common regret at this resort.
2. **Sunset timing.** Mid-August sunset in Providenciales is around 19:15, drifting a minute earlier per day. For the sunset-view venues — Schooners, Arizona's, Sky, Barefoot, Neptunes, Bayside — show a computed "be there by 18:45" line.
3. **Ambience tag.** `quiet | lively` per service. Le Petit Chateau's terrace sits beside the nightly Sesame Street show and gets loud; Schooners, Arizona's, and Neptunes have live music people liked.
4. **Adults-only mode.** A toggle filtering to the three 12+ dinner services, as a distinct app state rather than a filter.

## If something is still ambiguous

Do not stop to ask. Pick the option that produces fewer choices for the user, write a line in `TODO.md` at the repo root naming the decision and what you chose, and keep going. A working app with six flagged assumptions is worth more than a half-built one with a clarifying question attached.

Bias every unresolved call toward: fewer taps, fewer results, less configuration, less code.

## Build order

1. Scaffold Vite + React + TS + Tailwind, `base` set correctly for the chosen repo name
2. `scripts/mirror-assets.ts`, run it, commit the assets, rewrite JSON to local paths
3. Types and data loaders for both JSON files
4. `candidates()` and the clock→meal inference, with unit tests for the gap, `crossesMidnight`, and `minAge`
5. Home screen: header, time rail, three cards, reroll
6. Chip rows and predicates
7. Detail sheet
8. Search with autosuggest
9. Favorites, notes, export/import, iOS banner
10. Explore — the All Venues browse list, grouped by village and meal, with a
    starred-only filter. Reached by a `Now | Explore` segmented control in the
    header, not a bottom tab bar: mode switching is a once-per-trip-phase
    action, and at 16:00 the home screen has only ~53px of vertical slack, so a
    56–64px tab bar would push the gap state into scrolling. Favorites live
    here as a filter rather than as a third destination, which is what keeps
    the top level at two. This is where `operational: false` finally surfaces —
    Mario's is unreachable anywhere in the app until it exists.
11. Override editor
12. Manifest, service worker, precache
13. GitHub Actions deploy to Pages

## Acceptance checks

- At 16:00 local, the app shows the gap state naming Cricketer's and the cafés — never an empty list
- At 08:00, Sky appears with no age warning; at 19:00, Sky shows 12+
- At 08:00, Butch's shows no reservation badge; at 19:00 it shows reservation and evening attire
- Tapping `sushi` at 09:00 offers Soy at 17:30 rather than "no results"
- Every screen returns at most three primary recommendations
- Served under a subpath, DevTools → Application shows the service worker activated with scope matching the base path, and no 404s on `sw.js`, the manifest, or the JSON files
- Airplane mode after first load: full browsing, all 42 menu PDFs open
- A star set, then a hard reload, then a browser restart — still there
- Editing Schooners' hours in the override editor changes what the home screen returns

