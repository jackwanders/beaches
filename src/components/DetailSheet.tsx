import { useEffect, useRef, useState } from 'react'
import { services, venueBySlug } from '../data'
import { assetUrl, menuUrl } from '../lib/assets'
import { isOpenAt } from '../lib/candidates'
import { MEAL_LABELS } from '../lib/display'
import { badgesFor, byMealOrder, hoursText, villageName } from '../lib/display'
import { isClosedByOverride, isOverridden, withOverride } from '../lib/overrides'
import type { Overrides, Service } from '../types'
import { Badge } from './Badge'
import { HoursEditor } from './HoursEditor'

function ServiceBlock({
  service,
  now,
  nowMinutes,
  highlight,
  starred,
  note,
  overrides,
  onToggleStar,
  onNote,
  onOverride,
  onResetOverride,
}: {
  service: Service
  now: Date
  nowMinutes: number
  highlight: boolean
  starred: boolean
  note: string
  overrides: Overrides
  onToggleStar: (id: string) => void
  onNote: (id: string, note: string) => void
  onOverride: (id: string, patch: Overrides[string]) => void
  onResetOverride: (id: string) => void
}) {
  // Everything below reads the corrected service, so the sheet shows what the
  // recommendations are actually using.
  const effective = withOverride(service, overrides)
  const edited = isOverridden(service.id, overrides)
  const notServing = isClosedByOverride(service.id, overrides)
  const badges = badgesFor(effective)
  // Serving *right now*: open, not overridden shut, and not closed on this day
  // of the week. This is what earns the emphasis — "what can I get here now"
  // is a more useful question than "which card did I tap".
  const closedToday = effective.closedDays?.includes(now.getDay()) ?? false
  const open = !notServing && !closedToday && isOpenAt(effective, nowMinutes)
  const menu = menuUrl(service)
  const [editingNote, setEditingNote] = useState(false)
  const [editingHours, setEditingHours] = useState(false)

  return (
    <section
      className={`rounded-xl border p-3 ${
        open
          ? 'border-turquoise bg-turquoise/10'
          : highlight
            ? 'border-foam/25'
            : 'border-foam/10'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="condensed font-display text-base font-semibold tracking-wide text-foam">
          {MEAL_LABELS[service.meal]}
          {/* Said in words as well as colour — the border alone would leave
              this invisible to anyone who cannot see the turquoise. */}
          {open && (
            <span className="ml-2 text-[11px] font-semibold tracking-wide text-turquoise">
              SERVING NOW
            </span>
          )}
        </h3>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-sm tabular-nums ${
              notServing ? 'text-signal line-through' : open ? 'text-turquoise' : 'text-sand/60'
            }`}
          >
            {hoursText(effective)}
          </span>
          {/* Starring is per service, not per venue: Neptunes at lunch and at
              dinner are different meals out. */}
          <button
            type="button"
            onClick={() => onToggleStar(service.id)}
            aria-pressed={starred}
            aria-label={`${starred ? 'Unstar' : 'Star'} ${MEAL_LABELS[service.meal].toLowerCase()}`}
            className={`-mr-1 self-center px-1 text-lg leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise ${
              starred ? 'text-sand' : 'text-sand/30'
            }`}
          >
            {starred ? '★' : '☆'}
          </button>
        </div>
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

      {edited && (
        <p className="mt-2 text-[12px] text-signal">
          {notServing ? 'Marked not serving' : 'Hours edited on this device'}
        </p>
      )}

      {editingHours ? (
        <HoursEditor
          service={service}
          override={overrides[service.id]}
          onChange={(patch) => onOverride(service.id, patch)}
          onReset={() => {
            onResetOverride(service.id)
            setEditingHours(false)
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingHours(true)}
          className="mt-2 block text-sm text-sand/60 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise"
        >
          Fix hours
        </button>
      )}

      {/* Notes are independent of stars. "Kids won't eat here" is a note worth
          keeping on a place you would never star, and gating one on the other
          would lose exactly that. Collapsed to a link until used, so three
          service blocks do not stack three empty inputs. */}
      {note || editingNote ? (
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={editingNote && !note}
          value={note}
          onChange={(e) => onNote(service.id, e.target.value)}
          onBlur={() => setEditingNote(false)}
          onKeyDown={(e) => {
            // The note is already written on every keystroke, so Enter only has
            // to get the keyboard out of the way. Without this there is no way
            // off the field on a phone except tapping some other part of the
            // sheet, which is hidden behind the keyboard.
            if (e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
          enterKeyHint="done"
          placeholder="Add a note…"
          aria-label={`Note for ${MEAL_LABELS[service.meal].toLowerCase()}`}
          className="mt-3 w-full rounded-lg border border-foam/15 bg-ocean px-2.5 py-2 text-sm text-foam placeholder:text-sand/40 focus:border-turquoise/60 focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingNote(true)}
          className="mt-3 block text-sm text-sand/60 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise"
        >
          Add a note
        </button>
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

/**
 * Opening by venue with no `focusServiceId` is a real state: Explore's village
 * list is venue-level, so there is no one service to highlight.
 */
export type SheetTarget = { venueSlug: string; focusServiceId?: string }

export function DetailSheet({
  target,
  now,
  nowMinutes,
  favorites,
  notes,
  overrides,
  onToggleStar,
  onNote,
  onOverride,
  onResetOverride,
  onClose,
}: {
  target: SheetTarget | null
  now: Date
  nowMinutes: number
  favorites: string[]
  notes: Record<string, string>
  overrides: Overrides
  onToggleStar: (id: string) => void
  onNote: (id: string, note: string) => void
  onOverride: (id: string, patch: Overrides[string]) => void
  onResetOverride: (id: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  // Drag-to-dismiss. Tracked in a ref rather than state so a finger moving
  // down the screen does not re-render the sheet on every frame.
  const drag = useRef({ startY: 0, active: false })

  // showModal() rather than the open attribute: it brings the focus trap,
  // Escape-to-close and ::backdrop with it, which is a lot of correctness for
  // a repo that is not adding a modal library.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (target && !dialog.open) {
      // A previous drag may have left a transform on the element.
      dialog.style.transition = 'none'
      dialog.style.transform = ''
      dialog.showModal()
    }
    if (!target && dialog.open) dialog.close()
  }, [target])

  // showModal blocks interaction behind the sheet but iOS will still scroll
  // the page under it.
  useEffect(() => {
    if (!target) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [target])

  // Far enough that it cannot be mistaken for a tap, close enough that it does
  // not need a whole swipe of the screen.
  const DISMISS_AFTER_PX = 96

  const settle = (dismiss: boolean) => {
    const dialog = ref.current
    if (!dialog) return
    dialog.style.transition = 'transform 200ms ease-out'
    dialog.style.transform = ''
    if (dismiss) onClose()
  }

  const onPointerDown = (e: React.PointerEvent) => {
    // The close button and anything else interactive keeps its own behaviour.
    if ((e.target as HTMLElement).closest('button, a, input')) return
    drag.current = { startY: e.clientY, active: true }
    // Capture keeps the drag alive if the finger leaves the header. It can
    // throw when there is no active pointer, and a failed capture is not worth
    // losing the gesture over — the move handler works either way.
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // no-op
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active || !ref.current) return
    // Downward only — dragging up should not lift the sheet off the bottom.
    const dy = Math.max(0, e.clientY - drag.current.startY)
    ref.current.style.transition = 'none'
    ref.current.style.transform = `translateY(${dy}px)`
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current.active) return
    drag.current.active = false
    settle(e.clientY - drag.current.startY > DISMISS_AFTER_PX)
  }

  const venue = target ? venueBySlug.get(target.venueSlug) : undefined
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
      // `open:flex` rather than `flex`: an author-level `display: flex` would
      // beat the UA's `dialog:not([open]) { display: none }` and leave the
      // sheet visible while closed. The variant only applies when open.
      //
      // overflow-hidden so the hero is clipped by the sheet's top corners; the
      // scrolling happens on the body below.
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-ocean p-0 text-foam backdrop:bg-black/70 open:flex sm:mx-auto"
    >
      {venue && (
        <>
          <div
            className="relative shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Grab handle. Without something to aim at, the gesture is
                undiscoverable — and the heroes are bright sky and pale sand,
                so it needs a scrim of its own to stay visible. */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-ocean/70 to-transparent"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 top-2.5 z-10 mx-auto h-1 w-10 rounded-full bg-foam/80"
            />
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

          {/* The only scrolling region: the header above stays put. */}
          <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pt-3 pb-8">
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
                now={now}
                nowMinutes={nowMinutes}
                highlight={s.id === target?.focusServiceId}
                starred={favorites.includes(s.id)}
                note={notes[s.id] ?? ''}
                overrides={overrides}
                onToggleStar={onToggleStar}
                onNote={onNote}
                onOverride={onOverride}
                onResetOverride={onResetOverride}
              />
            ))}
          </div>
        </>
      )}
    </dialog>
  )
}
