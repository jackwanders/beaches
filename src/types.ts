export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'lateNight'

/**
 * `gap` is a clock state, never a service value. Filtering services for
 * `meal === 'gap'` returns nothing — no record carries it.
 */
export type ClockState = Meal | 'gap'

export type Format = 'buffet' | 'alacarte' | 'hybrid' | 'quickservice' | 'truck'
export type DressCode = 'casual' | 'evening'
export type Confidence = 'verified' | 'inferred'

export type Venue = {
  slug: string
  name: string
  tagline: string
  village: string
  cuisine: string
  lat: number | null
  lng: number | null
  coordSource?: string
  googlePlaceId: string | null
  rating: number | null
  ratingCount: number | null
  heroSource: string | null
  logoSource: string | null
  operational: boolean
  venueType?: string
  notice?: string
  note?: string
}

export type Service = {
  id: string
  venue: string
  meal: Meal
  /** Minutes from local midnight. `null` means hours are unpublished — always open. */
  opens: number | null
  closes: number | null
  crossesMidnight?: boolean
  format: Format
  dressCode: DressCode
  reservation: boolean
  minAge: number | null
  menuPath: string | null
  menuVintage: number | null
  confidence: Confidence
  keywords: string[]
  signatureDishes: string[]
  note?: string
  dataWarning?: string
  /** 0 = Sunday. Populated by the override editor from the check-in sheet. */
  closedDays?: number[]
}

export type Village = { id: string; name: string }

export type Resort = {
  name: string
  address: string
  lat: number
  lng: number
  googlePlaceId: string
  rating: number
  ratingCount: number
  mapImage: string
  timezone: string
}

/** Keyed by service id. Merged onto services before any time comparison. */
export type Overrides = Record<
  string,
  Partial<Pick<Service, 'opens' | 'closes' | 'closedDays'>> & { closed?: boolean }
>
