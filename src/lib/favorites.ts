import { useCallback, useEffect, useState } from 'react'
import { services } from '../data'
import { read, write } from './storage'

const FAVORITES = 'favorites'
const NOTES = 'notes'

/** Both keys, in the shape the export button emits and the import accepts. */
export type Backup = {
  favorites: string[]
  notes: Record<string, string>
}

export function loadBackup(): Backup {
  return {
    favorites: read<string[]>(FAVORITES, []),
    notes: read<Record<string, string>>(NOTES, {}),
  }
}

export function saveBackup(backup: Backup): void {
  write(FAVORITES, backup.favorites)
  write(NOTES, backup.notes)
}

const serviceIds = new Set(services.map((s) => s.id))

/**
 * Parse an exported backup, keeping only entries that name a real service.
 * The input is pasted by hand, so it may be truncated, from an older schema,
 * or not a backup at all. Anything unrecognisable throws with a plain message
 * rather than silently writing junk into storage.
 */
export function parseBackup(raw: string): Backup {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error("That doesn't look like exported data.")
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error("That doesn't look like exported data.")
  }

  const { favorites, notes } = parsed as Partial<Backup>
  const cleanFavorites = Array.isArray(favorites)
    ? favorites.filter((id): id is string => typeof id === 'string' && serviceIds.has(id))
    : []
  const cleanNotes: Record<string, string> = {}
  if (notes && typeof notes === 'object') {
    for (const [id, note] of Object.entries(notes)) {
      if (serviceIds.has(id) && typeof note === 'string' && note.trim()) cleanNotes[id] = note
    }
  }

  if (cleanFavorites.length === 0 && Object.keys(cleanNotes).length === 0) {
    throw new Error('No stars or notes found in there.')
  }
  return { favorites: cleanFavorites, notes: cleanNotes }
}

/**
 * Merge rather than replace. Import exists to recover from eviction or to move
 * to a new phone, and in both cases silently discarding whatever is already on
 * the device is the one outcome nobody wants. On a note collision the imported
 * copy wins, since it is the one the user just deliberately pasted.
 */
export function mergeBackup(current: Backup, incoming: Backup): Backup {
  return {
    favorites: [...new Set([...current.favorites, ...incoming.favorites])],
    notes: { ...current.notes, ...incoming.notes },
  }
}

export function useFavorites() {
  const [backup, setBackup] = useState<Backup>(loadBackup)

  useEffect(() => {
    saveBackup(backup)
  }, [backup])

  const toggleStar = useCallback((id: string) => {
    setBackup((b) => ({
      ...b,
      favorites: b.favorites.includes(id)
        ? b.favorites.filter((f) => f !== id)
        : [...b.favorites, id],
    }))
  }, [])

  const setNote = useCallback((id: string, note: string) => {
    setBackup((b) => {
      const notes = { ...b.notes }
      // An empty note is an absent note, not an empty string in storage.
      if (note.trim()) notes[id] = note
      else delete notes[id]
      return { ...b, notes }
    })
  }, [])

  const importBackup = useCallback((raw: string) => {
    const incoming = parseBackup(raw)
    setBackup((b) => mergeBackup(b, incoming))
    return incoming
  }, [])

  return { backup, toggleStar, setNote, importBackup }
}
