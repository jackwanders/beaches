import { useEffect, useMemo, useRef, useState } from 'react'
import { venueBySlug } from '../data'
import { thumbUrl } from '../lib/assets'
import { minutesOfDay } from '../lib/clock'
import { MEAL_LABELS, serviceStatus, villageName, type StatusTone } from '../lib/display'
import { search, suggest, type SearchHit } from '../lib/search'
import type { Overrides, Service } from '../types'

const TONE_TEXT: Record<StatusTone, string> = {
  open: 'text-turquoise',
  soon: 'text-signal',
  later: 'text-sand/80',
  unknown: 'text-sand/80',
}

function Result({
  hit,
  nowMinutes,
  onSelect,
}: {
  hit: SearchHit
  nowMinutes: number
  onSelect: (service: Service) => void
}) {
  const venue = venueBySlug.get(hit.service.venue)
  const status = serviceStatus(hit, nowMinutes)
  const thumb = thumbUrl(venue?.heroSource)

  return (
    <article className="relative flex gap-3 rounded-2xl border border-foam/10 bg-surface p-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-turquoise has-active:bg-foam/5">
      {thumb && (
        <img
          src={thumb}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-12 shrink-0 rounded-lg object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="condensed truncate font-display text-lg font-semibold tracking-tight text-foam">
            <button
              type="button"
              onClick={() => onSelect(hit.service)}
              className="text-left after:absolute after:inset-0 after:content-[''] focus:outline-none"
            >
              {venue?.name ?? hit.service.venue}
            </button>
          </h3>
          {/* The same venue appears once per meal, so the meal has to be said. */}
          <span className="shrink-0 text-[11px] tracking-wide text-sand/60">
            {MEAL_LABELS[hit.service.meal]}
          </span>
        </div>
        <p className="truncate text-[12px] text-sand/60">{villageName(venue?.village ?? '')}</p>
        <p className={`mt-0.5 text-sm tabular-nums ${TONE_TEXT[status.tone]}`}>{status.text}</p>
        {hit.matchedDishes.map((dish) => (
          <p key={dish} className="mt-0.5 truncate text-sm text-sand">
            {dish}
          </p>
        ))}
      </div>
    </article>
  )
}

export function Search({
  open,
  now,
  overrides,
  onClose,
  onSelect,
}: {
  open: boolean
  now: Date
  overrides: Overrides
  onClose: () => void
  onSelect: (service: Service) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [term, setTerm] = useState<string | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      input.current?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Start clean each time rather than resuming a search from hours ago.
  useEffect(() => {
    if (!open) {
      setQuery('')
      setTerm(null)
    }
  }, [open])

  const nowMinutes = minutesOfDay(now)
  const suggestions = useMemo(() => suggest(query), [query])
  const hits = useMemo(
    () => (term ? search(term, now, { overrides }) : []),
    [term, nowMinutes, overrides],
  )

  const pick = (keyword: string) => {
    setTerm(keyword)
    setQuery(keyword)
    input.current?.blur()
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-md flex-col bg-ocean p-0 text-foam backdrop:bg-black/70 open:flex sm:mx-auto"
    >
      <div className="flex shrink-0 items-center gap-2 px-4 pt-5 pb-3">
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setTerm(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && suggestions.length > 0) {
              e.preventDefault()
              pick(suggestions[0])
            }
          }}
          type="search"
          enterKeyHint="search"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="pizza, jerk, coffee…"
          aria-label="Search dishes and ingredients"
          className="min-w-0 flex-1 rounded-xl border border-foam/15 bg-surface px-3 py-2.5 text-base text-foam placeholder:text-sand/40 focus:border-turquoise/60 focus:outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 px-1 text-sm text-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
        {term ? (
          hits.length > 0 ? (
            <>
              <p className="pb-3 text-[13px] text-sand/60">
                {hits.length} {hits.length === 1 ? 'place serves' : 'places serve'} {term}
              </p>
              <div className="flex flex-col gap-2">
                {hits.map((hit) => (
                  <Result
                    key={hit.service.id}
                    hit={hit}
                    nowMinutes={nowMinutes}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="pt-2 text-[15px] leading-snug text-sand">
              Nothing on the property serves {term}.
            </p>
          )
        ) : suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => pick(s)}
                className="rounded-full border border-foam/15 px-3.5 py-2 text-sm text-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise active:bg-foam/10"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <p className="pt-2 text-[15px] leading-snug text-sand">
            No dish or ingredient here matches “{query.trim()}”.
          </p>
        )}
      </div>
    </dialog>
  )
}
