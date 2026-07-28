import venuesJson from '../data/venues.json'
import servicesJson from '../data/services.json'
import type { Resort, Service, Venue, Village } from './types'

// Imported at build time, not fetched: no loading state, no fetch error path,
// no base-path concern for the JSON, offline by default via the bundle.
export const venues = venuesJson.venues as Venue[]
export const services = servicesJson.services as Service[]

export const resort = venuesJson.resort as Resort
export const villages = venuesJson.villages as Village[]
export const menuUrlBase = servicesJson.menuUrlBase
export const keywordVocabulary = servicesJson.keywordVocabulary as string[]

export const venueBySlug = new Map(venues.map((v) => [v.slug, v]))

/**
 * Services whose venue is operational. Mario's two services are excluded from
 * every query path; the venue itself stays in `venues` for the browse list and
 * its "closed for refurbishment" badge.
 */
export const activeServices = services.filter((s) => venueBySlug.get(s.venue)?.operational)
