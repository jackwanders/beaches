import { venueBySlug } from '../data'
import { thumbUrl } from '../lib/assets'
import type { Candidate } from '../lib/candidates'
import { badgesFor, serviceStatus, villageName, type StatusTone } from '../lib/display'
import { Badge } from './Badge'

const TONE_TEXT: Record<StatusTone, string> = {
  open: 'text-turquoise',
  soon: 'text-signal',
  later: 'text-sand/80',
  unknown: 'text-sand/80',
}

export function VenueCard({
  candidate,
  nowMinutes,
  onSelect,
}: {
  candidate: Candidate
  nowMinutes: number
  onSelect: (service: Candidate['service']) => void
}) {
  const { service } = candidate
  const venue = venueBySlug.get(service.venue)
  const status = serviceStatus(candidate, nowMinutes)
  const thumb = thumbUrl(venue?.heroSource)
  const dish = service.signatureDishes[0]

  // A future answer must be distinguishable from a place you can walk to now,
  // at a glance and not only by reading the status line.
  const later = candidate.opensAt !== undefined

  return (
    <article
      className={`relative flex gap-3 rounded-2xl border p-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-turquoise has-active:bg-foam/5 ${
        later ? 'border-dashed border-foam/15 bg-surface/50' : 'border-foam/10 bg-surface'
      }`}
    >
      {thumb && (
        <img
          src={thumb}
          alt=""
          loading="lazy"
          decoding="async"
          className={`size-16 shrink-0 rounded-xl object-cover ${later ? 'opacity-60' : ''}`}
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          {/* The heading owns the control and its ::after stretches over the
              whole card, so the tap target is the card while the heading stays
              a heading — a <button> cannot legally contain one. */}
          <h2
            className={`condensed truncate font-display text-xl font-semibold tracking-tight ${
              later ? 'text-foam/80' : 'text-foam'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(service)}
              className="text-left after:absolute after:inset-0 after:content-[''] focus:outline-none"
            >
              {venue?.name ?? service.venue}
            </button>
          </h2>
          {/* Only 10 of 27 venues carry a rating — no placeholder, no reserved space. */}
          {venue?.rating != null && (
            <span className="shrink-0 text-sm tabular-nums text-sand/80">{venue.rating} ★</span>
          )}
        </div>

        <p className="truncate text-[13px] text-sand/70">
          {venue?.cuisine} · {villageName(venue?.village ?? '')}
        </p>

        <p className={`mt-1 text-sm tabular-nums ${TONE_TEXT[status.tone]}`}>{status.text}</p>

        {dish && <p className="mt-1 truncate text-sm text-sand">“{dish}”</p>}

        {(badgesFor(service).length > 0 || service.dataWarning) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {badgesFor(service).map((b) => (
              <Badge key={b}>{b}</Badge>
            ))}
            {service.dataWarning && (
              <Badge tone="signal" title={service.dataWarning}>
                check hours
              </Badge>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
