import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileJson,
  FormInput,
  Link2,
  Loader2,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
} from '@/components/ui/app-modal'
import { Card, CardContent } from '@/components/ui/card'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/PageHeader'
import { Textarea } from '@/components/ui/textarea'
import {
  deleteAcademicCourse,
  fetchAcademicCourses,
  fetchAcademicDepartments,
  fetchAcademicSubjects,
  fetchAcademicYears,
  linkAcademicCourse,
  uploadAcademicCourse,
} from '@/api'
import { useSearch } from '@/search'
import type {
  AcademicCourse,
  AcademicDepartment,
  AcademicDraftStatus,
  AcademicSubjectSummary,
  AcademicYear,
} from '@/types'
import { NativeSelect } from '@/components/ui/native-select'
import { PageToolbar } from '@/components/PageToolbar'
import { DepartmentSelect, FilterPills } from './ui'

type UploadMode = 'form' | 'json'

type CourseFormState = {
  code: string
  title: string
  titleBn: string
  marks: string
  credits: string
  classHours: string
  examDuration: string
  introduction: string
  objectives: string
  outline: string
  books: string
}

const emptyForm = (): CourseFormState => ({
  code: '',
  title: '',
  titleBn: '',
  marks: '100',
  credits: '4',
  classHours: '',
  examDuration: '',
  introduction: '',
  objectives: '',
  outline: '',
  books: '',
})

function linesToList(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseOutlineLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split('|').map((part) => part.trim())
      if (parts.length === 1) {
        return { unit: String(index + 1), topic: parts[0], hours: null as number | null }
      }
      const hoursRaw = parts[2]
      const hours =
        hoursRaw && Number.isFinite(Number(hoursRaw)) ? Number(hoursRaw) : null
      return {
        unit: parts[0] || String(index + 1),
        topic: parts[1] || parts[0],
        hours,
      }
    })
}

function formToPayload(form: CourseFormState, yearId: string) {
  const code = form.code.trim()
  const title = form.title.trim()
  if (!code || !title) {
    throw new Error('Course code and title are required')
  }
  const marks = Number(form.marks)
  const credits = Number(form.credits)
  const classHours = form.classHours.trim() ? Number(form.classHours) : null
  if (!Number.isFinite(marks) || marks < 0) {
    throw new Error('Marks must be a valid number')
  }
  if (!Number.isFinite(credits) || credits < 0) {
    throw new Error('Credits must be a valid number')
  }
  if (classHours != null && (!Number.isFinite(classHours) || classHours < 0)) {
    throw new Error('Class hours must be a valid number')
  }
  return {
    code,
    title,
    titleBn: form.titleBn.trim(),
    yearId,
    marks,
    credits,
    classHours,
    examDuration: form.examDuration.trim(),
    introduction: form.introduction.trim(),
    objectives: linesToList(form.objectives),
    outline: parseOutlineLines(form.outline),
    books: linesToList(form.books),
  }
}

function formToFile(form: CourseFormState, yearId: string) {
  const payload = formToPayload(form, yearId)
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  return new File([blob], `${payload.code || 'course'}.json`, {
    type: 'application/json',
  })
}

type PreviewCourse = {
  code: string
  title: string
  departmentId?: string
  yearId?: string
}

function previewCourses(raw: unknown): PreviewCourse[] {
  const rows = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { subjects?: unknown }).subjects)
      ? (raw as { subjects: unknown[] }).subjects
      : [raw]
  const out: PreviewCourse[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const code = typeof item.code === 'string' ? item.code.trim() : ''
    const title = typeof item.title === 'string' ? item.title.trim() : ''
    if (!code || !title) continue
    out.push({
      code,
      title,
      departmentId: typeof item.departmentId === 'string' ? item.departmentId : undefined,
      yearId: item.yearId == null ? undefined : String(item.yearId),
    })
  }
  return out
}

function courseStatus(
  ...values: Array<AcademicDraftStatus | undefined>
): AcademicDraftStatus {
  if (values.some((value) => value === 'ready')) return 'ready'
  if (values.some((value) => value === 'draft')) return 'draft'
  return 'ready'
}

function isInApp(course: AcademicCourse) {
  return courseStatus(course.status) === 'ready'
}

function isOldSyllabus(course: AcademicCourse) {
  return course.tags?.includes('old') ?? false
}

function mergeExistingCourses(
  stored: AcademicCourse[],
  papers: AcademicSubjectSummary[],
): AcademicCourse[] {
  const byCode = new Map<string, AcademicCourse>()
  for (const course of stored) {
    if (!course.code) continue
    byCode.set(course.code, {
      ...course,
      departments: [...(course.departments ?? [])],
      offerings: [...(course.offerings ?? [])],
    })
  }
  for (const paper of papers) {
    const code = paper.code?.trim()
    if (!code) continue
    if (paper.departmentId === 'common' || paper.departmentId === 'ict') continue
    const existing = byCode.get(code)
    if (!existing) {
      byCode.set(code, {
        code,
        title: paper.title,
        titleBn: paper.titleBn,
        marks: paper.marks,
        credits: paper.credits,
        status: courseStatus(paper.status),
        departments: [paper.departmentId],
        offerings: [
          {
            departmentId: paper.departmentId,
            yearId: paper.yearId,
            subjectSlugs: [paper.slug],
          },
        ],
      })
      continue
    }
    if (!existing.departments.includes(paper.departmentId)) {
      existing.departments = [...existing.departments, paper.departmentId].sort()
    }
    const already = existing.offerings.some(
      (item) => item.departmentId === paper.departmentId && item.yearId === paper.yearId,
    )
    if (!already) {
      existing.offerings = [
        ...existing.offerings,
        {
          departmentId: paper.departmentId,
          yearId: paper.yearId,
          subjectSlugs: [paper.slug],
        },
      ]
    }
    existing.status = courseStatus(existing.status, paper.status)
    if (!existing.title) existing.title = paper.title
  }
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code))
}

function departmentKey(value: string) {
  return value.trim().toLowerCase().replace(/-/g, '_')
}

export function CourseUploadPage() {
  const { query, setQuery } = useSearch()
  const [params, setParams] = useSearchParams()
  const fileRef = useRef<HTMLInputElement>(null)
  const [courses, setCourses] = useState<AcademicCourse[] | null>(null)
  const [departments, setDepartments] = useState<AcademicDepartment[]>([])
  const [years, setYears] = useState<AcademicYear[]>([])
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(params.get('upload') === '1')
  const [mode, setMode] = useState<UploadMode>('form')
  const [form, setForm] = useState<CourseFormState>(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewCourse[]>([])
  const [yearId, setYearId] = useState('1')
  const [selected, setSelected] = useState<string[]>([])
  const [publish, setPublish] = useState(true)
  const [linking, setLinking] = useState<AcademicCourse | null>(null)
  const [removing, setRemoving] = useState<AcademicCourse | null>(null)
  const [busy, setBusy] = useState(false)
  const yearFilter = params.get('year') || years[0]?.slug || '1'
  const deptFilter = params.get('dept') ?? ''
  const pageSize = 12
  const pageParam = Number(params.get('page') ?? '1')
  const statusFilter = useMemo(() => {
    const raw = (params.get('status') ?? 'ready,draft')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    return {
      ready: raw.includes('ready'),
      draft: raw.includes('draft'),
    }
  }, [params])

  async function reload() {
    setError(null)
    try {
      const [rows, papers, depts, yrs] = await Promise.all([
        fetchAcademicCourses().catch(() => [] as AcademicCourse[]),
        fetchAcademicSubjects(),
        fetchAcademicDepartments(),
        fetchAcademicYears(),
      ])
      setCourses(mergeExistingCourses(rows, papers))
      setDepartments(depts)
      setYears(yrs)
      setYearId((current) =>
        yrs.some((year) => year.slug === current) ? current : (yrs[0]?.slug ?? '1'),
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load courses')
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    if (!years.length) return
    const current = params.get('year')
    if (current && years.some((year) => year.slug === current)) return
    setFilter({ year: years[0].slug, page: 1 })
  }, [years, params])

  function setFilter(next: {
    year?: string
    dept?: string
    status?: { ready: boolean; draft: boolean }
    page?: number
  }) {
    const sp = new URLSearchParams(params)
    const yearValue = next.year === undefined ? yearFilter : next.year
    const deptValue = next.dept === undefined ? deptFilter : next.dept
    const statusValue = next.status === undefined ? statusFilter : next.status
    const pageValue = next.page === undefined ? 1 : next.page
    if (yearValue) sp.set('year', yearValue)
    else sp.delete('year')
    if (deptValue) sp.set('dept', deptValue)
    else sp.delete('dept')
    const statusParts = [
      statusValue.ready ? 'ready' : null,
      statusValue.draft ? 'draft' : null,
    ].filter(Boolean)
    if (statusParts.length === 0 || statusParts.length === 2) sp.delete('status')
    else sp.set('status', statusParts.join(','))
    if (pageValue > 1) sp.set('page', String(pageValue))
    else sp.delete('page')
    setParams(sp, { replace: true })
  }

  function toggleStatus(key: 'ready' | 'draft') {
    setFilter({
      status: {
        ...statusFilter,
        [key]: !statusFilter[key],
      },
    })
  }

  const statusLabel = (() => {
    if (statusFilter.ready && statusFilter.draft) return 'All statuses'
    if (statusFilter.ready) return 'In the app'
    if (statusFilter.draft) return 'Draft'
    return 'No status'
  })()

  function openUpload() {
    setLinking(null)
    setMode('form')
    setForm(emptyForm())
    setFile(null)
    setPreview([])
    setSelected([])
    setPublish(true)
    setOpen(true)
  }

  function openLink(course: AcademicCourse) {
    setLinking(course)
    setMode('form')
    setForm(emptyForm())
    setFile(null)
    setPreview([{ code: course.code, title: course.title }])
    setYearId(course.offerings[0]?.yearId || years[0]?.slug || '1')
    setSelected(course.departments)
    setPublish(course.status !== 'draft')
    setOpen(true)
  }

  function updateForm<K extends keyof CourseFormState>(key: K, value: CourseFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onFile(next: File | undefined) {
    if (!next) return
    setFile(next)
    setLinking(null)
    try {
      const parsed = JSON.parse(await next.text()) as unknown
      const rows = previewCourses(parsed)
      if (!rows.length) {
        toast.error('This file has no course with a code and title')
        setPreview([])
        return
      }
      setPreview(rows)
      const fileYear = rows.find((row) => row.yearId)?.yearId
      if (fileYear && years.some((year) => year.slug === fileYear)) setYearId(fileYear)
      const known = new Set(departments.map((dept) => dept.slug))
      const hinted = [
        ...new Set(
          rows
            .map((row) => departmentKey(row.departmentId ?? ''))
            .filter((id) => known.has(id)),
        ),
      ]
      if (hinted.length) setSelected(hinted)
    } catch {
      toast.error('File is not valid JSON')
      setFile(null)
      setPreview([])
    }
  }

  function toggleDepartment(slug: string) {
    setSelected((current) =>
      current.includes(slug) ? current.filter((id) => id !== slug) : [...current, slug],
    )
  }

  async function submit() {
    if (!selected.length) {
      toast.error('Choose at least one department')
      return
    }
    setBusy(true)
    try {
      const status = publish ? 'ready' : 'draft'
      if (linking) {
        const result = await linkAcademicCourse(linking.code, {
          yearId,
          departmentIds: selected,
          status,
        })
        toast.success(`Linked ${linking.code} to ${result.linked} departments`)
      } else if (mode === 'form') {
        let uploadFile: File
        try {
          uploadFile = formToFile(form, yearId)
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : 'Check the course form')
          return
        }
        const result = await uploadAcademicCourse({
          file: uploadFile,
          yearId,
          departmentIds: selected,
          status,
        })
        toast.success(
          `Saved ${result.courses} course${result.courses === 1 ? '' : 's'} and linked ${result.linked} offerings`,
        )
      } else if (file) {
        const result = await uploadAcademicCourse({
          file,
          yearId,
          departmentIds: selected,
          status,
        })
        toast.success(
          `Saved ${result.courses} course${result.courses === 1 ? '' : 's'} and linked ${result.linked} offerings`,
        )
      } else {
        toast.error('Choose a course JSON file or fill in the form')
        return
      }
      setOpen(false)
      if (params.get('upload')) {
        params.delete('upload')
        setParams(params, { replace: true })
      }
      await reload()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save the course')
    } finally {
      setBusy(false)
    }
  }

  async function confirmRemove() {
    if (!removing) return
    setBusy(true)
    try {
      await deleteAcademicCourse(removing.code)
      toast.success(`Deleted ${removing.code}`)
      setRemoving(null)
      await reload()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not delete this course')
    } finally {
      setBusy(false)
    }
  }

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!courses) return null
    if (!q) return courses
    return courses.filter(
      (course) =>
        course.title.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q) ||
        (course.titleBn ?? '').includes(query.trim()),
    )
  }, [courses, query])

  const visible = useMemo(() => {
    if (!searched) return null
    return searched.filter((course) => {
      if (deptFilter && !course.departments.includes(deptFilter)) return false
      if (yearFilter && !course.offerings.some((item) => item.yearId === yearFilter)) return false
      const ready = isInApp(course)
      if (ready && !statusFilter.ready) return false
      if (!ready && !statusFilter.draft) return false
      return true
    })
  }, [searched, deptFilter, yearFilter, statusFilter])

  const totalPages = visible ? Math.max(1, Math.ceil(visible.length / pageSize)) : 1
  const page = Number.isFinite(pageParam) && pageParam > 0
    ? Math.min(pageParam, totalPages)
    : 1
  const paged = useMemo(() => {
    if (!visible) return null
    const start = (page - 1) * pageSize
    return visible.slice(start, start + pageSize)
  }, [visible, page, pageSize])

  const filtersOn = Boolean(
    deptFilter || query.trim() || !(statusFilter.ready && statusFilter.draft),
  )

  const readyCount = (searched ?? []).filter((course) => isInApp(course)).length
  const draftCount = (searched ?? []).filter((course) => !isInApp(course)).length

  const names = new Map(departments.map((dept) => [dept.slug, dept.name]))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        icon={Upload}
        title="Courses"
        description="Add a course with the form, or upload a syllabus JSON. Each course is stored once by code, then linked to departments."
        actions={
          <Button className="rounded-xl" onClick={openUpload}>
            <Upload className="size-4" /> Add course
          </Button>
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {courses ? (
        <PageToolbar
          loadedAt={null}
          left={
            <FilterPills
              value={yearFilter}
              onChange={(next) => setFilter({ year: next })}
              options={years.map((year) => ({
                value: year.slug,
                label: year.label,
                count: (searched ?? []).filter((course) =>
                  course.offerings.some((item) => item.yearId === year.slug),
                ).length,
              }))}
            />
          }
          right={
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <div className="relative min-w-[14rem] flex-1 sm:max-w-xs sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setFilter({ page: 1 })
                }}
                placeholder="Search title or course code…"
                className="h-9 rounded-full border-border/70 bg-card pl-9 text-xs font-medium shadow-none"
                aria-label="Search courses by title or code"
              />
            </div>
            <DepartmentSelect
              value={deptFilter}
              departments={departments}
              onChange={(next) => setFilter({ dept: next })}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 rounded-full border-border/70 bg-card px-3 text-xs font-semibold"
                >
                  {statusLabel}
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={statusFilter.ready}
                  onCheckedChange={() => toggleStatus('ready')}
                  onSelect={(event) => event.preventDefault()}
                >
                  <span className="flex flex-1 items-center justify-between gap-3">
                    In the app
                    <span className="text-[10px] text-muted-foreground">{readyCount}</span>
                  </span>
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter.draft}
                  onCheckedChange={() => toggleStatus('draft')}
                  onSelect={(event) => event.preventDefault()}
                >
                  <span className="flex flex-1 items-center justify-between gap-3">
                    Draft
                    <span className="text-[10px] text-muted-foreground">{draftCount}</span>
                  </span>
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          }
        />
      ) : null}

      {!paged ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : paged.length === 0 ? (
        <EmptyState
          icon={Upload}
          title={filtersOn ? 'No courses match these filters' : 'No courses uploaded yet'}
          description="Use the form to add a course manually, or upload the same JSON shape used in the syllabus folder."
          action={
            filtersOn ? (
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setQuery('')
                  setFilter({
                    year: years[0]?.slug || '1',
                    dept: '',
                    status: { ready: true, draft: true },
                    page: 1,
                  })
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button className="rounded-xl" onClick={openUpload}>
                <Upload className="size-4" /> Add course
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {paged.map((course) => (
              <Card key={course.code} className="rounded-2xl border-border/70 transition-colors hover:border-brand/40">
                <CardContent className="space-y-3 p-4">
                  <Link
                    to={`/academics/courses/${encodeURIComponent(course.code)}`}
                    className="block min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                          {course.code}
                        </p>
                        <p className="mt-1 font-semibold">{course.title}</p>
                        {course.titleBn ? (
                          <p className="text-sm text-muted-foreground">{course.titleBn}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge variant={isInApp(course) ? 'approved' : 'pending'}>
                          {isInApp(course) ? 'In the app' : 'Draft'}
                        </Badge>
                        {isOldSyllabus(course) ? (
                          <Badge
                            variant="outline"
                            className="border-amber-200/80 bg-amber-50 font-medium text-amber-800"
                          >
                            Old
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {course.departments.length
                        ? course.departments.map((id) => names.get(id) ?? id).join(', ')
                        : 'Not linked to a department yet'}
                    </p>
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => openLink(course)}>
                      <Link2 className="size-4" /> Link departments
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => setRemoving(course)}>
                      <Trash2 className="size-4" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {visible && totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-2.5 text-xs text-muted-foreground">
              <span className="font-medium">
                Page {page} of {totalPages} ·{' '}
                <span className="text-foreground">{visible.length}</span> courses
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 rounded-md"
                  disabled={page <= 1}
                  onClick={() => setFilter({ page: page - 1 })}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 rounded-md"
                  disabled={page >= totalPages}
                  onClick={() => setFilter({ page: page + 1 })}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <AppModal open={!!removing} onOpenChange={(next) => { if (!next) setRemoving(null) }}>
        <AppModalHeader>
          <DialogTitle>Delete {removing?.code}?</DialogTitle>
          <DialogDescription>
            This removes {removing?.title} from every department that offers it. Questions that belong to this course must be removed first.
          </DialogDescription>
        </AppModalHeader>
        <AppModalFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => setRemoving(null)}>
            Cancel
          </Button>
          <Button className="rounded-xl" disabled={busy} onClick={() => void confirmRemove()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete course
          </Button>
        </AppModalFooter>
      </AppModal>

      <AppModal open={open} onOpenChange={setOpen} size="lg">
        <AppModalHeader>
          <DialogTitle>{linking ? `Link ${linking.code}` : 'Add course'}</DialogTitle>
          <DialogDescription>
            {linking
              ? 'Offer this course in more departments. Existing copies keep their syllabus.'
              : 'Fill in the form, or switch to JSON if you already have a syllabus file.'}
          </DialogDescription>
        </AppModalHeader>
        <AppModalBody className="space-y-4">
          {!linking ? (
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-muted/20 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('form')
                  setFile(null)
                  setPreview([])
                }}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  mode === 'form'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FormInput className="size-4" /> Form
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('json')
                  setForm(emptyForm())
                }}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  mode === 'json'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileJson className="size-4" /> JSON file
              </button>
            </div>
          ) : null}

          {!linking && mode === 'form' ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="course-code">Course code</Label>
                  <Input
                    id="course-code"
                    value={form.code}
                    onChange={(e) => updateForm('code', e.target.value)}
                    placeholder="212501"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="course-title">Title</Label>
                  <Input
                    id="course-title"
                    value={form.title}
                    onChange={(e) => updateForm('title', e.target.value)}
                    placeholder="Introduction to…"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-title-bn">Bangla title</Label>
                <Input
                  id="course-title-bn"
                  value={form.titleBn}
                  onChange={(e) => updateForm('titleBn', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="course-marks">Marks</Label>
                  <Input
                    id="course-marks"
                    type="number"
                    min={0}
                    value={form.marks}
                    onChange={(e) => updateForm('marks', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="course-credits">Credits</Label>
                  <Input
                    id="course-credits"
                    type="number"
                    min={0}
                    step="0.5"
                    value={form.credits}
                    onChange={(e) => updateForm('credits', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="course-hours">Class hours</Label>
                  <Input
                    id="course-hours"
                    type="number"
                    min={0}
                    value={form.classHours}
                    onChange={(e) => updateForm('classHours', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-exam">Exam duration</Label>
                <Input
                  id="course-exam"
                  value={form.examDuration}
                  onChange={(e) => updateForm('examDuration', e.target.value)}
                  placeholder="e.g. 4 hours"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-intro">Introduction</Label>
                <Textarea
                  id="course-intro"
                  rows={3}
                  value={form.introduction}
                  onChange={(e) => updateForm('introduction', e.target.value)}
                  placeholder="Short overview of the course"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-objectives">Objectives</Label>
                <Textarea
                  id="course-objectives"
                  rows={3}
                  value={form.objectives}
                  onChange={(e) => updateForm('objectives', e.target.value)}
                  placeholder="One objective per line"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-outline">Outline</Label>
                <Textarea
                  id="course-outline"
                  rows={4}
                  value={form.outline}
                  onChange={(e) => updateForm('outline', e.target.value)}
                  placeholder={'1 | Introduction\n2 | Core concepts | 6'}
                />
                <p className="text-[11px] text-muted-foreground">
                  One unit per line: unit | topic | hours (hours optional)
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-books">Books</Label>
                <Textarea
                  id="course-books"
                  rows={2}
                  value={form.books}
                  onChange={(e) => updateForm('books', e.target.value)}
                  placeholder="One book per line"
                />
              </div>
            </div>
          ) : null}

          {!linking && mode === 'json' ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-sm text-muted-foreground hover:border-brand/30 hover:text-foreground"
              >
                <Upload className="size-5 text-brand" />
                {file ? file.name : 'Choose a .json file'}
              </button>
            </>
          ) : null}

          {preview.length ? (
            <div className="space-y-1 rounded-2xl border border-border/70 bg-muted/20 p-3 text-sm">
              {preview.map((course) => (
                <p key={course.code}>
                  <span className="font-mono text-xs text-muted-foreground">{course.code}</span>{' '}
                  {course.title}
                </p>
              ))}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Year</p>
            <NativeSelect value={yearId} onChange={(e) => setYearId(e.target.value)}>
              {years.map((year) => (
                <option key={year.slug} value={year.slug}>
                  {year.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Departments</p>
              <button
                type="button"
                className="text-xs font-semibold text-brand"
                onClick={() =>
                  setSelected(
                    selected.length === departments.length
                      ? []
                      : departments.map((dept) => dept.slug),
                  )
                }
              >
                {selected.length === departments.length ? 'Clear' : 'Select all'}
              </button>
            </div>
            <div className="grid max-h-56 gap-2 overflow-auto sm:grid-cols-2">
              {departments.map((dept) => (
                <label
                  key={dept.slug}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(dept.slug)}
                    onChange={() => toggleDepartment(dept.slug)}
                  />
                  <span className="truncate">{dept.name}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
            Show in the app
          </label>
        </AppModalBody>
        <AppModalFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="rounded-xl" disabled={busy} onClick={() => void submit()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {linking ? 'Link course' : 'Save course'}
          </Button>
        </AppModalFooter>
      </AppModal>
    </div>
  )
}
