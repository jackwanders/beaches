// The origin is shared with every other project on jackwanders.github.io.
// Never write an un-namespaced key.
const PREFIX = 'btc:v1:'

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Private mode or a full quota. Nothing here is worth failing a render over.
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // ignore
  }
}
