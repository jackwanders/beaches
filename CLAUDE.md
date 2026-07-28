# CLAUDE.md

## What this is

A static, offline-first web app that answers "where should we eat?" for one family
at Beaches Turks & Caicos, August 2026. 27 venues, 44 services, five nights.
Two users, one week, no backend.

## The spec

`IMPLEMENTATION_PLAN.md` at the repo root is authoritative. Read it before
starting any task. Two sections are binding and override your own judgment:

- **Non-goals** — everything listed there was deliberately cut. Do not add it
  back, do not add it "just in case," do not suggest it.
- **Configuration** — every value in `src/config.ts` is already decided. Do not
  ask about trip dates, party composition, home village, or base path.

Seed data lives in `data/venues.json` and `data/services.json`. Treat both as
given. Correct genuine errors, but do not restructure or regenerate them.

## The product thesis

The enemy is decision fatigue. Every feature exists to **shrink** the number of
options, never to present them. The home screen shows exactly three
recommendations. A screen showing nine options has failed.

When any call is ambiguous, bias toward: fewer taps, fewer results, less
configuration, less code.

## Do not stop to ask

If something is underspecified, pick the option that produces fewer choices for
the user, append a line to `TODO.md` naming the decision and what you chose, and
keep going. A working app with six flagged assumptions beats a half-built one
with a question attached.

Exception: stop if a change would violate a non-goal, or if seed data appears
factually wrong in a way you can't resolve from the plan.

## Commands

```
npm run dev       # vite dev server
npm run build     # tsc + vite build
npm run preview   # serve dist/ — use this to verify the base path
npm run test      # vitest run
npm run mirror    # download CDN assets to public/, rewrite JSON to local paths
```

## Definition of done

A step is not complete until `npm run build` and `npm run test` both pass. Run
them. Do not report a step finished on code you haven't compiled.

## Conventions

**Base path.** `CONFIG.BASE` in `src/config.ts` and `base` in `vite.config.ts`
are the only places a path prefix is written. Everywhere else, read
`import.meta.env.BASE_URL`. Never hardcode a leading `/`. This includes the
manifest, the service worker registration and its scope, JSON fetches, and every
asset src. A service worker cannot control paths above its own location — if its
scope isn't the base path, precaching silently does nothing.

**Services, not venues.** The primary record is a venue × meal service. Sky is
12+ at dinner only; Butch's requires reservations at dinner only; Arizona's is a
buffet at lunch and à la carte at dinner. Never collapse a service back to its
venue.

**Three data traps.** `gap` is a clock state, not a service `meal` value —
filtering for it returns nothing. Never parse `id` to derive `meal`; two IDs end
in `-snacks` while carrying `meal: "lunch"`. Null hours mean always-open with an
"hours unconfirmed" badge, not hidden.

**Offline is a requirement, not a nice-to-have.** No runtime CDN calls — not for
fonts, not for images, not for menus. Everything bundled or precached.

**localStorage keys are namespaced** `btc:v1:*`. The origin is shared with every
other project on `jackwanders.github.io`.

## Style

Idiomatic modern React and TypeScript. The user is a React Native / TypeScript
engineer — write for a peer. Don't over-abstract a 44-record app: no state
management library, no dependency injection, no repository pattern. Plain
components, plain functions, colocated types.

Comment the non-obvious domain logic (meal inference boundaries, midnight
crossing, override precedence). Don't comment the obvious.

## What matters most

In order: the `candidates()` query is correct → the app works offline → the
home screen is legible in direct sunlight one-handed → it looks good.

