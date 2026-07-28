import { describe, expect, test } from 'vitest'
import { shouldPromptInstall, type InstallContext } from './ios'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPADOS =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Mobile Safari/537.36'
const DESKTOP_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36'

const ctx = (over: Partial<InstallContext> = {}): InstallContext => ({
  userAgent: IPHONE,
  maxTouchPoints: 5,
  standalone: false,
  dismissed: false,
  hasStars: true,
  ...over,
})

describe('shouldPromptInstall', () => {
  test('prompts on iPhone Safari once something is starred', () => {
    expect(shouldPromptInstall(ctx())).toBe(true)
  })

  test('prompts on iPadOS, which reports itself as a Mac', () => {
    expect(shouldPromptInstall(ctx({ userAgent: IPADOS, maxTouchPoints: 5 }))).toBe(true)
  })

  test('leaves a real desktop Mac alone', () => {
    // Same "Macintosh" string, but no touch: not an iPad.
    expect(shouldPromptInstall(ctx({ userAgent: DESKTOP_MAC, maxTouchPoints: 0 }))).toBe(false)
  })

  test('does not prompt on Android, where localStorage is not evicted this way', () => {
    expect(shouldPromptInstall(ctx({ userAgent: ANDROID }))).toBe(false)
  })

  test('stays quiet until there is something to lose', () => {
    expect(shouldPromptInstall(ctx({ hasStars: false }))).toBe(false)
  })

  test('never returns after being dismissed', () => {
    expect(shouldPromptInstall(ctx({ dismissed: true }))).toBe(false)
  })

  test('does not nag once already installed', () => {
    expect(shouldPromptInstall(ctx({ standalone: true }))).toBe(false)
  })
})
