import { menuUrlBase } from '../data'
import type { Service } from '../types'

/**
 * Resolve an asset path from the JSON. Mirrored assets are stored as relative
 * paths (`assets/menus/kimonos-dinner.pdf`) and need the base prefix; anything
 * still pointing at the CDN is returned untouched so the app works before
 * `npm run mirror` has been run. BASE_URL always ends in '/'.
 */
export function assetUrl(path: string): string
export function assetUrl(path: string | null | undefined): string | null
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return import.meta.env.BASE_URL + path
}

/**
 * The 128px card thumbnail beside a mirrored hero. The heroes are 1920px
 * marketing shots; three of them on the home screen is ~1.8MB of first paint
 * for three 64px squares. An un-mirrored hero has no thumbnail, so it falls
 * back to the remote URL and the card still renders.
 */
export function thumbUrl(heroSource: string | null | undefined): string | null {
  if (!heroSource) return null
  if (!heroSource.startsWith('assets/venues/')) return assetUrl(heroSource)
  const slug = heroSource.slice('assets/venues/'.length).replace(/\.[^.]+$/, '')
  return assetUrl(`assets/thumbs/${slug}.jpg`)
}

/**
 * `menuPath` is either a mirrored local path or still a CDN path that has to be
 * appended to `menuUrlBase` — and those filenames carry apostrophes, commas and
 * parentheses, so the remote form gets encoded.
 */
export function menuUrl(service: Pick<Service, 'menuPath'>): string | null {
  const path = service.menuPath
  if (!path) return null
  if (path.startsWith('http')) return path
  if (path.startsWith('assets/')) return import.meta.env.BASE_URL + path
  return encodeURI(menuUrlBase + path)
}
