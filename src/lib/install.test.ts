import { describe, expect, test } from 'vitest'
import { shouldShowInstall } from './install'

const ctx = (over: Partial<Parameters<typeof shouldShowInstall>[0]> = {}) => ({
  canInstall: true,
  dismissed: false,
  installed: false,
  ...over,
})

describe('shouldShowInstall', () => {
  test('shows on a first visit, with nothing saved', () => {
    // The previous version waited for a first star. Installing is what makes
    // the precache stick, which matters most before anything is saved.
    expect(shouldShowInstall(ctx())).toBe(true)
  })

  test('stays hidden until the browser says the app is installable', () => {
    // No beforeinstallprompt means no way to install from our own button.
    expect(shouldShowInstall(ctx({ canInstall: false }))).toBe(false)
  })

  test('never returns after being dismissed', () => {
    expect(shouldShowInstall(ctx({ dismissed: true }))).toBe(false)
  })

  test('does not nag once the app is already installed', () => {
    expect(shouldShowInstall(ctx({ installed: true }))).toBe(false)
  })

  test('installed beats installable', () => {
    expect(shouldShowInstall(ctx({ canInstall: true, installed: true }))).toBe(false)
  })
})
