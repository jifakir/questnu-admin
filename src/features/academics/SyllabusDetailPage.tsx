import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, ScrollText, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AppModal,
  AppModalFooter,
  AppModalHeader,
} from '@/components/ui/app-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { deleteAcademicSubject, fetchAcademicSubject, updateAcademicSubject } from '@/api'
import type { AcademicDraftStatus, AcademicSubject, SubjectOutlineUnit } from '@/types'
import { hasSyllabusBody, OldSyllabusNotice } from './ui'

function lines(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function formatOutline(units: SubjectOutlineUnit[] | undefined) {
  return (units ?? [])
    .map((unit) => {
      const hours = unit.hours != null && unit.hours !== undefined ? ` | ${unit.hours}` : ''
      return `${unit.unit} | ${unit.topic}${hours}`
    })
    .join('\n')
}

function parseOutline(value: FormDataEntryValue | null): SubjectOutlineUnit[] {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split('|').map((part) => part.trim())
      if (parts.length === 1) {
        return { unit: String(index + 1), topic: parts[0], hours: null }
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

export function SyllabusDetailPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState<AcademicSubject | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setSubject(null)
    setError(null)
    setEditing(false)
    fetchAcademicSubject(slug)
      .then((row) => {
        if (!cancelled) setSubject(row)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Course not found')
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!subject) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    try {
      const updated = await updateAcademicSubject(subject.slug, {
        title: String(form.get('title') ?? ''),
        titleBn: String(form.get('titleBn') ?? ''),
        code: String(form.get('code') ?? ''),
        marks: Number(form.get('marks') ?? 0),
        credits: Number(form.get('credits') ?? 0),
        classHours: form.get('classHours') ? Number(form.get('classHours')) : null,
        description: String(form.get('description') ?? ''),
        introduction: String(form.get('introduction') ?? ''),
        status: String(form.get('status') ?? 'draft') as AcademicDraftStatus,
        objectives: lines(form.get('objectives')),
        books: lines(form.get('books')),
        outline: parseOutline(form.get('outline')),
      })
      setSubject(updated)
      toast.success('Course saved')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!subject) return
    try {
      await deleteAcademicSubject(subject.slug)
      toast.success('Deleted')
      navigate(`/academics/syllabus?dept=${subject.departmentId}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const syllabusMissing = subject ? !hasSyllabusBody(subject) : false

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!subject) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-brand" /> Loading course…
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-6 ${syllabusMissing && !editing ? 'min-h-[calc(100dvh-10rem)]' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <ScrollText className="size-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-border/70 bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide">
                {subject.code}
              </span>
              <Badge variant={subject.status === 'ready' ? 'approved' : 'pending'}>
                {subject.status === 'ready' ? 'In the app' : 'Draft'}
              </Badge>
              {syllabusMissing ? (
                <Badge
                  variant="outline"
                  className="border-amber-200/80 bg-amber-50 font-medium text-amber-800"
                >
                  Old
                </Badge>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {subject.departmentId} · year {subject.yearId}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{subject.title}</h1>
            {subject.titleBn ? <p className="text-sm text-muted-foreground">{subject.titleBn}</p> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to={`/academics/syllabus?dept=${subject.departmentId}&year=${subject.yearId}`}>
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
          <Button variant="ghost" className="rounded-xl text-destructive" onClick={() => setConfirming(true)}>
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-3 sm:max-w-md">
          <Metric label="Credits" value={String(subject.credits)} />
          <Metric label="Marks" value={String(subject.marks)} />
          <Metric label="Class hours" value={subject.classHours ? String(subject.classHours) : '—'} />
        </div>
        {syllabusMissing && !editing ? (
          <Button className="rounded-xl" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : null}
      </div>

      {syllabusMissing && !editing ? (
        <OldSyllabusNotice />
      ) : syllabusMissing ? null : (
        <Card className="rounded-2xl border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Introduction</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{subject.introduction}</p>
          </CardContent>
        </Card>
      )}

      {syllabusMissing && !editing ? null : (
      <Tabs defaultValue={syllabusMissing ? 'edit' : 'outline'}>
        <TabsList className={syllabusMissing ? 'hidden' : undefined}>
          {syllabusMissing ? null : <TabsTrigger value="outline">Outline</TabsTrigger>}
          {syllabusMissing ? null : <TabsTrigger value="outcomes">Outcomes</TabsTrigger>}
          <TabsTrigger value="edit">Edit</TabsTrigger>
        </TabsList>

        {syllabusMissing ? null : (
        <TabsContent value="outline" className="mt-4 space-y-3">
          {(subject.outline ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No units on this course.</p>
          ) : (
            subject.outline?.map((unit) => (
              <div key={unit.unit} className="flex gap-4 rounded-2xl border border-border/70 bg-card p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                  {unit.unit}
                </span>
                <div>
                  <p className="text-sm leading-relaxed">{unit.topic}</p>
                  {unit.teachingStrategies?.length ? (
                    <p className="mt-2 text-xs text-muted-foreground">{unit.teachingStrategies.join(' · ')}</p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </TabsContent>
        )}

        {syllabusMissing ? null : (
        <TabsContent value="outcomes" className="mt-4 space-y-4">
          <Card className="rounded-2xl border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Objectives</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(subject.objectives ?? []).map((item) => (
                <p key={item} className="text-sm leading-relaxed">{item}</p>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Learning outcomes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(subject.outcomes ?? []).map((outcome) => (
                <p key={outcome.id} className="text-sm leading-relaxed">
                  <span className="font-semibold text-brand">{outcome.id}.</span> {outcome.text}
                </p>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Books</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(subject.books ?? []).map((book) => (
                <p key={book} className="text-sm">{book}</p>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        <TabsContent value="edit" className={syllabusMissing ? 'mt-0' : 'mt-4'}>
          <Card className="rounded-2xl border-border/70">
            <CardContent className="pt-6">
              <form onSubmit={(e) => void save(e)} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" defaultValue={subject.title} required />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="titleBn">Bangla title</Label>
                  <Input id="titleBn" name="titleBn" defaultValue={subject.titleBn ?? ''} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="code">Code</Label>
                  <Input id="code" name="code" defaultValue={subject.code} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <NativeSelect id="status" name="status" defaultValue={subject.status}>
                    <option value="ready">In the app</option>
                    <option value="draft">Draft</option>
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="credits">Credits</Label>
                  <Input id="credits" name="credits" type="number" step="0.5" defaultValue={subject.credits} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="marks">Marks</Label>
                  <Input id="marks" name="marks" type="number" defaultValue={subject.marks} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="classHours">Class hours</Label>
                  <Input id="classHours" name="classHours" type="number" defaultValue={subject.classHours ?? ''} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="introduction">Introduction</Label>
                  <Textarea id="introduction" name="introduction" defaultValue={subject.introduction ?? ''} rows={5} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" defaultValue={subject.description ?? ''} rows={4} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="objectives">Objectives, one per line</Label>
                  <Textarea id="objectives" name="objectives" defaultValue={(subject.objectives ?? []).join('\n')} rows={5} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="outline">Outline (unit | topic | hours)</Label>
                  <Textarea
                    id="outline"
                    name="outline"
                    defaultValue={formatOutline(subject.outline)}
                    rows={8}
                    placeholder={'1 | Introduction\n2 | Core concepts | 6'}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="books">Books, one per line</Label>
                  <Textarea id="books" name="books" defaultValue={(subject.books ?? []).join('\n')} rows={4} />
                </div>
                <div>
                  <Button type="submit" className="rounded-xl" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      <AppModal open={confirming} onOpenChange={setConfirming}>
        <AppModalHeader>
          <DialogTitle>Delete {subject.title}?</DialogTitle>
          <DialogDescription>Questions that belong to this course must be removed first.</DialogDescription>
        </AppModalHeader>
        <AppModalFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button variant="destructive" className="rounded-xl" onClick={() => void remove()}>
            Delete
          </Button>
        </AppModalFooter>
      </AppModal>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
      <p className="text-lg font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
