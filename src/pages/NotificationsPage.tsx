import { useCallback, useEffect, useState } from 'react'
import { Bell, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  createAdminNotification,
  deleteAdminNotification,
  fetchAdminNotifications,
  publishAdminNotification,
} from '@/api'
import { formatDateTime } from '@/lib/format'
import type { AppNotification } from '@/types'

const EMPTY_FORM = { title: '', body: '', titleBn: '', bodyBn: '' }

export function NotificationsPage() {
  const [rows, setRows] = useState<AppNotification[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    try {
      setRows(await fetchAdminNotifications())
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load notifications')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const reportPush = (n: AppNotification) => {
    if (n.status !== 'published') return
    if (n.pushError) {
      toast.error('Saved, but the push failed', { description: n.pushError })
    } else {
      toast.success('Published and sent to all app users')
    }
  }

  const submit = async (publish: boolean) => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and message are required')
      return
    }
    setSaving(true)
    try {
      const n = await createAdminNotification({
        title: form.title.trim(),
        body: form.body.trim(),
        titleBn: form.titleBn.trim() || undefined,
        bodyBn: form.bodyBn.trim() || undefined,
        publish,
      })
      if (publish) reportPush(n)
      else toast.success('Draft saved')
      setForm(EMPTY_FORM)
      await load()
    } catch (e: unknown) {
      toast.error('Could not save', {
        description: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setSaving(false)
    }
  }

  const publish = async (n: AppNotification) => {
    const again = n.status === 'published'
    if (again && !window.confirm('Send this push to all users again?')) return
    setBusyId(n.id)
    try {
      reportPush(await publishAdminNotification(n.id))
      await load()
    } catch (e: unknown) {
      toast.error('Publish failed', {
        description: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (n: AppNotification) => {
    if (!window.confirm(`Delete “${n.title}”? It will disappear from the app.`)) return
    setBusyId(n.id)
    try {
      await deleteAdminNotification(n.id)
      toast.success('Deleted')
      await load()
    } catch (e: unknown) {
      toast.error('Delete failed', {
        description: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setBusyId(null)
    }
  }

  const set = (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Bell}
        title="Notifications"
        description="Publishing sends a push notification to every QuestNU app user right away, and lists it on the app's Notices screen."
      />

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">New notification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="n-title">Title (English)</Label>
            <Input id="n-title" maxLength={120} value={form.title} onChange={set('title')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="n-title-bn">Title (Bangla, optional)</Label>
            <Input id="n-title-bn" maxLength={120} value={form.titleBn} onChange={set('titleBn')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="n-body">Message (English)</Label>
            <Textarea
              id="n-body"
              maxLength={1000}
              className="min-h-[110px] font-sans"
              value={form.body}
              onChange={set('body')}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="n-body-bn">Message (Bangla, optional)</Label>
            <Textarea
              id="n-body-bn"
              maxLength={1000}
              className="min-h-[110px] font-sans"
              value={form.bodyBn}
              onChange={set('bodyBn')}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
            <Button variant="outline" disabled={saving} onClick={() => void submit(false)}>
              Save draft
            </Button>
            <Button disabled={saving} onClick={() => void submit(true)}>
              <Send className="size-4" />
              Publish now
            </Button>
          </div>
        </CardContent>
      </Card>

      {err ? <p className="text-sm text-destructive">{err}</p> : null}

      {rows && rows.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Write one above and publish it to reach every app user."
        />
      ) : null}

      {rows && rows.length > 0 ? (
        <div className="flex flex-col gap-3">
          {rows.map((n) => (
            <Card key={n.id} className="rounded-2xl">
              <CardContent className="flex flex-wrap items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{n.title}</p>
                    {n.status === 'published' ? (
                      <Badge variant={n.pushError ? 'failed' : 'approved'}>
                        {n.pushError ? 'Published · push failed' : 'Published'}
                      </Badge>
                    ) : (
                      <Badge variant="pending">Draft</Badge>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{n.body}</p>
                  {n.pushError ? (
                    <p className="mt-1 text-xs text-destructive">{n.pushError}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {n.publishedAt
                      ? `Published ${formatDateTime(n.publishedAt)}`
                      : `Created ${formatDateTime(n.createdAt)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={n.status === 'published' ? 'outline' : 'default'}
                    disabled={busyId === n.id}
                    onClick={() => void publish(n)}
                  >
                    <Send className="size-4" />
                    {n.status === 'published' ? 'Resend' : 'Publish'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Delete"
                    disabled={busyId === n.id}
                    onClick={() => void remove(n)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}
