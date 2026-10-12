const raw = import.meta.env.VITE_API_URL as string | undefined

export const API_BASE = raw?.replace(/\/$/, '') ?? 'http://localhost:3000/api'
