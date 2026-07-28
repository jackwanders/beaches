import { services, venues, villages } from '../data'
import type { Meal, Service, Venue } from '../types'
import { MEAL_LABELS, MEAL_ORDER } from './display'

export type VenueGroup = { key: string; label: string; venues: Venue[] }
export type Option = { id: string | null; label: string; count: number }

export type ExploreFilters = {
  village?: string | null
  meal?: Meal | null
  starredOnly?: boolean
  favorites?: string[]
}

const byVenue = new Map<string, Service[]>()
for (const service of services) {
  const list = byVenue.get(service.venue)
  if (list) list.push(service)
  else byVenue.set(service.venue, [service])
}
for (const list of byVenue.values()) {
  list.sort((a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal))
}

export function servicesFor(slug: string): Service[] {
  return byVenue.get(slug) ?? []
}

/** The meals a venue serves, in day order. */
export function mealsFor(slug: string): Meal[] {
  return servicesFor(slug).map((s) => s.meal)
}

/** The one service a venue runs at a given meal, if it runs one. */
export function serviceAt(slug: string, meal: Meal): Service | undefined {
  return servicesFor(slug).find((s) => s.meal === meal)
}

/**
 * Explore is the catalogue, so it deliberately ignores the filters every other
 * surface applies: Mario's appears despite `operational: false` — this is the
 * only screen where it is reachable — and 12+ services are catalogued rather
 * than hidden. Hiding a restaurant from someone reading about the resort in
 * July helps nobody.
 *
 * The unit is the venue. "Which places in the Italian Village serve lunch" is
 * a question about places; the sheet has the per-service detail.
 */
function matches(venue: Venue, f: ExploreFilters): boolean {
  if (f.village && venue.village !== f.village) return false
  if (f.meal && !mealsFor(venue.slug).includes(f.meal)) return false
  if (f.starredOnly) {
    const starred = new Set(f.favorites ?? [])
    if (!servicesFor(venue.slug).some((s) => starred.has(s.id))) return false
  }
  return true
}

export function exploreVenues(f: ExploreFilters = {}): VenueGroup[] {
  const pool = venues.filter((v) => matches(v, f))
  return villages
    .map((village) => ({
      key: village.id,
      label: village.name,
      venues: pool
        .filter((v) => v.village === village.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    // Seaside Village carries no venues at all, and a filter empties most of
    // the rest. An empty heading is noise either way.
    .filter((g) => g.venues.length > 0)
}

/**
 * Counts on each option are computed with the *other* filters applied, so the
 * numbers say what you would actually get — and a combination that returns
 * nothing shows as 0 before you pick it rather than after.
 */
export function villageOptions(f: ExploreFilters = {}): Option[] {
  const withoutVillage = { ...f, village: null }
  const all = venues.filter((v) => matches(v, withoutVillage))
  return [
    { id: null, label: 'All villages', count: all.length },
    ...villages
      .map((village) => ({
        id: village.id,
        label: village.name,
        count: all.filter((v) => v.village === village.id).length,
      }))
      // Seaside holds nothing at all — never worth offering.
      .filter((o) => venues.some((v) => v.village === o.id)),
  ]
}

export function mealOptions(f: ExploreFilters = {}): Option[] {
  const withoutMeal = { ...f, meal: null }
  const all = venues.filter((v) => matches(v, withoutMeal))
  return [
    { id: null, label: 'All meals', count: all.length },
    ...MEAL_ORDER.map((meal) => ({
      id: meal,
      label: MEAL_LABELS[meal],
      count: all.filter((v) => mealsFor(v.slug).includes(meal)).length,
    })),
  ]
}
