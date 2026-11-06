import { useEffect, useState } from 'react'

import { fetchAcademicDepartments, fetchAcademicYears } from '@/api'
import type { AcademicDepartment, AcademicYear } from '@/types'

export interface AudienceValue {
  targetYears: string[]
  targetDepartments: string[]
}

export interface AcademicLists {
  years: AcademicYear[]
  departments: AcademicDepartment[]
}

let listsPromise: Promise<AcademicLists> | null = null

/** Years and departments for the audience picker, loaded once per page load. */
export function useAcademicLists(): AcademicLists | null {
  const [lists, setLists] = useState<AcademicLists | null>(null)
  useEffect(() => {
    listsPromise ??= Promise.all([fetchAcademicYears(), fetchAcademicDepartments()])
      .then(([years, departments]) => ({
        years: [...years].sort((a, b) => a.sortOrder - b.sortOrder),
        departments: [...departments].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .catch((e: unknown) => {
        listsPromise = null
        throw e
      })
    let alive = true
    listsPromise.then(
      (l) => alive && setLists(l),
      () => alive && setLists({ years: [], departments: [] }),
    )
    return () => {
      alive = false
    }
  }, [])
  return lists
}

/** Short text such as "2nd Year · Accounting, Bangla" or "All app users". */
export function audienceSummary(value: AudienceValue, lists: AcademicLists | null): string {
  const yearName = (id: string) => lists?.years.find((y) => y.slug === id)?.label ?? `Year ${id}`
  const deptName = (id: string) => lists?.departments.find((d) => d.slug === id)?.name ?? id
  const years = value.targetYears.map(yearName)
  const depts = value.targetDepartments.map(deptName)
  if (years.length === 0 && depts.length === 0) return 'All app users'
  const parts = [
    years.length ? years.join(', ') : 'All years',
    depts.length === 0
      ? 'All departments'
      : depts.length > 3
        ? `${depts.slice(0, 3).join(', ')} +${depts.length - 3}`
        : depts.join(', '),
  ]
  return parts.join(' · ')
}

export function isTargeted(value: AudienceValue) {
  return value.targetYears.length > 0 || value.targetDepartments.length > 0
}
