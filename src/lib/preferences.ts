import { useCallback, useSyncExternalStore } from 'react'

/**
 * Per-device admin preferences. These live in localStorage only; nothing here
 * is sent to the API.
 */
export type LandingPage = '/dashboard' | '/papers' | '/academics'

export type Preferences = {
  landingPage: LandingPage
  compactSidebar: boolean
  notifyPendingDigest: boolean
  notifyAiFailures: boolean
  notifyCoursePublish: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
  landingPage: '/dashboard',
  compactSidebar: false,
  notifyPendingDigest: true,
  notifyAiFailures: true,
  notifyCoursePublish: false,
}

export const LANDING_PAGES: { value: LandingPage; label: string }[] = [
  { value: '/dashboard', label: 'Dashboard' },
  { value: '/papers', label: 'Papers' },
  { value: '/academics', label: 'Academics' },
]

const STORAGE_KEY = 'questnu_admin_preferences'
const EVENT = 'questnu:preferences'

let cached: Preferences | null = null

function read(): Preferences {
  if (cached) return cached
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cached = raw
      ? { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) }
      : DEFAULT_PREFERENCES
  } catch {
    cached = DEFAULT_PREFERENCES
  }
  return cached
}

export function getPreferences(): Preferences {
  return read()
}

export function setPreferences(patch: Partial<Preferences>): void {
  cached = { ...read(), ...patch }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
  window.dispatchEvent(new Event(EVENT))
}

export function resetPreferences(): void {
  cached = DEFAULT_PREFERENCES
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cached = null
      onChange()
    }
  }
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function usePreferences(): [Preferences, (patch: Partial<Preferences>) => void] {
  const prefs = useSyncExternalStore(subscribe, read, () => DEFAULT_PREFERENCES)
  const update = useCallback((patch: Partial<Preferences>) => setPreferences(patch), [])
  return [prefs, update]
}
