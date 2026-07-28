import { useState } from 'react'
import { clockState, minutesOfDay } from './lib/clock'
import { useFavorites } from './lib/favorites'
import { useInstallPrompt } from './lib/install'
import { useNow } from './lib/now'
import { useOverrides } from './lib/overrides'
import { defaultMode, type Mode } from './lib/trip'
import type { Service, Venue } from './types'
import { DetailSheet, type SheetTarget } from './components/DetailSheet'
import { Explore } from './components/Explore'
import { Header } from './components/Header'
import { Home } from './components/Home'
import { Search } from './components/Search'
import { Settings } from './components/Settings'

/**
 * Owns everything both modes share: the clock, stars and notes, and the three
 * dialogs. `Home` is the Now mode's content; `Explore` is the catalogue.
 */
export default function App() {
  const { now, simulated } = useNow()
  const nowMinutes = minutesOfDay(now)

  // Opens on whichever mode the trip dates imply; one tap overrides it.
  const [mode, setMode] = useState<Mode>(() => defaultMode(new Date()))
  const [sheet, setSheet] = useState<SheetTarget | null>(null)
  const [searching, setSearching] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { backup, toggleStar, setNote, importBackup } = useFavorites()
  const installPrompt = useInstallPrompt()
  const { overrides, setOverride, clearOverride, clearAll } = useOverrides()

  // A service row focuses the service it names; a venue row opens the sheet
  // with nothing highlighted, because there is no one meal it refers to.
  const openService = (service: Service) =>
    setSheet({ venueSlug: service.venue, focusServiceId: service.id })
  const openVenue = (venue: Venue) => setSheet({ venueSlug: venue.slug })


  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-ocean text-foam">
      <Header
        now={now}
        state={clockState(now)}
        mode={mode}
        simulated={simulated}
        onMode={setMode}
        onSearch={() => setSearching(true)}
        onSettings={() => setSettingsOpen(true)}
      />

      {installPrompt.show && (
        <div className="mx-4 mt-3 flex items-start gap-3 rounded-xl border border-turquoise/40 bg-turquoise/5 p-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foam">Install this app</p>
            <p className="mt-0.5 text-[13px] leading-snug text-sand/80">
              Opens full screen, and the menus keep working without a signal.
            </p>
            <button
              type="button"
              onClick={installPrompt.install}
              className="mt-2 rounded-lg bg-turquoise px-3 py-1.5 text-sm font-semibold text-ocean focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise"
            >
              Install
            </button>
          </div>
          <button
            type="button"
            onClick={installPrompt.dismiss}
            aria-label="Dismiss"
            className="-mt-1 -mr-1 shrink-0 px-2 py-1 text-sand/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise"
          >
            ✕
          </button>
        </div>
      )}

      {mode === 'now' ? (
        <Home now={now} nowMinutes={nowMinutes} overrides={overrides} onSelect={openService} />
      ) : (
        <Explore
          favorites={backup.favorites}
          overrides={overrides}
          onSelectVenue={openVenue}
        />
      )}


      <Search
        open={searching}
        now={now}
        overrides={overrides}
        onClose={() => setSearching(false)}
        onSelect={openService}
      />

      <Settings
        open={settingsOpen}
        backup={backup}
        overrides={overrides}
        onImport={importBackup}
        onClearOverrides={clearAll}
        onClose={() => setSettingsOpen(false)}
      />

      <DetailSheet
        target={sheet}
        now={now}
        nowMinutes={nowMinutes}
        favorites={backup.favorites}
        notes={backup.notes}
        overrides={overrides}
        onToggleStar={toggleStar}
        onNote={setNote}
        onOverride={setOverride}
        onResetOverride={clearOverride}
        onClose={() => setSheet(null)}
      />
    </main>
  )
}
