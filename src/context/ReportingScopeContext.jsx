import React, { createContext, useContext, useMemo, useState, useCallback } from 'react'

const ReportingScopeContext = createContext(null)
const STORAGE_KEY = 'sr.reporting.filters'

function loadFilters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function ReportingScopeProvider({ children }) {
  const [filters, setFiltersState] = useState(() => ({
    country: 'ALL',
    salesRepId: 'ALL',
    viewAsId: 'ALL',
    deliveryMonth: 'LAST_3',
    performanceFilter: null,
    status: 'ALL',
    searchQuery: '',
    ...loadFilters(),
  }))

  const setFilters = useCallback((patch) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const value = useMemo(() => ({ filters, setFilters }), [filters, setFilters])
  return <ReportingScopeContext.Provider value={value}>{children}</ReportingScopeContext.Provider>
}

export function useReportingScope() {
  const ctx = useContext(ReportingScopeContext)
  if (!ctx) throw new Error('useReportingScope must be used within ReportingScopeProvider')
  return ctx
}
