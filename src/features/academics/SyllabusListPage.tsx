import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Download, Loader2, ScrollText, Upload } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
} from '@/components/ui/app-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { PageToolbar } from '@/components/PageToolbar'
import {
  fetchAcademicDepartments,
  fetchAcademicSubjects,
  fetchAcademicYears,
  importSyllabusFile,
} from '@/api'
import { useSearch } from '@/search'
import type { AcademicDepartment, AcademicSubjectSummary, AcademicYear } from '@/types'
import { DepartmentSelect, FilterPills } from './ui'

export function SyllabusListPage() {
  const navigate = useNavigate()
  const { query, reset: resetSearch } = useSearch()
  const [params, setParams] = useSearchParams()
  const dept = params.get('dept') ?? ''
  const fileRef = useRef<HTMLInputElement>(null)
  const [departments, setDepartments] = useState<AcademicDepartment[] | null>(null)
  const [years, setYears] = useState<AcademicYear[]>([])
  const year = params.get('year') || years[0]?.slug || '1'
  const [subjects, setSubjects] = useState<AcademicSubjectSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function reload() {
    setError(null)
    try {
      const [d, y, s] = await Promise.all([
        fetchAcademicDepartments(),
        fetchAcademicYears(),
        fetchAcademicSubjects(),
      ])
      setDepartments(d)
      setYears(y)
      setSubjects(s)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load syllabus')
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  function setFilter(next: { dept?: string; year?: string }) {
    const sp = new URLSearchParams(params)
    const deptValue = next.dept === undefined ? dept : next.dept
    const yearValue = next.year === undefined ? year : next.year
    if (deptValue) sp.set('dept', deptValue)
    else sp.delete('dept')
    if (yearValue) sp.set('year', yearValue)
    else sp.delete('year')
    setParams(sp, { replace: true })
  }

  useEffect(() => {
    if (!years.length) return
    const current = params.get('year')
    if (current && years.some((item) => item.slug === current)) return
    setFilter({ year: years[0].slug })
  }, [years, params])

  const activeDept = departments?.find((d) => d.slug === dept)
  const queryMatchesDepartment =
    !!activeDept &&
    !!query.trim() &&
    (activeDept.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      activeDept.slug.includes(query.trim().toLowerCase()) ||
      (activeDept.nameBn ?? '').includes(query.trim()))

  const inDepartment = useMemo(() => {
    return (subjects ?? []).filter((row) => {
      if (dept && row.departmentId !== dept) return false
      if (year && row.yearId !== year) return false
      return true
    })
  }, [subjects, dept, year])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || queryMatchesDepartment) return inDepartment
    return inDepartment.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        (row.titleBn ?? '').includes(query.trim()),
    )
  }, [inDepartment, query, queryMatchesDepartment])

  const departmentCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of subjects ?? []) {
      if (year && row.yearId !== year) continue
      counts.set(row.departmentId, (counts.get(row.departmentId) ?? 0) + 1)
    }
    return counts
  }, [subjects, year])

  const departmentOptions = useMemo(() => {
    return (departments ?? []).filter((item) => {
      const count = departmentCounts.get(item.slug) ?? 0
      return count > 0 || item.slug === dept
    })
  }, [departments, departmentCounts, dept])

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const result = await importSyllabusFile(file)
      toast.success(`Imported ${result.created} new, updated ${result.updated}`)
      if (result.errors[0]) toast.error(result.errors[0].message)
      setImportOpen(false)
      await reload()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        icon={ScrollText}
        title={activeDept ? activeDept.name : 'Syllabus'}
        description={
          activeDept
            ? activeDept.nameBn || 'Courses already shipped in the mobile app, plus anything you import.'
            : 'Choose a department. This is the offline syllabus students already have on their phones.'
        }
        actions={
          <div className="flex gap-2">
            {dept ? (
              <Button variant="outline" className="rounded-xl" onClick={() => setFilter({ dept: '' })}>
                <ArrowLeft className="size-4" /> All departments
              </Button>
            ) : null}
            <Button className="rounded-xl" onClick={() => navigate('/academics/courses?upload=1')}>
              <Upload className="size-4" /> Upload course
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" /> Import JSON
            </Button>
          </div>
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!departments ? null : (
        <PageToolbar
          loadedAt={null}
          left={
            <FilterPills
              value={year}
              onChange={(next) => setFilter({ year: next })}
              options={years.map((y) => ({
                value: y.slug,
                label: y.label,
                count: (subjects ?? []).filter((s) => s.yearId === y.slug && (!dept || s.departmentId === dept)).length,
              }))}
            />
          }
          right={
            <DepartmentSelect
              value={dept}
              departments={departmentOptions}
              counts={departmentCounts}
              onChange={(next) => {
                resetSearch()
                setFilter({ dept: next })
              }}
            />
          }
        />
      )}

      {!dept ? (
        !departments ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/50" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {departments
              .filter((d) => {
                if ((departmentCounts.get(d.slug) ?? 0) === 0) return false
                const q = query.trim().toLowerCase()
                if (!q) return true
                return (
                  d.name.toLowerCase().includes(q) ||
                  d.slug.includes(q.replace(/\s+/g, '_')) ||
                  d.slug.includes(q.replace(/\s+/g, '-')) ||
                  (d.nameBn ?? '').includes(query.trim())
                )
              })
              .map((d) => {
                return (
                <button
                  key={d.slug}
                  type="button"
                  onClick={() => {
                    resetSearch()
                    setFilter({ dept: d.slug })
                  }}
                  className="rounded-2xl border border-border/70 bg-card p-4 text-left shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.04)] transition hover:-translate-y-0.5 hover:border-brand/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{d.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{d.nameBn || d.slug}</p>
                    </div>
                    <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
                      {departmentCounts.get(d.slug) ?? d.subjectCount ?? 0}
                    </span>
                  </div>
                </button>
                )
              })}
          </div>
        )
      ) : (
        <>
          {!subjects ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-brand" /> Loading courses…
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title={
                inDepartment.length === 0 && year
                  ? `No ${years.find((y) => y.slug === year)?.label ?? 'this year'} courses`
                  : 'No courses match this search'
              }
              description={
                inDepartment.length === 0
                  ? `${activeDept?.name ?? 'This department'} has no courses in this year.`
                  : `Nothing in ${activeDept?.name ?? 'this department'} matches “${query.trim()}”. The search does not have to match the department name.`
              }
              action={
                inDepartment.length === 0 ? (
                  <Button className="rounded-xl" onClick={() => setFilter({ dept: '' })}>
                    All departments
                  </Button>
                ) : (
                  <Button className="rounded-xl" onClick={() => setImportOpen(true)}>
                    <Upload className="size-4" /> Import JSON
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[...visible].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })).map((subject) => (
                <Card
                  key={subject.slug}
                  className="flex h-full flex-col rounded-2xl border-border/70 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05)] transition hover:border-brand/30"
                >
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-border/70 bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                        {subject.code}
                      </span>
                      <Badge variant={subject.status === 'ready' ? 'approved' : 'pending'}>
                        {subject.status === 'ready' ? 'In the app' : 'Draft'}
                      </Badge>
                      {subject.tags?.includes('old') ? (
                        <Badge
                          variant="outline"
                          className="border-amber-200/80 bg-amber-50 font-medium text-amber-800"
                        >
                          Old
                        </Badge>
                      ) : null}
                      {!dept ? (
                        <Badge variant="outline">{subject.departmentId.replace(/_/g, ' ')}</Badge>
                      ) : null}
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      <Link to={`/academics/syllabus/${subject.slug}`} className="hover:text-brand hover:underline underline-offset-4">
                        {subject.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-3">
                    {subject.titleBn ? (
                      <p className="text-sm text-muted-foreground">{subject.titleBn}</p>
                    ) : null}
                    <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center text-xs">
                      <Stat label="Credits" value={String(subject.credits)} />
                      <Stat label="Marks" value={String(subject.marks)} />
                      <Stat label="Hours" value={subject.classHours ? String(subject.classHours) : '—'} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <AppModal open={importOpen} onOpenChange={setImportOpen}>
        <AppModalHeader>
          <DialogTitle>Import syllabus JSON</DialogTitle>
          <DialogDescription>
            Upload a JSON array of courses, the same shape as the files in the syllabus folder. Download the example and follow that sheet.
          </DialogDescription>
        </AppModalHeader>
        <AppModalBody className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">Example sheet</p>
              <Button variant="outline" className="rounded-xl" asChild>
                <a href="/syllabus-import-example.json" download="syllabus-import-example.json">
                  <Download className="size-4" /> Download example
                </a>
              </Button>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                <code>id</code> — unique slug, for example <code>islamic_history_culture-211601</code>
              </li>
              <li>
                <code>departmentId</code> — department slug. Hyphen files are accepted: <code>islamic-history-and-culture</code> is stored as <code>islamic_history_culture</code>, <code>library-and-information-science</code> as <code>library_science</code>, and <code>finance-and-banking</code> as <code>finance_and_banking</code>.
              </li>
              <li>
                <code>yearId</code> — <code>1</code> is 1st Year
              </li>
              <li>
                <code>code</code>, <code>title</code>, <code>marks</code>, <code>credits</code>
              </li>
              <li>
                <code>objectives</code>, <code>outcomes</code>, <code>outline</code>, <code>books</code>
              </li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              If description is empty, the first objective becomes Introduction. For a practical paper, put that text in labDetails.instructions instead. The example file has one theoretical paper and one practical paper.
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-sm text-muted-foreground hover:border-brand/30 hover:text-foreground"
          >
            {busy ? <Loader2 className="size-5 animate-spin text-brand" /> : <Upload className="size-5 text-brand" />}
            Choose a .json file
          </button>
        </AppModalBody>
        <AppModalFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => setImportOpen(false)}>
            Close
          </Button>
        </AppModalFooter>
      </AppModal>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  )
}
