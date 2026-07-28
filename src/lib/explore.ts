import { services, venueBySlug, venues, villages } from '../data'
import type { Meal, Service, Venue } from '../types'
import { MEAL_LABELS, MEAL_ORDER } from './display'

export type GroupBy = 'village' | 'meal'
export type VenueGroup = { key: string; label: string; venues: Venue[] }
export type ServiceGroup = { key: string; label: string; services: Service[] }

const byVenue = new Map<string, Service[]>()
for (const service of services) {
  const list = byVenue.get(service.venue)
  if (list) list.push(service)
  else byVenue.set(service.venue, [service])
}
for (const list of byVenue.values()) {
  list.sort((a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal))
}

/** The meals a venue serves, in day order. */
export function mealsFor(slug: string): Meal[] {
  return (byVenue.get(slug) ?? []).map((s) => s.meal)
}

export function servicesFor(slug: string): Service[] {
  return byVenue.get(slug) ?? []
}

/**
 * Both groupings deliberately break the filters every other surface applies.
 * Mario's appears despite `operational: false` — this is the only screen where
 * it is reachable — and 12+ services appear regardless of `HAS_UNDER_12`,
 * carrying their badge. Hiding a restaurant from someone reading about the
 * resort in July helps nobody; hiding it from a recommendation at 7pm is the
 * whole point of the other surfaces.
 */

/**
 * By village, the unit is the venue, not the service. Listing Barefoot three
 * times because it serves three meals is clutter — the row says which meals it
 * serves and the sheet has the hours.
 */
export function venuesByVillage(
  opts: { starredOnly?: boolean; favorites?: string[] } = {},
): VenueGroup[] {
  const starred = new Set(opts.favorites ?? [])
  const pool = opts.starredOnly
    ? venues.filter((v) => servicesFor(v.slug).some((s) => starred.has(s.id)))
    : venues

  return villages
    .map((village) => ({
      key: village.id,
      label: village.name,
      venues: pool
        .filter((v) => v.village === village.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    // Seaside Village carries no venues at all, and a starred filter empties
    // most groups. An empty heading is noise either way.
    .filter((g) => g.venues.length > 0)
}

/** By meal, the unit is the service — that is what a meal *is*. */
export function servicesByMeal(
  opts: { starredOnly?: boolean; favorites?: string[] } = {},
): ServiceGroup[] {
  const starred = new Set(opts.favorites ?? [])
  const pool = opts.starredOnly ? services.filter((s) => starred.has(s.id)) : services

  return MEAL_ORDER.map((meal) => ({
    key: meal,
    label: MEAL_LABELS[meal],
    services: pool
      .filter((s) => s.meal === meal)
      .sort((a, b) =>
        (venueBySlug.get(a.venue)?.name ?? a.venue).localeCompare(
          venueBySlug.get(b.venue)?.name ?? b.venue,
        ),
      ),
  })).filter((g) => g.services.length > 0)
}
