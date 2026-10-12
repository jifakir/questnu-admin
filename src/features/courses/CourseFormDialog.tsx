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
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import type { Course, CourseLevel, CourseStatus } from '@/types'

const LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced', 'mixed']
const STATUSES: CourseStatus[] = ['draft', 'published']

type FormState = {
  title: string
  code: string
  subtitle: string
  description: string
  language: string
  level: CourseLevel
  status: CourseStatus
  estimatedHours: string
  learningOutcomes: string
  prerequisites: string
  targetAudience: string
  tags: string
}

function buildInitial(c?: Partial<Course>): FormState {
  return {
    title: c?.title ?? '',
    code: c?.code ?? '',
    subtitle: c?.subtitle ?? '',
    description: c?.description ?? '',
    language: c?.language ?? 'English',
    level: (c?.level as CourseLevel) ?? 'mixed',
    status: (c?.status as CourseStatus) ?? 'draft',
    estimatedHours:
      typeof c?.estimatedHours === 'number' ? String(c.estimatedHours) : '',
    learningOutcomes: c?.learningOutcomes ?? '',
    prerequisites: c?.prerequisites ?? '',
    targetAudience: c?.targetAudience ?? '',
    tags: (c?.tags ?? []).join(', '),
  }
}

export function CourseFormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  submitLabel: string
  initial?: Partial<Course>
  onSubmit: (payload: Partial<Course> & { title: string }) => Promise<void>
}) {
  const [state, setState] = useState<FormState>(buildInitial(initial))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setState(buildInitial(initial))
  }, [open, initial])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!state.title.trim()) {
      toast.error('Title is required')
      return
    }
    const tags = state.tags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const estimatedHours = state.estimatedHours.trim()
      ? Number(state.estimatedHours)
      : undefined
    setBusy(true)
    try {
      await onSubmit({
        title: state.title.trim(),
        code: state.code.trim() || undefined,
        subtitle: state.subtitle.trim() || undefined,
        description: state.description.trim() || undefined,
        language: state.language.trim() || undefined,
        level: state.level,
        status: state.status,
        estimatedHours,
        learningOutcomes: state.learningOutcomes.trim() || undefined,
        prerequisites: state.prerequisites.trim() || undefined,
        targetAudience: state.targetAudience.trim() || undefined,
        tags,
      })
      onOpenChange(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppModal open={open} onOpenChange={onOpenChange} size="lg">
      <AppModalHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Catalog metadata for the course. You can add modules, lessons, and
          resources after creation.
        </DialogDescription>
      </AppModalHeader>
      <AppModalForm onSubmit={handleSubmit}>
        <AppModalBody>
          <div className="grid gap-3 md:grid-cols-3">
            <Field
              label="Title"
              required
              className="md:col-span-2"
              value={state.title}
              onChange={(v) => update('title', v)}
              placeholder="e.g. Intermediate IELTS Writing"
            />
            <Field
              label="Code"
              value={state.code}
              onChange={(v) => update('code', v)}
              placeholder="ENG-201"
            />
            <Field
              label="Subtitle"
              className="md:col-span-3"
              value={state.subtitle}
              onChange={(v) => update('subtitle', v)}
              placeholder="One-line course tagline"
            />
            <div className="md:col-span-3">
              <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Description
              </Label>
              <Textarea
                value={state.description}
                onChange={(e) => update('description', e.target.value)}
                rows={3}
                className="mt-1 rounded-xl"
                placeholder="Overview of what students learn and why."
              />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Level
              </Label>
              <NativeSelect
                value={state.level}
                onChange={(e) =>
                  update('level', e.target.value as CourseLevel)
                }
                className="mt-1 h-10 rounded-xl bg-background capitalize"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Field
              label="Language"
              value={state.language}
              onChange={(v) => update('language', v)}
            />
            <Field
              label="Estimated hours"
              type="number"
              value={state.estimatedHours}
              onChange={(v) => update('estimatedHours', v)}
              placeholder="e.g. 12"
            />
            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Status
              </Label>
              <NativeSelect
                value={state.status}
                onChange={(e) =>
                  update('status', e.target.value as CourseStatus)
                }
                className="mt-1 h-10 rounded-xl bg-background capitalize"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Field
              label="Tags"
              className="md:col-span-2"
              value={state.tags}
              onChange={(v) => update('tags', v)}
              placeholder="comma, separated, tags"
            />
            <div className="md:col-span-3">
              <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Learning outcomes
              </Label>
              <Textarea
                value={state.learningOutcomes}
                onChange={(e) => update('learningOutcomes', e.target.value)}
                rows={3}
                className="mt-1 rounded-xl"
                placeholder="What students will be able to do after this course."
              />
            </div>
            <div className="md:col-span-3">
              <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Prerequisites
              </Label>
              <Textarea
                value={state.prerequisites}
                onChange={(e) => update('prerequisites', e.target.value)}
                rows={2}
                className="mt-1 rounded-xl"
                placeholder="Skills, materials, or prior courses required."
              />
            </div>
            <div className="md:col-span-3">
              <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Target audience
              </Label>
              <Textarea
                value={state.targetAudience}
                onChange={(e) => update('targetAudience', e.target.value)}
                rows={2}
                className="mt-1 rounded-xl"
                placeholder="Who is this course best for?"
              />
            </div>
          </div>
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
            {submitLabel}
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
  required,
  placeholder,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  placeholder?: string
  className?: string
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 rounded-xl"
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}
