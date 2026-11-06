import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
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
import { blogImageUrl, uploadBlogImage } from '@/api'
import type { BlogAuthor, BlogAuthorWritePayload } from '@/types'
import { AUTHOR_LIMITS, authorInitials, validateBlogImage } from './blogUtils'

type FormState = {
  name: string
  designation: string
  bio: string
  avatar: string | null
}

type TextKey = Exclude<keyof FormState, 'avatar'>

function buildInitial(a?: BlogAuthor | null): FormState {
  return {
    name: a?.name ?? '',
    designation: a?.designation ?? '',
    bio: a?.bio ?? '',
    avatar: a?.avatar ?? null,
  }
}

const LABELS: Record<TextKey, string> = {
  name: 'Name',
  designation: 'Designation',
  bio: 'Bio',
}

function validate(s: FormState): string | null {
  if (!s.name.trim()) return 'Name is required'
  for (const key of Object.keys(LABELS) as TextKey[]) {
    if (s[key].trim().length > AUTHOR_LIMITS[key])
      return `${LABELS[key]} must be ${AUTHOR_LIMITS[key]} characters or fewer`
  }
  return null
}

/**
 * Only the keys the API accepts. On edit, '' clears a text field and null
 * clears the photo; on create, empty optional fields are simply omitted.
 */
function toPayload(s: FormState, isEdit: boolean): BlogAuthorWritePayload {
  const payload: BlogAuthorWritePayload = { name: s.name.trim() }
  for (const key of ['designation', 'bio'] as const) {
    const v = s[key].trim()
    if (v || isEdit) payload[key] = v
  }
  if (s.avatar || isEdit) payload.avatar = s.avatar
  return payload
}

const labelCls = 'text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground'

export function BlogAuthorFormDialog({
  open,
  onOpenChange,
  author,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  /**
   * Author being edited; null/undefined creates a new one. The form reads it
   * on mount, so give the dialog a fresh `key` each time it is opened.
   */
  author?: BlogAuthor | null
  onSubmit: (payload: BlogAuthorWritePayload) => Promise<void>
}) {
  const [state, setState] = useState<FormState>(() => buildInitial(author))
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const isEdit = !!author

  function update(key: TextKey, value: string) {
    setState((s) => ({ ...s, [key]: value }))
  }

  async function onPhotoPicked(file: File | undefined) {
    if (!file) return
    const problem = validateBlogImage(file)
    if (problem) {
      toast.error(problem)
      return
    }
    setUploading(true)
    try {
      const res = await uploadBlogImage(file)
      setState((s) => ({ ...s, avatar: res.file }))
    } catch (e: unknown) {
      toast.error('Photo upload failed', {
        description: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const problem = validate(state)
    if (problem) {
      toast.error(problem)
      return
    }
    setBusy(true)
    try {
      await onSubmit(toPayload(state, isEdit))
      onOpenChange(false)
    } catch (err: unknown) {
      toast.error('Could not save author', {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppModal open={open} onOpenChange={(v) => !busy && onOpenChange(v)} size="lg">
      <AppModalHeader>
        <DialogTitle>{isEdit ? 'Edit author' : 'New author'}</DialogTitle>
        <DialogDescription>
          Shown on blog posts written by this person, on both the Bangla and English site.
        </DialogDescription>
      </AppModalHeader>
      <AppModalForm onSubmit={handleSubmit}>
        <AppModalBody>
          <div className="grid gap-4">
            <div className="flex items-center gap-4">
              {state.avatar ? (
                <div className="relative">
                  <img
                    src={blogImageUrl(state.avatar)}
                    alt="Author photo"
                    className="size-20 rounded-full border border-border/70 object-cover"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute -right-1 -top-1 size-6 rounded-full shadow"
                    onClick={() => setState((s) => ({ ...s, avatar: null }))}
                    aria-label="Remove photo"
                    title="Remove photo"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <span className="flex size-20 items-center justify-center rounded-full border border-dashed border-border/70 bg-muted/40 text-lg font-semibold text-muted-foreground">
                  {state.name.trim() ? authorInitials(state) : '?'}
                </span>
              )}
              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit rounded-xl"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                  {state.avatar ? 'Replace photo' : 'Upload photo'}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Square image works best · JPEG, PNG, WebP or GIF · max 5 MB
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    void onPhotoPicked(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field
                id="author-name"
                label="Name"
                required
                value={state.name}
                maxLength={AUTHOR_LIMITS.name}
                onChange={(v) => update('name', v)}
                placeholder="e.g. Maliha Hasan"
              />
              <Field
                id="author-designation"
                label="Designation"
                value={state.designation}
                maxLength={AUTHOR_LIMITS.designation}
                onChange={(v) => update('designation', v)}
                placeholder="e.g. Lecturer, Dept. of English"
              />
            </div>
            <BioField
              id="author-bio"
              label="Bio"
              value={state.bio}
              max={AUTHOR_LIMITS.bio}
              onChange={(v) => update('bio', v)}
            />
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
          <Button type="submit" className="rounded-xl" disabled={busy || uploading}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEdit ? 'Save changes' : 'Create author'}
          </Button>
        </AppModalFooter>
      </AppModalForm>
    </AppModal>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  lang,
  maxLength,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  lang?: string
  maxLength?: number
  placeholder?: string
}) {
  return (
    <div>
      <Label htmlFor={id} className={labelCls}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      <Input
        id={id}
        lang={lang}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 rounded-xl"
        placeholder={placeholder}
      />
    </div>
  )
}

function BioField({
  id,
  label,
  value,
  onChange,
  lang,
  max,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  lang?: string
  max: number
}) {
  const len = value.trim().length
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className={labelCls}>
          {label}
        </Label>
        <span
          className={
            len > max
              ? 'text-xs text-destructive tabular-nums'
              : 'text-xs text-muted-foreground tabular-nums'
          }
        >
          {len}/{max}
        </span>
      </div>
      <Textarea
        id={id}
        lang={lang}
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="mt-1 rounded-xl font-sans"
      />
    </div>
  )
}
