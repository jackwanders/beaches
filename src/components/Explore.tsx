import { useMemo, useState } from 'react'
import { venueBySlug } from '../data'
import { thumbUrl } from '../lib/assets'
import { isOpenAt } from '../lib/candidates'
import { MEAL_LABELS, badgesFor, hoursText, villageName } from '../lib/display'
import { exploreGroups, type GroupBy } from '../lib/explore'
import type { Service } from '../types'
import { Badge } from './Badge'

function Row({
  service,
  groupBy,
  nowMinutes,
  starred,
  note,
  onSelect,
}: {
  service: Service
  groupBy: GroupBy
  nowMinutes: number
  starred: boolean
  note?: string
  onSelect: (service: Service) => void
}) {
  const venue = venueBySlug.get(service.venue)
  const thumb = thumbUrl(venue?.heroSource)
  const open = venue?.operational !== false && isOpenAt(service, nowMinutes)
  const badges = badgesFor(service)

  return (
    <article className="relative flex gap-3 rounded-2xl border border-foam/10 bg-surface p-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-turquoise has-active:bg-foam/5">
      {thumb && (
        <img
          src={thumb}
          alt=""
          loading="lazy"
          decoding="async"
          className={`size-12 shrink-0 rounded-lg object-cover ${
            venue?.operational === false ? 'opacity-40 grayscale' : ''
          }`}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="condensed truncate font-display text-lg font-semibold tracking-tight text-foam">
            <button
              type="button"
              onClick={() => onSelect(service)}
              className="text-left after:absolute after:inset-0 after:content-[''] focus:outline-none"
            >
              {venue?.name ?? service.venue}
            </button>
          </h3>
          {starred && <span className="shrink-0 text-sm text-sand">★</span>}
        </div>

        {/* Whichever axis you did not group by is the one worth naming. */}
        <p className="truncate text-[12px] text-sand/60">
          {groupBy === 'village'
            ? MEAL_LABELS[service.meal]
            : villageName(venue?.village ?? '')}
          {venue?.cuisine ? ` · ${venue.cuisine}` : ''}
        </p>

        <p className={`mt-0.5 text-sm tabular-nums ${open ? 'text-turquoise' : 'text-sand/60'}`}>
          {hoursText(service)}
        </p>

        {venue?.operational === false && (
          <p className="mt-1 text-[13px] leading-snug text-signal">
            {venue.notice ?? 'Closed for refurbishment.'}
          </p>
        )}

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
  onSelect,
}: {
  nowMinutes: number
  favorites: string[]
  notes: Record<string, string>
  onSelect: (service: Service) => void
}) {
  const [groupBy, setGroupBy] = useState<GroupBy>('village')
  const [starredOnly, setStarredOnly] = useState(false)

  const groups = useMemo(
    () => exploreGroups(groupBy, { starredOnly, favorites }),
    [groupBy, starredOnly, favorites],
  )

  const total = groups.reduce((n, g) => n + g.services.length, 0)

  return (
    <div className="pb-10">
      <div className="flex items-center gap-2 px-4 pt-3 pb-4">
        <div className="flex rounded-full border border-foam/15 p-0.5" role="group" aria-label="Group by">
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

      {total === 0 ? (
        <p className="px-4 text-[15px] leading-snug text-sand">
          Nothing starred yet. Open a place and tap its star to keep it here.
        </p>
      ) : (
        <div className="space-y-6 px-4">
          {groups.map((group) => (
            <section key={group.key}>
              <h2 className="condensed pb-2 font-display text-sm font-semibold tracking-widest text-sand/70 uppercase">
                {group.label}
                <span className="ml-2 tabular-nums text-sand/40">{group.services.length}</span>
              </h2>
              <div className="flex flex-col gap-2">
                {group.services.map((service) => (
                  <Row
                    key={service.id}
                    service={service}
                    groupBy={groupBy}
                    nowMinutes={nowMinutes}
                    starred={favorites.includes(service.id)}
                    note={notes[service.id]}
                    onSelect={onSelect}
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
