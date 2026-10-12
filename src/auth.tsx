import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { clearStoredToken, getStoredToken, setStoredToken } from './api'
import { getPreferences } from './lib/preferences'

export type PanelRole = 'admin' | 'instructor'

type AuthState = {
  token: string | null
  email: string | null
  role: PanelRole | null
}

type AuthContextValue = AuthState & {
  authed: boolean
  signIn: (token: string, email: string) => void
  signOut: () => void
  setEmail: (email: string | null) => void
}

export function isPanelRole(role: string | null | undefined): role is PanelRole {
  return role === 'admin' || role === 'instructor'
}

/** Catalog and the instructor directory are admin-only. */
export function isAdminOnlyPath(path: string): boolean {
  const pathname = path.split('?')[0]?.split('#')[0] ?? ''
  return (
    pathname === '/instructors' ||
    pathname.startsWith('/instructors/') ||
    pathname === '/academics' ||
    pathname.startsWith('/academics/') ||
    pathname === '/settings' ||
    pathname.startsWith('/settings/')
  )
}

export function landingPathForRole(role: string | null): string {
  const page = getPreferences().landingPage
  if (role !== 'admin' && isAdminOnlyPath(page)) return '/dashboard'
  return page
}

function readTokenClaims(token: string): { email: string | null; role: PanelRole | null } {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as {
      email?: string
      role?: string
    }
    return {
      email: payload.email ?? null,
      role: isPanelRole(payload.role) ? payload.role : null,
    }
  } catch {
    return { email: null, role: null }
  }
}

function sessionFromToken(token: string | null): AuthState {
  if (!token) return { token: null, email: null, role: null }
  const claims = readTokenClaims(token)
  return { token, email: claims.email, role: claims.role }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => sessionFromToken(getStoredToken()))

  const signIn = useCallback((token: string, email: string) => {
    setStoredToken(token)
    const session = sessionFromToken(token)
    setState({ ...session, email: email || session.email })
  }, [])

  const signOut = useCallback(() => {
    clearStoredToken()
    setState({ token: null, email: null, role: null })
  }, [])

  const setEmail = useCallback((email: string | null) => {
    setState((s) => ({ ...s, email }))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      authed: Boolean(state.token),
      signIn,
      signOut,
      setEmail,
    }),
    [state, signIn, signOut, setEmail],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

function ClearInvalidSession() {
  const { signOut } = useAuth()
  useEffect(() => {
    signOut()
  }, [signOut])
  return null
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { authed, role } = useAuth()
  const location = useLocation()
  if (!authed) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }
  if (!isPanelRole(role)) return <ClearInvalidSession />
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { role } = useAuth()
  if (role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { authed, role } = useAuth()
  if (!authed) return <>{children}</>
  if (!isPanelRole(role)) return <ClearInvalidSession />
  return <Navigate to={landingPathForRole(role)} replace />
}
