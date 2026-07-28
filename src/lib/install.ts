import { useCallback, useEffect, useState } from 'react'
import { read, write } from './storage'

const DISMISSED = 'installPromptDismissed'

/**
 * Chrome's `beforeinstallprompt`, which is not in lib.dom. Fired once the site
 * meets the installability criteria — manifest, icons, HTTPS, and a service
 * worker with a fetch handler.
 */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Shown on the first visit, not gated behind having something to lose. This
 * replaced an iOS-only banner that waited for a first star: installing is what
 * makes the 32MB precache stick and opens the app without browser chrome, and
 * both of those matter most *before* the trip, when there is nothing saved yet.
 */
export function shouldShowInstall(ctx: {
  canInstall: boolean
  dismissed: boolean
  installed: boolean
}): boolean {
  return ctx.canInstall && !ctx.dismissed && !ctx.installed
}

function alreadyInstalled(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

export function useInstallPrompt() {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => read<boolean>(DISMISSED, false))
  const [installed, setInstalled] = useState(alreadyInstalled)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // Holding the event is what lets us ask from our own button. Chrome no
      // longer shows a banner of its own, so without this there is no prompt
      // at all — only a menu item most people never open.
      e.preventDefault()
      setEvent(e as InstallPromptEvent)
    }
    const onInstalled = () => {
      setEvent(null)
      setInstalled(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!event) return
    await event.prompt()
    await event.userChoice
    // Single-use either way. Declining is not a permanent no — Chrome fires
    // the event again on a later visit, so the banner can come back.
    setEvent(null)
  }, [event])

  const dismiss = useCallback(() => {
    write(DISMISSED, true)
    setDismissed(true)
  }, [])

  return {
    show: shouldShowInstall({ canInstall: event !== null, dismissed, installed }),
    install,
    dismiss,
  }
}
