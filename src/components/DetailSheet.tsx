import { useEffect, useRef } from 'react'
import { services, venueBySlug } from '../data'
import { assetUrl, menuUrl } from '../lib/assets'
import { isOpenAt } from '../lib/candidates'
import { MEAL_LABELS } from '../lib/display'
import { badgesFor, byMealOrder, hoursText, villageName } from '../lib/display'
import type { Service } from '../types'
import { Badge } from './Badge'

function ServiceBlock({
  service,
  nowMinutes,
  highlight,
}: {
  service: Service
  nowMinutes: number
  highlight: boolean
}) {
  const badges = badgesFor(service)
  const open = isOpenAt(service, nowMinutes)
  const menu = menuUrl(service)

  return (
    <section
      className={`rounded-xl border p-3 ${
        highlight ? 'border-turquoise/40 bg-turquoise/5' : 'border-foam/10'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="condensed font-display text-base font-semibold tracking-wide text-foam">
          {MEAL_LABELS[service.meal]}
        </h3>
        <span className={`text-sm tabular-nums ${open ? 'text-turquoise' : 'text-sand/60'}`}>
          {hoursText(service)}
        </span>
      </div>

      {badges.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <Badge key={b}>{b}</Badge>
          ))}
        </div>
      )}

      {service.signatureDishes.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {service.signatureDishes.map((dish) => (
            <li key={dish} className="text-sm text-sand">
              {dish}
            </li>
          ))}
        </ul>
      )}

      {service.dataWarning && (
        <p className="mt-2 text-[13px] leading-snug text-signal">{service.dataWarning}</p>
      )}

      {menu && (
        <a
          href={menu}
          target="_blank"
          rel="noopener"
          className="mt-3 inline-block text-sm font-semibold text-turquoise underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise"
        >
          Menu{service.menuVintage ? ` (${service.menuVintage})` : ''}
        </a>
      )}
    </section>
  )
}

export function DetailSheet({
  service,
  nowMinutes,
  onClose,
}: {
  service: Service | null
  nowMinutes: number
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  // showModal() rather than the open attribute: it brings the focus trap,
  // Escape-to-close and ::backdrop with it, which is a lot of correctness for
  // a repo that is not adding a modal library.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (service && !dialog.open) dialog.showModal()
    if (!service && dialog.open) dialog.close()
  }, [service])

  // showModal blocks interaction behind the sheet but iOS will still scroll
  // the page under it.
  useEffect(() => {
    if (!service) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [service])

  const venue = service ? venueBySlug.get(service.venue) : undefined
  const hero = assetUrl(venue?.heroSource)

  // Every service this venue runs, not just the one tapped — Sky is 12+ at
  // dinner and not at breakfast, and seeing both together is the whole reason
  // the data is keyed by meal.
  const all = venue ? services.filter((s) => s.venue === venue.slug).sort(byMealOrder) : []

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      // overflow-hidden so the hero is clipped by the sheet's top corners; the
      // scrolling happens on the child.
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[88dvh] w-full max-w-md overflow-hidden rounded-t-3xl bg-ocean p-0 text-foam backdrop:bg-black/70 sm:mx-auto"
    >
      {venue && service && (
        <div className="max-h-[88dvh] overflow-y-auto overscroll-contain">
          <div className="relative">
            {hero && <img src={hero} alt="" className="h-44 w-full object-cover" />}
            <div
              className={`${hero ? 'absolute inset-x-0 bottom-0 bg-gradient-to-t from-ocean to-transparent pt-12' : ''} px-4 pb-3`}
            >
              <h2 className="condensed font-display text-3xl font-semibold tracking-tight text-foam">
                {venue.name}
              </h2>
              <p className="text-[13px] text-sand/80">
                {venue.cuisine} · {villageName(venue.village)}
                {venue.rating != null && <span className="tabular-nums"> · {venue.rating} ★</span>}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-ocean/80 text-lg text-foam focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 px-4 pt-1 pb-8">
            {venue.tagline && (
              <p className="text-sm leading-snug text-sand/80">{venue.tagline}</p>
            )}

            {!venue.operational && (
              <p className="rounded-xl border border-signal/50 p-3 text-sm leading-snug text-signal">
                {venue.notice ?? 'Closed for refurbishment.'}
              </p>
            )}

            {all.map((s) => (
              <ServiceBlock
                key={s.id}
                service={s}
                nowMinutes={nowMinutes}
                highlight={s.id === service.id}
              />
            ))}
          </div>
        </div>
      )}
    </dialog>
  )
}
