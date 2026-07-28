import { read, write } from './storage'

const DISMISSED = 'installPromptDismissed'

export type InstallContext = {
  userAgent: string
  maxTouchPoints: number
  /** Already launched from the home screen. */
  standalone: boolean
  dismissed: boolean
  /** Anything worth losing — stars or notes. */
  hasSavedData: boolean
}

/**
 * Safari clears localStorage after seven days without a visit, and the usage
 * pattern here — star things in July, don't reopen until August — hits that
 * squarely. Installing to the home screen exempts the site.
 *
 * Only prompted once the user has something to lose — a star or a note. A
 * banner shown before either is asking for a commitment in exchange for
 * nothing.
 */
export function shouldPromptInstall(ctx: InstallContext): boolean {
  if (ctx.dismissed || ctx.standalone || !ctx.hasSavedData) return false
  const isIos =
    /iPad|iPhone|iPod/.test(ctx.userAgent) ||
    // iPadOS 13+ reports itself as Macintosh; touch points give it away.
    (/Macintosh/.test(ctx.userAgent) && ctx.maxTouchPoints > 1)
  return isIos
}

export function readInstallContext(hasSavedData: boolean): InstallContext {
  const nav = navigator as Navigator & { standalone?: boolean }
  return {
    userAgent: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    standalone:
      nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches,
    dismissed: read<boolean>(DISMISSED, false),
    hasSavedData,
  }
}

export function dismissInstallPrompt(): void {
  write(DISMISSED, true)
}
