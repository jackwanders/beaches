import { useMemo, useRef, useState } from 'react'
import { candidates, type MoodId } from '../lib/candidates'
import { cravingChipsAt, filterSummary, moodChipsAt } from '../lib/chips'
import { clockState, minutesOfDay } from '../lib/clock'
import { headline } from '../lib/display'
import { useFavorites } from '../lib/favorites'
import { dismissInstallPrompt, readInstallContext, shouldPromptInstall } from '../lib/ios'
import { useNow, youngestOverride } from '../lib/now'
import type { Service } from '../types'
import { Chips } from './Chips'
import { DetailSheet } from './DetailSheet'
import { Header } from './Header'
import { Recommendations } from './Recommendations'
import { Search } from './Search'
import { Settings } from './Settings'
import { TimeRail } from './TimeRail'

/** Toggle membership without caring about order. */
function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function Home() {
  const { now, simulated } = useNow()
  const nowMinutes = minutesOfDay(now)
  const state = clockState(now)

  const [cravings, setCravings] = useState<string[]>([])
  const [moods, setMoods] = useState<MoodId[]>([])
  const [selected, setSelected] = useState<Service | null>(null)
  const [searching, setSearching] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { backup, toggleStar, setNote, importBackup } = useFavorites()
  const [installDismissed, setInstallDismissed] = useState(false)

  // Chips are scoped to the meal, so both rows change as the day turns over.
  // Gap is clock-dependent (open-now across every meal), hence nowMinutes.
  const youngest = youngestOverride(window.location.search)
  const chipKey = state === 'gap' ? `gap:${nowMinutes}` : state
  const cravingOptions = useMemo(() => cravingChipsAt(now, youngest), [chipKey])
  const moodOptions = useMemo(() => moodChipsAt(now, youngest), [chipKey])

  // A craving selected at lunch may not exist at dinner. Drop the selection
  // when the meal turns over rather than filtering on a keyword the user can
  // no longer see or unset. Moods survive — they are meal-agnostic predicates.
  const lastState = useRef(state)
  if (lastState.current !== state) {
    lastState.current = state
    if (cravings.length) setCravings([])
  }

  // Recomputed on the minute and whenever a chip changes — not on every 15s
  // tick, so the list identity is stable enough for the reroll page to survive.
  const list = useMemo(
    () =>
      candidates(now, { cravings, moods, youngestInParty: youngest }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nowMinutes, cravings, moods],
  )

  const lead = headline(state, list)
  const hasFilters = cravings.length + moods.length > 0
  const clear = () => {
    setCravings([])
    setMoods([])
  }

  // Cravings are OR'd and moods are AND'd, so a narrow pair can legitimately
  // match nothing at any hour — "sushi" plus "quick and easy" has no answer on
  // the property. candidates() is right to return empty; the screen has to say
  // so and name the way out.
  const deadEnd = list.length === 0

  // Only asks once the user has something to lose, and never again once
  // dismissed or once the app is running from the home screen.
  const showInstallPrompt =
    !installDismissed && shouldPromptInstall(readInstallContext(backup.favorites.length > 0))

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-ocean text-foam">
      <Header
        now={now}
        state={state}
        simulated={simulated}
        onSearch={() => setSearching(true)}
        onSettings={() => setSettingsOpen(true)}
      />
      <TimeRail now={now} />

      <Chips
        cravingOptions={cravingOptions}
        moodOptions={moodOptions}
        cravings={cravings}
        moods={moods}
        onCraving={(k) => setCravings((c) => toggle(c, k))}
        onMood={(m) => setMoods((c) => toggle(c, m))}
        onClear={clear}
      />

      {lead && !deadEnd && <p className="px-4 pt-4 text-[15px] leading-snug text-sand">{lead}</p>}

      {deadEnd ? (
        <div className="px-4 pt-6">
          <p className="text-[15px] leading-snug text-sand">
            Nothing on the property matches {filterSummary(cravings, moods)} — not now, not later
            today.
          </p>
          <button
            type="button"
            onClick={clear}
            className="mt-4 w-full rounded-xl border border-turquoise/50 py-3 text-sm font-semibold text-turquoise focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise active:bg-turquoise/10"
          >
            Start over
          </button>
        </div>
      ) : (
        <div className="pt-4">
          {/* Keyed on the state and the filters so rerolling resets when either
              turns over — but never on a clock tick, which would silently throw
              away the user's position once a minute. */}
          <Recommendations
            key={`${state}|${[...cravings].sort().join(',')}|${[...moods].sort().join(',')}`}
            list={list}
            nowMinutes={nowMinutes}
            showAlsoOpen={state === 'gap' && !hasFilters}
            onSelect={setSelected}
          />
        </div>
      )}

      {showInstallPrompt && (
        <div className="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-sand/30 p-3">
          <p className="flex-1 text-[13px] leading-snug text-sand">
            Add to Home Screen to keep your stars — Safari clears them after a week away.
          </p>
          <button
            type="button"
            onClick={() => {
              dismissInstallPrompt()
              setInstallDismissed(true)
            }}
            aria-label="Dismiss"
            className="-mt-1 -mr-1 shrink-0 px-2 py-1 text-sand/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise"
          >
            ✕
          </button>
        </div>
      )}

      <Search
        open={searching}
        now={now}
        onClose={() => setSearching(false)}
        onSelect={setSelected}
      />

      <Settings
        open={settingsOpen}
        backup={backup}
        onImport={importBackup}
        onClose={() => setSettingsOpen(false)}
      />

      <DetailSheet
        service={selected}
        nowMinutes={nowMinutes}
        favorites={backup.favorites}
        notes={backup.notes}
        onToggleStar={toggleStar}
        onNote={setNote}
        onClose={() => setSelected(null)}
      />
    </main>
  )
}
