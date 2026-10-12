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
import { DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CourseModule, ModuleWritePayload } from '@/types'

export function ModuleFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: CourseModule
  onSubmit: (data: ModuleWritePayload) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? '')
      setDescription(initial?.description ?? '')
    }
  }, [open, initial])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    setBusy(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
      })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppModal open={open} onOpenChange={onOpenChange} size="md">
      <AppModalHeader>
        <DialogTitle>{initial ? 'Edit module' : 'Add module'}</DialogTitle>
      </AppModalHeader>
      <AppModalForm onSubmit={submit}>
        <AppModalBody className="space-y-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 h-10 rounded-xl"
              placeholder="e.g. Week 1 — Writing fundamentals"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 rounded-xl"
              placeholder="What this module covers (optional)."
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
          <Button type="submit" className="rounded-xl" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {initial ? 'Save module' : 'Add module'}
          </Button>
        </AppModalFooter>
      </AppModalForm>
    </AppModal>
  )
}
