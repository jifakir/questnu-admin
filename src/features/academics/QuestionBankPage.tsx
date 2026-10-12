import { useEffect, useMemo, useState } from 'react'
import { FileQuestion, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
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
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import {
  createAcademicQuestion,
  deleteAcademicQuestion,
  fetchAcademicQuestions,
  fetchAcademicSubjects,
} from '@/api'
import { useSearch } from '@/search'
import type { AcademicQuestion, AcademicSubjectSummary, QuestionType } from '@/types'

export function QuestionBankPage() {
  const { query } = useSearch()
  const [subjects, setSubjects] = useState<AcademicSubjectSummary[]>([])
  const [questions, setQuestions] = useState<AcademicQuestion[] | null>(null)
  const [subjectSlug, setSubjectSlug] = useState('')
  const [creating, setCreating] = useState(false)
  const [type, setType] = useState<QuestionType>('short')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reload(nextSubject = subjectSlug) {
    setError(null)
    try {
      const [s, q] = await Promise.all([
        fetchAcademicSubjects(),
        fetchAcademicQuestions({ subjectSlug: nextSubject || undefined }),
      ])
      setSubjects(s)
      setQuestions(q)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load questions')
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const subjectOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    return subjects.filter((s) => {
      if (subjectSlug && s.slug !== subjectSlug && !q) return false
      if (!q) return true
      return s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.slug.includes(q)
    })
  }, [subjects, query, subjectSlug])

  const active = subjects.find((s) => s.slug === subjectSlug)
  const filteredQuestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!questions || !subjectSlug) return questions
    if (!q) return questions
    return questions.filter((row) => row.prompt.toLowerCase().includes(q) || (row.session ?? '').includes(q))
  }, [questions, query, subjectSlug])

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const chosen = String(form.get('subjectSlug') ?? '')
    const questionType = String(form.get('type') ?? 'short') as QuestionType
    const options = ['a', 'b', 'c', 'd']
      .map((id) => ({ id, text: String(form.get(`opt-${id}`) ?? '').trim() }))
      .filter((opt) => opt.text)
    setBusy(true)
    try {
      await createAcademicQuestion({
        subjectSlug: chosen,
        type: questionType,
        prompt: String(form.get('prompt') ?? ''),
        promptBn: String(form.get('promptBn') ?? ''),
        unit: String(form.get('unit') ?? ''),
        marks: Number(form.get('marks') ?? 1),
        session: String(form.get('session') ?? ''),
        answer: String(form.get('answer') ?? ''),
        options: questionType === 'mcq' ? options : [],
        correctOptionId: questionType === 'mcq' ? String(form.get('correct') ?? '') : '',
        status: 'draft',
        tags: [],
      })
      toast.success('Question added')
      setCreating(false)
      setSubjectSlug(chosen)
      await reload(chosen)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not add question')
    } finally {
      setBusy(false)
    }
  }

  async function remove(row: AcademicQuestion) {
    try {
      await deleteAcademicQuestion(row.slug)
      toast.success('Deleted')
      await reload()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        icon={FileQuestion}
        title="Question bank"
        description={
          active
            ? `${active.code} · ${active.title}`
            : 'Pick a course first. Questions stay tied to it so phones can download only what a student needs.'
        }
        actions={
          subjectSlug ? (
            <Button className="rounded-xl" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> New question
            </Button>
          ) : null
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!subjectSlug ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {query.trim()
              ? `${subjectOptions.length} matching courses`
              : `Search to find a course. Showing ${Math.min(24, subjects.length)} of ${subjects.length}.`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {subjectOptions.slice(0, query.trim() ? 48 : 24).map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => {
                setSubjectSlug(s.slug)
                void reload(s.slug)
              }}
              className="rounded-2xl border border-border/70 bg-card p-4 text-left transition hover:border-brand/30"
            >
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{s.code}</p>
              <p className="mt-1 font-semibold">{s.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.departmentId} · year {s.yearId}</p>
            </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <Button variant="outline" className="w-fit rounded-xl" onClick={() => setSubjectSlug('')}>
            Change course
          </Button>
          {!filteredQuestions ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-brand" /> Loading questions…
            </div>
          ) : filteredQuestions.length === 0 ? (
            <EmptyState
              icon={FileQuestion}
              title="No questions for this course"
              description="The app does not ship a question bank yet. Add the first question here."
              action={
                <Button className="rounded-xl" onClick={() => setCreating(true)}>
                  <Plus className="size-4" /> New question
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {filteredQuestions.map((row) => (
                <Card key={row.slug} className="rounded-2xl border-border/70">
                  <CardContent className="flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge variant="secondary">{row.type}</Badge>
                        <Badge variant="outline">{row.marks} marks</Badge>
                        {row.session ? <Badge variant="outline">{row.session}</Badge> : null}
                        {row.unit ? <Badge variant="outline">Unit {row.unit}</Badge> : null}
                      </div>
                      <p className="text-sm leading-relaxed">{row.prompt}</p>
                      {row.promptBn ? <p className="mt-1 text-sm text-muted-foreground">{row.promptBn}</p> : null}
                    </div>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => void remove(row)} aria-label="Delete">
                      <Trash2 className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <AppModal open={creating} onOpenChange={setCreating} size="lg">
        <AppModalForm onSubmit={(e) => void create(e)}>
          <AppModalHeader>
            <DialogTitle>New question</DialogTitle>
            <DialogDescription>{active ? active.title : 'Choose a course'}</DialogDescription>
          </AppModalHeader>
          <AppModalBody className="space-y-3">
            <input type="hidden" name="subjectSlug" value={subjectSlug} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="type">Type</Label>
                <NativeSelect id="type" name="type" value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
                  <option value="mcq">MCQ</option>
                  <option value="short">Short</option>
                  <option value="broad">Broad</option>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="marks">Marks</Label>
                <Input id="marks" name="marks" type="number" defaultValue={1} min={0} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="session">Session</Label>
                <Input id="session" name="session" placeholder="2024" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" name="unit" placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea id="prompt" name="prompt" required rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promptBn">Bangla prompt</Label>
              <Textarea id="promptBn" name="promptBn" rows={2} />
            </div>
            {type === 'mcq' ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {['a', 'b', 'c', 'd'].map((id) => (
                  <div key={id} className="space-y-1.5">
                    <Label htmlFor={`opt-${id}`}>Option {id.toUpperCase()}</Label>
                    <Input id={`opt-${id}`} name={`opt-${id}`} />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label htmlFor="correct">Correct option</Label>
                  <NativeSelect id="correct" name="correct" defaultValue="a">
                    {['a', 'b', 'c', 'd'].map((id) => (
                      <option key={id} value={id}>{id.toUpperCase()}</option>
                    ))}
                  </NativeSelect>
                </div>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="answer">Answer / solution</Label>
              <Textarea id="answer" name="answer" rows={3} />
            </div>
          </AppModalBody>
          <AppModalFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Add question
            </Button>
          </AppModalFooter>
        </AppModalForm>
      </AppModal>
    </div>
  )
}
