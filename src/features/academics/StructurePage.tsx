import { useEffect, useMemo, useState } from 'react'
import { Building2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalForm,
  AppModalHeader,
} from '@/components/ui/app-modal'
import { Card, CardContent } from '@/components/ui/card'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, type Column } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { PageToolbar } from '@/components/PageToolbar'
import {
  createAcademicCollege,
  createAcademicDepartment,
  createAcademicYear,
  deleteAcademicCollege,
  deleteAcademicDepartment,
  deleteAcademicYear,
  fetchAcademicColleges,
  fetchAcademicDepartments,
  fetchAcademicYears,
  updateAcademicCollege,
  updateAcademicDepartment,
  updateAcademicYear,
} from '@/api'
import { useSearch } from '@/search'
import type { AcademicCollege, AcademicDepartment, AcademicYear } from '@/types'
import { FilterPills } from './ui'

type Kind = 'department' | 'year' | 'college'
type StructureTab = 'departments' | 'years' | 'colleges'

type Draft = {
  slug: string
  name: string
  nameBn: string
  district: string
  sortOrder: string
}

const blank = (): Draft => ({
  slug: '',
  name: '',
  nameBn: '',
  district: '',
  sortOrder: '0',
})

export function StructurePage() {
  const { query } = useSearch()
  const [departments, setDepartments] = useState<AcademicDepartment[] | null>(null)
  const [years, setYears] = useState<AcademicYear[] | null>(null)
  const [colleges, setColleges] = useState<AcademicCollege[] | null>(null)
  const [tab, setTab] = useState<StructureTab>('departments')
  const [district, setDistrict] = useState('')
  const [loadedAt, setLoadedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ kind: Kind; originalSlug?: string; draft: Draft } | null>(null)
  const [removing, setRemoving] = useState<{ kind: Kind; slug: string; label: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function reload(silent = false) {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [d, y, c] = await Promise.all([
        fetchAcademicDepartments(),
        fetchAcademicYears(),
        fetchAcademicColleges(),
      ])
      setDepartments(d)
      setYears(y)
      setColleges(c)
      setLoadedAt(Date.now())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load structure')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const q = query.trim().toLowerCase()
  const filteredDepartments = useMemo(
    () =>
      (departments ?? []).filter(
        (row) =>
          !q ||
          row.name.toLowerCase().includes(q) ||
          row.slug.includes(q) ||
          (row.nameBn ?? '').includes(query.trim()),
      ),
    [departments, q, query],
  )
  const filteredColleges = useMemo(() => {
    const selected = districtKey(district)
    return (colleges ?? []).filter((row) => {
      if (selected && districtKey(row.district) !== selected) return false
      if (!q) return true
      return (
        row.name.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q) ||
        districtKey(row.district).includes(q)
      )
    })
  }, [colleges, district, q])

  const districts = useMemo(() => {
    const byKey = new Map<string, string>()
    for (const college of colleges ?? []) {
      const key = districtKey(college.district)
      if (!key) continue
      const current = byKey.get(key)
      const next = college.district!.trim()
      if (!current || isShouted(current)) byKey.set(key, next)
    }
    return [...byKey.entries()]
      .map(([key, name]) => ({ key, label: displayDistrict(name) }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [colleges])

  async function save() {
    if (!editing) return
    const { kind, originalSlug, draft } = editing
    const sortOrder = Number(draft.sortOrder) || 0
    setBusy(true)
    try {
      if (kind === 'department') {
        const body = { slug: draft.slug.trim(), name: draft.name.trim(), nameBn: draft.nameBn.trim(), sortOrder }
        if (originalSlug) await updateAcademicDepartment(originalSlug, body)
        else await createAcademicDepartment(body)
      } else if (kind === 'year') {
        const body = { slug: draft.slug.trim(), label: draft.name.trim(), labelBn: draft.nameBn.trim(), sortOrder }
        if (originalSlug) await updateAcademicYear(originalSlug, body)
        else await createAcademicYear(body)
      } else {
        const body = {
          slug: draft.slug.trim(),
          name: draft.name.trim(),
          nameBn: draft.nameBn.trim(),
          district: displayDistrict(draft.district),
          sortOrder,
        }
        if (originalSlug) await updateAcademicCollege(originalSlug, body)
        else await createAcademicCollege(body)
      }
      toast.success(originalSlug ? 'Saved' : 'Created')
      setEditing(null)
      await reload(true)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function confirmRemove() {
    if (!removing) return
    setBusy(true)
    try {
      if (removing.kind === 'department') await deleteAcademicDepartment(removing.slug)
      else if (removing.kind === 'year') await deleteAcademicYear(removing.slug)
      else await deleteAcademicCollege(removing.slug)
      toast.success('Deleted')
      setRemoving(null)
      await reload(true)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  const collegeColumns: Column<AcademicCollege>[] = [
    {
      key: 'name',
      header: 'College',
      sortable: true,
      sortFn: (a, b) => a.name.localeCompare(b.name),
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.nameBn || row.slug}</p>
        </div>
      ),
    },
    { key: 'district', header: 'District', cell: (row) => displayDistrict(row.district) || '—' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <RowActions
          onEdit={() =>
            setEditing({
              kind: 'college',
              originalSlug: row.slug,
              draft: {
                slug: row.slug,
                name: row.name,
                nameBn: row.nameBn ?? '',
                district: row.district ?? '',
                sortOrder: String(row.sortOrder ?? 0),
              },
            })
          }
          onDelete={() => setRemoving({ kind: 'college', slug: row.slug, label: row.name })}
        />
      ),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        icon={Building2}
        title="Academic structure"
        description="Colleges, departments, and years. Slugs are the ids the phone stores offline."
      />
      {error ? (
        <Card className="rounded-2xl border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Tabs value={tab} onValueChange={(next) => setTab(next as StructureTab)} className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="w-fit">
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="years">Years</TabsTrigger>
            <TabsTrigger value="colleges">Colleges</TabsTrigger>
          </TabsList>
          {tab === 'departments' ? (
            <Button className="rounded-xl" onClick={() => setEditing({ kind: 'department', draft: blank() })}>
              <Plus className="size-4" /> New department
            </Button>
          ) : tab === 'years' ? (
            <Button className="rounded-xl" onClick={() => setEditing({ kind: 'year', draft: blank() })}>
              <Plus className="size-4" /> Add year
            </Button>
          ) : null}
        </div>

        <TabsContent value="departments" className="flex flex-col gap-4">
          {loading && !departments ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/50" />
              ))}
            </div>
          ) : filteredDepartments.length === 0 ? (
            <EmptyState icon={Building2} title="No departments match" description="Sync the app catalog from Academics, or add one here." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredDepartments.map((dept) => (
                <Card key={dept.slug} className="rounded-2xl border-border/70 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05)]">
                  <CardContent className="flex h-full flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{dept.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{dept.nameBn || 'No Bangla name'}</p>
                      </div>
                      <RowActions
                        onEdit={() =>
                          setEditing({
                            kind: 'department',
                            originalSlug: dept.slug,
                            draft: {
                              slug: dept.slug,
                              name: dept.name,
                              nameBn: dept.nameBn ?? '',
                              district: '',
                              sortOrder: String(dept.sortOrder ?? 0),
                            },
                          })
                        }
                        onDelete={() => setRemoving({ kind: 'department', slug: dept.slug, label: dept.name })}
                      />
                    </div>
                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                      <code className="rounded-md bg-muted px-1.5 py-0.5">{dept.slug}</code>
                      <Link to={`/academics/syllabus?dept=${dept.slug}`} className="font-semibold text-brand hover:underline">
                        {dept.subjectCount ?? 0} courses
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="years" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(years ?? []).map((year) => (
            <Card key={year.slug} className="rounded-2xl border-border/70">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {year.labelBn || 'Year'}
                    </p>
                    <p className="mt-1 text-xl font-bold tracking-tight">{year.label}</p>
                  </div>
                  <RowActions
                    onEdit={() =>
                      setEditing({
                        kind: 'year',
                        originalSlug: year.slug,
                        draft: {
                          slug: year.slug,
                          name: year.label,
                          nameBn: year.labelBn ?? '',
                          district: '',
                          sortOrder: String(year.sortOrder ?? 0),
                        },
                      })
                    }
                    onDelete={() => setRemoving({ kind: 'year', slug: year.slug, label: year.label })}
                  />
                </div>
                <Link to={`/academics/syllabus?year=${year.slug}`} className="text-sm font-semibold text-brand hover:underline">
                  View syllabus
                </Link>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="colleges" className="flex min-h-0 flex-1 flex-col gap-4">
          <PageToolbar
            loadedAt={loadedAt}
            loading={loading}
            onRefresh={() => void reload(true)}
            left={
              <FilterPills
                value={district}
                onChange={setDistrict}
                options={[
                  { value: '', label: 'All districts', count: colleges?.length },
                  ...districts.map((item) => ({
                    value: item.key,
                    label: item.label,
                    count: colleges?.filter((c) => districtKey(c.district) === item.key).length,
                  })),
                ]}
              />
            }
            right={
              <Button className="rounded-xl" onClick={() => setEditing({ kind: 'college', draft: blank() })}>
                <Plus className="size-4" /> New college
              </Button>
            }
          />
          <DataTable data={filteredColleges} columns={collegeColumns} loading={loading && !colleges} pageSize={12} />
        </TabsContent>
      </Tabs>

      <EditorModal editing={editing} busy={busy} onClose={() => setEditing(null)} onChange={setEditing} onSave={() => void save()} />

      <AppModal open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <AppModalHeader>
          <DialogTitle>Delete {removing?.label}?</DialogTitle>
          <DialogDescription>
            This only works if no syllabus or questions still point at it.
          </DialogDescription>
        </AppModalHeader>
        <AppModalFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => setRemoving(null)}>
            Cancel
          </Button>
          <Button variant="destructive" className="rounded-xl" disabled={busy} onClick={() => void confirmRemove()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete
          </Button>
        </AppModalFooter>
      </AppModal>
    </div>
  )
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0">
      <Button size="icon" variant="ghost" className="size-8 rounded-lg" onClick={onEdit} aria-label="Edit">
        <Pencil className="size-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        aria-label="Delete"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}

function EditorModal({
  editing,
  busy,
  onClose,
  onChange,
  onSave,
}: {
  editing: { kind: Kind; originalSlug?: string; draft: Draft } | null
  busy: boolean
  onClose: () => void
  onChange: (next: { kind: Kind; originalSlug?: string; draft: Draft }) => void
  onSave: () => void
}) {
  return (
    <AppModal open={Boolean(editing)} onOpenChange={(open) => !open && onClose()}>
      {editing ? (
        <AppModalForm
          onSubmit={(e) => {
            e.preventDefault()
            onSave()
          }}
        >
          <AppModalHeader>
            <DialogTitle>{editing.originalSlug ? 'Edit' : 'New'} {editing.kind}</DialogTitle>
            <DialogDescription>
              Slug is the offline id: lowercase letters, digits, hyphens, or underscores.
            </DialogDescription>
          </AppModalHeader>
          <AppModalBody className="space-y-3">
            <Field label="Slug" value={editing.draft.slug} onChange={(slug) => onChange({ ...editing, draft: { ...editing.draft, slug } })} />
            <Field
              label={editing.kind === 'year' ? 'Label' : 'Name'}
              value={editing.draft.name}
              onChange={(name) => onChange({ ...editing, draft: { ...editing.draft, name } })}
            />
            <Field label="Bangla" value={editing.draft.nameBn} onChange={(nameBn) => onChange({ ...editing, draft: { ...editing.draft, nameBn } })} />
            {editing.kind === 'college' ? (
              <Field label="District" value={editing.draft.district} onChange={(district) => onChange({ ...editing, draft: { ...editing.draft, district } })} />
            ) : null}
          </AppModalBody>
          <AppModalFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </AppModalFooter>
        </AppModalForm>
      ) : null}
    </AppModal>
  )
}

function districtKey(value?: string | null) {
  return (value ?? '').trim().toLowerCase()
}

function isShouted(value: string) {
  const letters = value.replace(/[^A-Za-z]/g, '')
  return letters.length > 0 && letters === letters.toUpperCase()
}

function displayDistrict(value?: string | null) {
  const text = (value ?? '').trim()
  if (!text) return ''
  if (!isShouted(text)) return text
  return text
    .toLowerCase()
    .replace(/(^|[\s'’-])([a-z])/g, (_, boundary: string, letter: string) => boundary + letter.toUpperCase())
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} required={label !== 'Bangla' && label !== 'District'} />
    </div>
  )
}
