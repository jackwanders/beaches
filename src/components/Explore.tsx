import { useMemo, useState } from 'react'
import { thumbUrl } from '../lib/assets'
import { MEAL_LABELS, hoursText, villageName } from '../lib/display'
import {
  exploreVenues,
  mealOptions,
  mealsFor,
  serviceAt,
  servicesFor,
  villageOptions,
} from '../lib/explore'
import { withOverride } from '../lib/overrides'
import type { Meal, Overrides, Venue } from '../types'
import { PickerSheet } from './PickerSheet'

/**
 * A dropdown-style pill. The label opens the picker; the ✕ clears the filter
 * without opening anything. Two sibling buttons rather than one nested inside
 * the other, which is not valid HTML.
 */
function FilterPill({
  label,
  active,
  onOpen,
  onClear,
  clearLabel,
}: {
  label: string
  active: boolean
  onOpen: () => void
  onClear: () => void
  clearLabel: string
}) {
  return (
    <div
      className={`flex shrink-0 items-center rounded-full border ${
        active ? 'border-turquoise bg-turquoise/10' : 'border-foam/15'
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className={`flex items-center gap-1.5 rounded-full py-1.5 pl-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise ${
          active ? 'pr-1 font-semibold text-foam' : 'pr-3 text-sand'
        }`}
      >
        <span className="max-w-40 truncate">{label}</span>
        {!active && (
          <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden>
            <path
              d="M2.5 4.5 6 8l3.5-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
      {active && (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          className="grid size-7 shrink-0 place-items-center rounded-full text-foam/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise active:bg-foam/10"
        >
          <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
            <path
              d="M3 3l6 6M9 3l-6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

function VenueRow({
  venue,
  meal,
  overrides,
  starred,
  onSelect,
}: {
  venue: Venue
  meal: Meal | null
  overrides: Overrides
  starred: boolean
  onSelect: (venue: Venue) => void
}) {
  const thumb = thumbUrl(venue.heroSource)
  // With a meal picked, that meal's hours are the useful fact. Without one,
  // which meals it serves at all.
  const service = meal ? serviceAt(venue.slug, meal) : undefined
  const meals = mealsFor(venue.slug)

  return (
    <article className="relative flex gap-3 rounded-2xl border border-foam/10 bg-surface p-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-turquoise has-active:bg-foam/5">
      {thumb && (
        <img
          src={thumb}
          alt=""
          loading="lazy"
          decoding="async"
          className={`size-12 shrink-0 rounded-lg object-cover ${
            venue.operational === false ? 'opacity-40 grayscale' : ''
          }`}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="condensed truncate font-display text-lg font-semibold tracking-tight text-foam">
            <button
              type="button"
              onClick={() => onSelect(venue)}
              className="text-left after:absolute after:inset-0 after:content-[''] focus:outline-none"
            >
              {venue.name}
            </button>
          </h3>
          {starred && <span className="shrink-0 text-sm text-sand">★</span>}
        </div>

        <p className="truncate text-[12px] text-sand/60">{venue.cuisine}</p>

        <p className="mt-0.5 text-sm text-sand/80">
          {service ? (
            <span className="tabular-nums">{hoursText(withOverride(service, overrides))}</span>
          ) : meals.length > 0 ? (
            meals.map((m) => MEAL_LABELS[m].toLowerCase()).join(' · ')
          ) : (
            'no published service'
          )}
        </p>

        {venue.operational === false && (
          <p className="mt-1 text-[13px] leading-snug text-signal">
            {venue.notice ?? 'Closed for refurbishment.'}
          </p>
        )}
      </div>
    </article>
  )
}

export function Explore({
  favorites,
  overrides,
  onSelectVenue,
}: {
  favorites: string[]
  overrides: Overrides
  onSelectVenue: (venue: Venue) => void
}) {
  const [village, setVillage] = useState<string | null>(null)
  const [meal, setMeal] = useState<Meal | null>(null)
  const [starredOnly, setStarredOnly] = useState(false)
  const [picker, setPicker] = useState<'village' | 'meal' | null>(null)

  const filters = { village, meal, starredOnly, favorites }
  // Each picker's counts leave its own filter out, so choosing a village never
  // makes that village read zero.
  const groups = useMemo(
    () => exploreVenues(filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [village, meal, starredOnly, favorites],
  )
  const villageChoices = useMemo(
    () => villageOptions(filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meal, starredOnly, favorites],
  )
  const mealChoices = useMemo(
    () => mealOptions(filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [village, starredOnly, favorites],
  )

  const total = groups.reduce((n, g) => n + g.venues.length, 0)

  return (
    <div className="pb-10">
      <div className="flex items-center gap-2 overflow-x-auto px-4 pt-3 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterPill
          label={village ? villageName(village) : 'All villages'}
          active={village !== null}
          onOpen={() => setPicker('village')}
          onClear={() => setVillage(null)}
          clearLabel="Show all villages"
        />
        <FilterPill
          label={meal ? MEAL_LABELS[meal] : 'All meals'}
          active={meal !== null}
          onOpen={() => setPicker('meal')}
          onClear={() => setMeal(null)}
          clearLabel="Show all meals"
        />
        <button
          type="button"
          aria-pressed={starredOnly}
          onClick={() => setStarredOnly((v) => !v)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise ${
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
          {starredOnly
            ? 'Nothing starred matches. Open a place and tap its star to keep it here.'
            : 'Nothing matches both of those. Clear one of them.'}
        </p>
      ) : (
        <div className="space-y-6 px-4">
          {groups.map((group) => (
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
                    meal={meal}
                    overrides={overrides}
                    starred={servicesFor(venue.slug).some((s) => favorites.includes(s.id))}
                    onSelect={onSelectVenue}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <PickerSheet
        open={picker === 'village'}
        title="Village"
        options={villageChoices}
        selected={village}
        onPick={setVillage}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        open={picker === 'meal'}
        title="Meal"
        options={mealChoices}
        selected={meal}
        onPick={(id) => setMeal(id as Meal | null)}
        onClose={() => setPicker(null)}
      />
    </div>
  )
}
