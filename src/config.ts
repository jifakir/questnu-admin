const raw = import.meta.env.VITE_API_URL as string | undefined

export const API_BASE = raw?.replace(/\/$/, '') ?? 'http://localhost:3000/api'

const rawSite = import.meta.env.VITE_SITE_URL as string | undefined

/** Public website origin (used for "View on site" links). */
export const SITE_URL = rawSite?.replace(/\/$/, '') || 'https://questnu.bd'
