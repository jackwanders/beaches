// ─────────────────────────────────────────────────────────────────────────────
// Every open decision, pre-resolved. This is the single place the user edits.
// ─────────────────────────────────────────────────────────────────────────────
export const CONFIG = {
  // Repo/base — see "Base path" in IMPLEMENTATION_PLAN.md. Change to '/' if the
  // repo is named jackwanders.github.io.
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
