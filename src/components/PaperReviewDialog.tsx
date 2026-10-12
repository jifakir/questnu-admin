import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { fetchAuthorizedImageBlob, fetchPaper, reviewPaper } from '@/api'
import type { Paper } from '@/types'

export function PaperReviewDialog({
  paper,
  open,
  onClose,
  onUpdated,
}: {
  paper: Paper | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}) {
  const [detail, setDetail] = useState<Paper | null>(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [jsonText, setJsonText] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!paper) return
    setErr(null)
    const p = await fetchPaper(paper._id)
    setDetail(p)
    const base = p.instructorFeedback ?? p.geminiResponse
    setJsonText(JSON.stringify(base ?? {}, null, 2))
  }, [paper])

  useEffect(() => {
    if (!open || !paper) {
      setDetail(null)
      setImageIndex(0)
      setImageUrl(null)
      setJsonText('')
      setErr(null)
      return
    }
    void load()
  }, [open, paper, load])

  useEffect(() => {
    if (!detail) return
    let revoke: string | null = null
    let cancelled = false
    void (async () => {
      try {
        const url = await fetchAuthorizedImageBlob(detail._id, imageIndex)
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        revoke = url
        setImageUrl(url)
      } catch {
        if (!cancelled) setImageUrl(null)
      }
    })()
    return () => {
      cancelled = true
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [detail, imageIndex])

  const maxIdx = (detail?.imagePaths.length ?? 1) - 1

  async function submitApprove() {
    if (!detail) return
    setErr(null)
    setBusy(true)
    try {
      const feedback = JSON.parse(jsonText) as unknown
      await reviewPaper(detail._id, feedback, true)
      toast.success('Submission approved', {
        description: `Student ${detail.studentId} · ${detail.imagePaths.length} page${detail.imagePaths.length === 1 ? '' : 's'}`,
      })
      onUpdated()
      onClose()
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Invalid JSON or request failed. Check the feedback shape.'
      setErr(msg)
      toast.error('Approval failed', { description: msg })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[min(92dvh,calc(100vh-2rem))] max-h-[calc(100vh-2rem)] w-[min(1100px,calc(100vw-2rem))] max-w-none min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-none [&>button]:hidden">
        {!detail ? (
          <>
            <DialogHeader className="border-b bg-muted/40 px-6 py-4">
              <DialogTitle>Opening submission…</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-brand" />
              <p className="text-sm">Loading paper details and images</p>
            </div>
            <DialogFooter className="border-t px-6 py-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="border-b bg-muted/40 px-6 py-4 text-left sm:text-left">
              <DialogTitle>Review submission</DialogTitle>
              <DialogDescription>
                Student {detail.studentId} · {detail.imagePaths.length} page
                {detail.imagePaths.length === 1 ? '' : 's'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid min-h-0 flex-1 md:grid-cols-2">
              <div className="flex min-h-0 flex-col overflow-hidden bg-slate-950 md:min-h-[240px]">
                <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-4">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`Page ${imageIndex + 1}`}
                      className="max-h-full max-w-full rounded-lg border bg-white object-contain shadow-md"
                    />
                  ) : (
                    <span className="text-sm text-slate-400">Image unavailable</span>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-white/10 px-3 py-3 sm:px-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border border-white/20 bg-white/10 text-slate-100 hover:bg-white/20"
                    disabled={imageIndex <= 0}
                    onClick={() => setImageIndex((i) => Math.max(0, i - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border border-white/20 bg-white/10 text-slate-100 hover:bg-white/20"
                    disabled={imageIndex >= maxIdx}
                    onClick={() =>
                      setImageIndex((i) => Math.min(maxIdx, i + 1))
                    }
                  >
                    Next
                  </Button>
                  <span className="text-xs text-slate-400">
                    Page {imageIndex + 1} / {detail.imagePaths.length}
                  </span>
                </div>
              </div>

              <div className="flex min-h-0 flex-col gap-3 overflow-hidden border-t p-4 md:border-l md:border-t-0">
                <p className="text-sm text-muted-foreground">
                  Edit the AI output JSON below, then approve. The payload must
                  follow the documented schema (scores, arrays,
                  summary_feedback).
                </p>
                <Textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  spellCheck={false}
                  className="min-h-[280px] flex-1"
                />
                {err ? (
                  <p className="text-sm font-medium text-destructive">{err}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    disabled={busy || detail.status !== 'pending_review'}
                    onClick={() => void submitApprove()}
                    className="rounded-lg bg-brand-gradient font-semibold text-primary-foreground shadow-brand hover:bg-brand-gradient"
                  >
                    {busy ? 'Saving…' : 'Approve with this feedback'}
                  </Button>
                  {detail.status !== 'pending_review' ? (
                    <p className="text-sm text-muted-foreground">
                      This paper is not in{' '}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">
                        pending_review
                      </code>{' '}
                      status.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t bg-muted/30 px-6 py-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
