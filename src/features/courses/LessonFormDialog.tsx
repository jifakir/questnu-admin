import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalForm,
  AppModalHeader,
} from '@/components/ui/app-modal'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Lesson, LessonKind, LessonWritePayload } from '@/types'

const KINDS: { value: LessonKind; label: string; desc: string }[] = [
  {
    value: 'live_class',
    label: 'Live class',
    desc: 'Synchronous session with a meeting link.',
  },
  {
    value: 'video_class',
    label: 'Video class',
    desc: 'Pre-recorded video lesson.',
  },
  {
    value: 'exam',
    label: 'Exam',
    desc: 'Assessment with instructions and an optional due date.',
  },
]

function toLocalInput(value: string | undefined | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function fromLocalInput(value: string): string | null | undefined {
  if (!value) return null
  return new Date(value).toISOString()
}

export function LessonFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Lesson
  onSubmit: (data: LessonWritePayload) => Promise<void>
}) {
  const [kind, setKind] = useState<LessonKind>('live_class')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [meetingProvider, setMeetingProvider] = useState('')
  const [studentPreparation, setStudentPreparation] = useState('')

  const [videoUrl, setVideoUrl] = useState('')
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState('')
  const [videoDurationSeconds, setVideoDurationSeconds] = useState('')

  const [examInstructions, setExamInstructions] = useState('')
  const [examDurationMinutes, setExamDurationMinutes] = useState('')
  const [examDueAt, setExamDueAt] = useState('')
  const [examAiEvaluation, setExamAiEvaluation] = useState(false)

  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setKind(initial.kind)
      setTitle(initial.title)
      setDescription(initial.description ?? '')
      setScheduledAt(toLocalInput(initial.scheduledAt))
      setDurationMinutes(
        typeof initial.durationMinutes === 'number'
          ? String(initial.durationMinutes)
          : '',
      )
      setMeetingUrl(initial.meetingUrl ?? '')
      setMeetingProvider(initial.meetingProvider ?? '')
      setStudentPreparation(initial.studentPreparation ?? '')

      setVideoUrl(initial.videoUrl ?? '')
      setVideoThumbnailUrl(initial.videoThumbnailUrl ?? '')
      setVideoDurationSeconds(
        typeof initial.videoDurationSeconds === 'number'
          ? String(initial.videoDurationSeconds)
          : '',
      )

      setExamInstructions(initial.examInstructions ?? '')
      setExamDurationMinutes(
        typeof initial.examDurationMinutes === 'number'
          ? String(initial.examDurationMinutes)
          : '',
      )
      setExamDueAt(toLocalInput(initial.examDueAt))
      setExamAiEvaluation(!!initial.examAiEvaluation)
    } else {
      setKind('live_class')
      setTitle('')
      setDescription('')
      setScheduledAt('')
      setDurationMinutes('60')
      setMeetingUrl('')
      setMeetingProvider('')
      setStudentPreparation('')
      setVideoUrl('')
      setVideoThumbnailUrl('')
      setVideoDurationSeconds('')
      setExamInstructions('')
      setExamDurationMinutes('')
      setExamDueAt('')
      setExamAiEvaluation(false)
    }
  }, [open, initial])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    const payload: LessonWritePayload = {
      kind,
      title: title.trim(),
      description: description.trim() || undefined,
    }
    if (kind === 'live_class') {
      payload.scheduledAt = fromLocalInput(scheduledAt) ?? null
      if (durationMinutes) payload.durationMinutes = Number(durationMinutes)
      if (meetingUrl) payload.meetingUrl = meetingUrl.trim()
      if (meetingProvider) payload.meetingProvider = meetingProvider.trim()
      if (studentPreparation)
        payload.studentPreparation = studentPreparation.trim()
    } else if (kind === 'video_class') {
      if (videoUrl) payload.videoUrl = videoUrl.trim()
      if (videoThumbnailUrl) payload.videoThumbnailUrl = videoThumbnailUrl.trim()
      if (videoDurationSeconds)
        payload.videoDurationSeconds = Number(videoDurationSeconds)
      if (durationMinutes) payload.durationMinutes = Number(durationMinutes)
    } else if (kind === 'exam') {
      if (examInstructions) payload.examInstructions = examInstructions.trim()
      if (examDurationMinutes)
        payload.examDurationMinutes = Number(examDurationMinutes)
      payload.examDueAt = fromLocalInput(examDueAt) ?? null
      payload.examAiEvaluation = examAiEvaluation
    }

    setBusy(true)
    try {
      await onSubmit(payload)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const isEdit = !!initial

  return (
    <AppModal open={open} onOpenChange={onOpenChange} size="lg">
      <AppModalHeader>
        <DialogTitle>{isEdit ? 'Edit lesson' : 'Add lesson'}</DialogTitle>
        <DialogDescription>
          One lesson model — kind controls the fields shown below.
        </DialogDescription>
      </AppModalHeader>
      <AppModalForm onSubmit={submit}>
        <AppModalBody className="flex flex-col gap-4">
          {!isEdit ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {KINDS.map((k) => (
                <button
                  type="button"
                  key={k.value}
                  onClick={() => setKind(k.value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    kind === k.value
                      ? 'border-brand bg-brand-soft text-brand'
                      : 'border-border/70 hover:border-brand/40'
                  }`}
                >
                  <p className="text-sm font-semibold">{k.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {k.desc}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Lesson kind: <strong className="text-foreground">{kind}</strong>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 h-10 rounded-xl"
              placeholder="Lesson title"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 rounded-xl"
              placeholder="What students will learn or do."
            />
          </div>

          {kind === 'live_class' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Scheduled at"
                type="datetime-local"
                value={scheduledAt}
                onChange={setScheduledAt}
              />
              <Field
                label="Duration (min)"
                type="number"
                value={durationMinutes}
                onChange={setDurationMinutes}
                placeholder="60"
              />
              <Field
                label="Meeting URL"
                value={meetingUrl}
                onChange={setMeetingUrl}
                placeholder="https://zoom.us/j/..."
                className="sm:col-span-2"
              />
              <Field
                label="Meeting provider"
                value={meetingProvider}
                onChange={setMeetingProvider}
                placeholder="zoom | meet | teams | other"
              />
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Student preparation
                </Label>
                <Textarea
                  value={studentPreparation}
                  onChange={(e) => setStudentPreparation(e.target.value)}
                  rows={2}
                  className="mt-1 rounded-xl"
                  placeholder="What to do before class (reading, materials)."
                />
              </div>
            </div>
          ) : null}

          {kind === 'video_class' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Video URL"
                value={videoUrl}
                onChange={setVideoUrl}
                placeholder="https://..."
                className="sm:col-span-2"
              />
              <Field
                label="Thumbnail URL"
                value={videoThumbnailUrl}
                onChange={setVideoThumbnailUrl}
                placeholder="https://..."
                className="sm:col-span-2"
              />
              <Field
                label="Length (minutes)"
                type="number"
                value={durationMinutes}
                onChange={setDurationMinutes}
                placeholder="45"
              />
              <Field
                label="Length (seconds, precise)"
                type="number"
                value={videoDurationSeconds}
                onChange={setVideoDurationSeconds}
                placeholder="2700"
              />
            </div>
          ) : null}

          {kind === 'exam' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Instructions
                </Label>
                <Textarea
                  value={examInstructions}
                  onChange={(e) => setExamInstructions(e.target.value)}
                  rows={4}
                  className="mt-1 rounded-xl"
                  placeholder="Materials, rubric, what students submit."
                />
              </div>
              <Field
                label="Duration (minutes)"
                type="number"
                value={examDurationMinutes}
                onChange={setExamDurationMinutes}
                placeholder="90"
              />
              <Field
                label="Due at"
                type="datetime-local"
                value={examDueAt}
                onChange={setExamDueAt}
              />
              <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={examAiEvaluation}
                  onChange={(e) => setExamAiEvaluation(e.target.checked)}
                  className="size-4 rounded border-border accent-brand"
                />
                Enable AI exam evaluation (Gemini Vision) for handwritten submissions
              </label>
            </div>
          ) : null}

        </AppModalBody>
        <AppModalFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="submit" className="rounded-xl" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEdit ? 'Save lesson' : 'Add lesson'}
          </Button>
        </AppModalFooter>
      </AppModalForm>
    </AppModal>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  className?: string
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 rounded-xl"
        placeholder={placeholder}
      />
    </div>
  )
}
