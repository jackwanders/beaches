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
