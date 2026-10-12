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

type Scope = {
  courseId: string
  moduleId?: string
  lessonId?: string
}

type Kind = 'link' | 'note' | 'file'
const KINDS: { value: Kind; label: string; desc: string }[] = [
  { value: 'link', label: 'Link', desc: 'External URL.' },
  { value: 'file', label: 'File', desc: 'Upload PDF, image, doc, etc.' },
  { value: 'note', label: 'Note', desc: 'Markdown / plain-text note.' },
]

export function ResourceFormDialog({
  open,
  onOpenChange,
  scope,
  onSubmitLink,
  onSubmitFile,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  scope: Scope
  onSubmitLink: (payload: {
    courseId: string
    moduleId?: string
    lessonId?: string
    kind: 'link' | 'note'
    title: string
    description?: string
    url?: string
    body?: string
  }) => Promise<void>
  onSubmitFile: (payload: {
    courseId: string
    moduleId?: string
    lessonId?: string
    title: string
    description?: string
    file: File
  }) => Promise<void>
}) {
  const [kind, setKind] = useState<Kind>('link')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setKind('link')
      setTitle('')
      setDescription('')
      setUrl('')
      setBody('')
      setFile(null)
    }
  }, [open])

  const scopeLabel = scope.lessonId
    ? 'Lesson'
    : scope.moduleId
      ? 'Module'
      : 'Course'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    setBusy(true)
    try {
      if (kind === 'file') {
        if (!file) {
          toast.error('Choose a file to upload')
          setBusy(false)
          return
        }
        await onSubmitFile({
          courseId: scope.courseId,
          moduleId: scope.moduleId,
          lessonId: scope.lessonId,
          title: title.trim(),
          description: description.trim() || undefined,
          file,
        })
      } else if (kind === 'link') {
        if (!url.trim()) {
          toast.error('URL is required for link resources')
          setBusy(false)
          return
        }
        await onSubmitLink({
          courseId: scope.courseId,
          moduleId: scope.moduleId,
          lessonId: scope.lessonId,
          kind: 'link',
          title: title.trim(),
          description: description.trim() || undefined,
          url: url.trim(),
        })
      } else {
        if (!body.trim()) {
          toast.error('Note body is required')
          setBusy(false)
          return
        }
        await onSubmitLink({
          courseId: scope.courseId,
          moduleId: scope.moduleId,
          lessonId: scope.lessonId,
          kind: 'note',
          title: title.trim(),
          description: description.trim() || undefined,
          body: body.trim(),
        })
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppModal open={open} onOpenChange={onOpenChange} size="xl">
      <AppModalHeader>
        <DialogTitle>Add resource</DialogTitle>
        <DialogDescription>
          Attached to <strong>{scopeLabel}</strong>. Resources show up in the
          student learning view.
        </DialogDescription>
      </AppModalHeader>
      <AppModalForm onSubmit={submit}>
        <AppModalBody className="flex flex-col gap-4">
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

          <div>
            <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 h-10 rounded-xl"
              placeholder="Resource title"
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
              placeholder="Optional short description."
            />
          </div>

          {kind === 'link' ? (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                URL <span className="text-destructive">*</span>
              </Label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1 h-10 rounded-xl"
                placeholder="https://..."
              />
            </div>
          ) : null}

          {kind === 'note' ? (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Body <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className="mt-1 rounded-xl"
                placeholder="Plain text or markdown."
              />
            </div>
          ) : null}

          {kind === 'file' ? (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                File <span className="text-destructive">*</span>
              </Label>
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 h-auto rounded-xl py-2"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Max 25MB. PDFs, images, docs, etc.
              </p>
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
            Add resource
          </Button>
        </AppModalFooter>
      </AppModalForm>
    </AppModal>
  )
}
