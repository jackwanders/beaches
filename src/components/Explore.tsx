import { useMemo, useState } from 'react'
import { venueBySlug } from '../data'
import { thumbUrl } from '../lib/assets'
import { isOpenAt } from '../lib/candidates'
import { MEAL_LABELS, badgesFor, hoursText, villageName } from '../lib/display'
import { mealsFor, servicesByMeal, servicesFor, venuesByVillage, type GroupBy } from '../lib/explore'
import type { Service, Venue } from '../types'
import { Badge } from './Badge'

const CARD =
  'relative flex gap-3 rounded-2xl border border-foam/10 bg-surface p-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-turquoise has-active:bg-foam/5'

const TITLE = 'condensed truncate font-display text-lg font-semibold tracking-tight text-foam'
const STRETCH = "text-left after:absolute after:inset-0 after:content-[''] focus:outline-none"

function Thumb({ venue }: { venue: Venue | undefined }) {
  const src = thumbUrl(venue?.heroSource)
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className={`size-12 shrink-0 rounded-lg object-cover ${
        venue?.operational === false ? 'opacity-40 grayscale' : ''
      }`}
    />
  )
}

function Closed({ venue }: { venue: Venue }) {
  if (venue.operational !== false) return null
  return (
    <p className="mt-1 text-[13px] leading-snug text-signal">
      {venue.notice ?? 'Closed for refurbishment.'}
    </p>
  )
}

/** By village the unit is the venue: one row, however many meals it serves. */
function VenueRow({
  venue,
  starred,
  onSelect,
}: {
  venue: Venue
  starred: boolean
  onSelect: (venue: Venue) => void
}) {
  const meals = mealsFor(venue.slug)

  return (
    <article className={CARD}>
      <Thumb venue={venue} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className={TITLE}>
            <button type="button" onClick={() => onSelect(venue)} className={STRETCH}>
              {venue.name}
            </button>
          </h3>
          <span className="flex shrink-0 items-baseline gap-1.5">
            {starred && <span className="text-sm text-sand">★</span>}
            {venue.rating != null && (
              <span className="text-sm tabular-nums text-sand/80">{venue.rating} ★</span>
            )}
          </span>
        </div>

        <p className="truncate text-[12px] text-sand/60">{venue.cuisine}</p>

        {/* Which meals, not which hours — the sheet has the hours. */}
        <p className="mt-0.5 text-sm text-sand/80">
          {meals.length > 0
            ? meals.map((m) => MEAL_LABELS[m].toLowerCase()).join(' · ')
            : 'no published service'}
        </p>

        <Closed venue={venue} />
      </div>
    </article>
  )
}

/** By meal the unit is the service — that is what a meal is. */
function ServiceRow({
  service,
  nowMinutes,
  starred,
  note,
  onSelect,
}: {
  service: Service
  nowMinutes: number
  starred: boolean
  note?: string
  onSelect: (service: Service) => void
}) {
  const venue = venueBySlug.get(service.venue)
  const open = venue?.operational !== false && isOpenAt(service, nowMinutes)
  const badges = badgesFor(service)

  return (
    <article className={CARD}>
      <Thumb venue={venue} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className={TITLE}>
            <button type="button" onClick={() => onSelect(service)} className={STRETCH}>
              {venue?.name ?? service.venue}
            </button>
          </h3>
          {starred && <span className="shrink-0 text-sm text-sand">★</span>}
        </div>

        <p className="truncate text-[12px] text-sand/60">
          {villageName(venue?.village ?? '')}
          {venue?.cuisine ? ` · ${venue.cuisine}` : ''}
        </p>

        <p className={`mt-0.5 text-sm tabular-nums ${open ? 'text-turquoise' : 'text-sand/60'}`}>
          {hoursText(service)}
        </p>

        {venue && <Closed venue={venue} />}
        {note && <p className="mt-1 text-sm leading-snug text-sand">{note}</p>}

        {badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <Badge key={b}>{b}</Badge>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

export function Explore({
  nowMinutes,
  favorites,
  notes,
  onSelectVenue,
  onSelectService,
}: {
  nowMinutes: number
  favorites: string[]
  notes: Record<string, string>
  onSelectVenue: (venue: Venue) => void
  onSelectService: (service: Service) => void
}) {
  const [groupBy, setGroupBy] = useState<GroupBy>('village')
  const [starredOnly, setStarredOnly] = useState(false)

  const villageGroups = useMemo(
    () => (groupBy === 'village' ? venuesByVillage({ starredOnly, favorites }) : []),
    [groupBy, starredOnly, favorites],
  )
  const mealGroups = useMemo(
    () => (groupBy === 'meal' ? servicesByMeal({ starredOnly, favorites }) : []),
    [groupBy, starredOnly, favorites],
  )

  const empty = groupBy === 'village' ? villageGroups.length === 0 : mealGroups.length === 0

  return (
    <div className="pb-10">
      <div className="flex items-center gap-2 px-4 pt-3 pb-4">
        <div
          className="flex rounded-full border border-foam/15 p-0.5"
          role="group"
          aria-label="Group by"
        >
          {(['village', 'meal'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={groupBy === option}
              onClick={() => setGroupBy(option)}
              className={`rounded-full px-3 py-1.5 text-sm capitalize focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise ${
                groupBy === option ? 'bg-foam/15 font-semibold text-foam' : 'text-sand'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-pressed={starredOnly}
          onClick={() => setStarredOnly((v) => !v)}
          className={`ml-auto rounded-full border px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise ${
            starredOnly
              ? 'border-turquoise bg-turquoise font-semibold text-ocean'
              : 'border-foam/15 text-sand'
          }`}
        >
          ★ Starred
        </button>
      </div>

      {empty ? (
        <p className="px-4 text-[15px] leading-snug text-sand">
          Nothing starred yet. Open a place and tap its star to keep it here.
        </p>
      ) : (
        <div className="space-y-6 px-4">
          {groupBy === 'village'
            ? villageGroups.map((group) => (
                <section key={group.key}>
                  <h2 className="condensed pb-2 font-display text-sm font-semibold tracking-widest text-sand/70 uppercase">
                    {group.label}
                    <span className="ml-2 tabular-nums text-sand/40">{group.venues.length}</span>
                  </h2>
                  <div className="flex flex-col gap-2">
                    {group.venues.map((venue) => (
                      <VenueRow
                        key={venue.slug}
                        venue={venue}
                        starred={servicesFor(venue.slug).some((s) => favorites.includes(s.id))}
                        onSelect={onSelectVenue}
                      />
                    ))}
                  </div>
                </section>
              ))
            : mealGroups.map((group) => (
                <section key={group.key}>
                  <h2 className="condensed pb-2 font-display text-sm font-semibold tracking-widest text-sand/70 uppercase">
                    {group.label}
                    <span className="ml-2 tabular-nums text-sand/40">{group.services.length}</span>
                  </h2>
                  <div className="flex flex-col gap-2">
                    {group.services.map((service) => (
                      <ServiceRow
                        key={service.id}
                        service={service}
                        nowMinutes={nowMinutes}
                        starred={favorites.includes(service.id)}
                        note={notes[service.id]}
                        onSelect={onSelectService}
                      />
                    ))}
                  </div>
                </section>
              ))}
        </div>
      )}
    </div>
  )
}
