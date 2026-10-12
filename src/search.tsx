import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

type SearchContextValue = {
  query: string
  setQuery: (q: string) => void
  reset: () => void
}

const SearchContext = createContext<SearchContextValue | null>(null)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('')
  const location = useLocation()

  useEffect(() => {
    setQuery('')
  }, [location.pathname])

  const value = useMemo<SearchContextValue>(
    () => ({ query, setQuery, reset: () => setQuery('') }),
    [query],
  )

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  )
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext)
  if (!ctx) {
    return {
      query: '',
      setQuery: () => undefined,
      reset: () => undefined,
    }
  }
  return ctx
}
