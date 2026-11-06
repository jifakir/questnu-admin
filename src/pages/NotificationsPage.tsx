import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { DataTable, type Column } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { AudiencePicker } from '@/components/NotificationAudience'
import { audienceSummary, isTargeted, useAcademicLists } from '@/lib/notificationAudience'
import { PageHeader } from '@/components/PageHeader'
import { PageToolbar } from '@/components/PageToolbar'
import {
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
} from '@/components/ui/app-modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import {
  createAdminNotification,
  deleteAdminNotification,
  fetchAdminNotifications,
  publishAdminNotification,
  updateAdminNotification,
} from '@/api'
import { formatDateTime } from '@/lib/format'
import type {
  AdminNotificationPage,
  AppNotification,
  NotificationCategory,
} from '@/types'

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  general: 'General notice',
  nu: 'NU important notice',
}

const PAGE_SIZES = [10, 20, 50] as const
const DEFAULT_PAGE_SIZE = 20

type StatusFilter = '' | AppNotification['status']
type CategoryFilter = '' | NotificationCategory

function errorText(e: unknown) {
  return e instanceof Error ? e.message : String(e)
}

/** Toast for the result of a publish: the push can fail even when the save worked. */
/** "all app users", or the picked students, for toasts and confirms. */
function recipients(n: AppNotification, lists: ReturnType<typeof useAcademicLists>) {
  return isTargeted(n) ? `students in ${audienceSummary(n, lists)}` : 'all app users'
}

function reportPush(n: AppNotification, success: string) {
  if (n.status !== 'published') return
  if (n.pushError) {
    toast.error('Saved, but the push failed', { description: n.pushError })
  } else {
    toast.success(success)
  }
}

export function NotificationsPage() {
  const lists = useAcademicLists()
  // Filters and page live in the URL, so a refresh or shared link keeps them.
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const limitParam = Number(params.get('limit'))
  const limit = (PAGE_SIZES as readonly number[]).includes(limitParam)
    ? limitParam
    : DEFAULT_PAGE_SIZE
  const status = (params.get('status') ?? '') as StatusFilter
  const category = (params.get('category') ?? '') as CategoryFilter
  const q = params.get('q') ?? ''

  const [searchInput, setSearchInput] = useState(q)
  const [data, setData] = useState<AdminNotificationPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadedAt, setLoadedAt] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  /** null = closed, 'new' = composing, otherwise the notification being edited. */
  const [modal, setModal] = useState<'new' | AppNotification | null>(null)

  const updateParams = useCallback(
    (changes: Record<string, string | number | null>, resetPage = true) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === '') next.delete(key)
            else next.set(key, String(value))
          }
          if (resetPage) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  // Search as the admin types, after a short pause.
  useEffect(() => {
    if (searchInput.trim() === q) return
    const t = window.setTimeout(() => updateParams({ q: searchInput.trim() }), 350)
    return () => window.clearTimeout(t)
  }, [searchInput, q, updateParams])

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      setErr(null)
      try {
        const result = await fetchAdminNotifications({
          page,
          limit,
          status: status || undefined,
          category: category || undefined,
          q: q || undefined,
        })
        setData(result)
        setLoadedAt(Date.now())
      } catch (e: unknown) {
        setErr(errorText(e) || 'Failed to load notifications')
        if (silent) toast.error('Refresh failed', { description: errorText(e) })
      } finally {
        setLoading(false)
      }
    },
    [page, limit, status, category, q],
  )

  useEffect(() => {
    void load()
  }, [load])

  const publish = useCallback(
    async (n: AppNotification) => {
      const again = n.status === 'published'
      if (again && !window.confirm(`Send this push to ${recipients(n, lists)} again?`)) return
      setBusyId(n.id)
      try {
        reportPush(
          await publishAdminNotification(n.id),
          again ? `Resent to ${recipients(n, lists)}` : `Published and sent to ${recipients(n, lists)}`,
        )
        await load(true)
      } catch (e: unknown) {
        toast.error('Publish failed', { description: errorText(e) })
      } finally {
        setBusyId(null)
      }
    },
    [load, lists],
  )

  const remove = useCallback(
    async (n: AppNotification) => {
      if (!window.confirm(`Delete “${n.title}”? It will disappear from the app.`)) return
      setBusyId(n.id)
      try {
        await deleteAdminNotification(n.id)
        toast.success('Deleted')
        await load(true)
      } catch (e: unknown) {
        toast.error('Delete failed', { description: errorText(e) })
      } finally {
        setBusyId(null)
      }
    },
    [load],
  )

  const columns: Column<AppNotification>[] = useMemo(
    () => [
      {
        key: 'notification',
        header: 'Notification',
        className: 'max-w-[420px]',
        cell: (n) => (
          <div className="min-w-0">
            <p className="line-clamp-1 font-semibold">{n.title}</p>
            <p className="line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">
              {n.body}
            </p>
            {n.pushError ? (
              <p className="mt-1 line-clamp-1 text-xs text-destructive">{n.pushError}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        cell: (n) => (
          <Badge variant={n.category === 'nu' ? 'processing' : 'secondary'}>
            {n.category === 'nu' ? 'NU important' : 'General'}
          </Badge>
        ),
      },
      {
        key: 'audience',
        header: 'Audience',
        className: 'max-w-[220px]',
        cell: (n) => (
          <span
            className={
              isTargeted(n)
                ? 'line-clamp-2 text-xs font-medium'
                : 'text-xs text-muted-foreground'
            }
          >
            {audienceSummary(n, lists)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (n) => (
          <div className="flex flex-wrap gap-1.5">
            {n.status === 'published' ? (
              <Badge variant={n.pushError ? 'failed' : 'approved'}>
                {n.pushError ? 'Push failed' : 'Published'}
              </Badge>
            ) : (
              <Badge variant="pending">Draft</Badge>
            )}
            {n.editedAt ? <Badge variant="outline">Edited</Badge> : null}
          </div>
        ),
      },
      {
        key: 'date',
        header: 'Date',
        cell: (n) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {n.publishedAt
              ? formatDateTime(n.publishedAt)
              : `Created ${formatDateTime(n.createdAt)}`}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        align: 'right',
        cell: (n) => (
          <div
            className="flex justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="ghost"
              aria-label="Edit"
              title="Edit"
              disabled={busyId === n.id}
              onClick={() => setModal(n)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="sm"
              variant={n.status === 'published' ? 'ghost' : 'outline'}
              title={n.status === 'published' ? 'Resend push' : 'Publish and send'}
              disabled={busyId === n.id}
              onClick={() => void publish(n)}
            >
              <Send className="size-4" />
              <span className="hidden lg:inline">
                {n.status === 'published' ? 'Resend' : 'Publish'}
              </span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Delete"
              title="Delete"
              className="text-muted-foreground hover:text-destructive"
              disabled={busyId === n.id}
              onClick={() => void remove(n)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [busyId, publish, remove, lists],
  )

  const filtered = Boolean(status || category || q)
  const total = data?.total ?? 0
  const currentPage = data?.page ?? page
  const pages = data?.pages ?? 1
  const from = total === 0 ? 0 : (currentPage - 1) * limit + 1
  const to = Math.min(currentPage * limit, total)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Bell}
        title="Notifications"
        description="Published notifications are pushed to every QuestNU app user and listed in the app by category."
        actions={
          <Button onClick={() => setModal('new')}>
            <Send className="size-4" />
            Send Notification
          </Button>
        }
      />

      <PageToolbar
        left={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search title or message"
                aria-label="Search notifications"
                className="h-8 rounded-full pl-8 pr-8 text-sm"
              />
              {searchInput ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchInput('')}
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
            <NativeSelect
              shape="pill"
              aria-label="Filter by status"
              value={status}
              onChange={(e) => updateParams({ status: e.target.value })}
            >
              <option value="">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
            </NativeSelect>
            <NativeSelect
              shape="pill"
              aria-label="Filter by category"
              value={category}
              onChange={(e) => updateParams({ category: e.target.value })}
            >
              <option value="">All categories</option>
              <option value="general">General notices</option>
              <option value="nu">NU important notices</option>
            </NativeSelect>
            {filtered ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-full text-xs"
                onClick={() => {
                  setSearchInput('')
                  updateParams({ status: null, category: null, q: null })
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </>
        }
        loadedAt={loadedAt}
        loading={loading}
        onRefresh={() => void load(true)}
      />

      {err ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
          {err}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <DataTable<AppNotification>
          data={data?.items ?? null}
          loading={loading && !data}
          columns={columns}
          rowKey={(n) => n.id}
          onRowClick={(n) => setModal(n)}
          // One server page at a time; the pager below moves between pages.
          pageSize={limit}
          emptyState={
            filtered ? (
              <EmptyState
                icon={Search}
                title="No matches"
                description="No notifications match these filters. Try another search or clear the filters."
              />
            ) : (
              <EmptyState
                icon={Bell}
                title="No notifications yet"
                description="Send your first notification to reach every app user."
                action={
                  <Button onClick={() => setModal('new')}>
                    <Send className="size-4" />
                    Send Notification
                  </Button>
                }
              />
            )
          }
        />

        {data && total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
            <span>
              Showing <span className="font-semibold text-foreground">{from}</span>–
              <span className="font-semibold text-foreground">{to}</span> of{' '}
              <span className="font-semibold text-foreground">{total}</span>
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                Rows per page
                <NativeSelect
                  shape="pill"
                  className="min-w-0"
                  value={String(limit)}
                  onChange={(e) => updateParams({ limit: Number(e.target.value) })}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-full"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => updateParams({ page: currentPage - 1 }, false)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-20 text-center font-medium">
                  Page {currentPage} of {pages}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-full"
                  disabled={currentPage >= pages || loading}
                  onClick={() => updateParams({ page: currentPage + 1 }, false)}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <NotificationFormModal
        target={modal}
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null)
          void load(true)
        }}
      />
    </div>
  )
}

const EMPTY_FORM = {
  title: '',
  body: '',
  titleBn: '',
  bodyBn: '',
  category: 'general' as NotificationCategory,
  targetYears: [] as string[],
  targetDepartments: [] as string[],
}

type TextField = 'title' | 'body' | 'titleBn' | 'bodyBn'

/** Compose a new notification, or edit one ([target] is the notification). */
function NotificationFormModal({
  target,
  onClose,
  onSaved,
}: {
  target: 'new' | AppNotification | null
  onClose: () => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  return (
    <AppModal
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !saving) onClose()
      }}
      size="lg"
    >
      {target ? (
        // A new key per opening gives the form fresh state each time.
        <NotificationForm
          key={target === 'new' ? 'new' : target.id}
          editing={target === 'new' ? null : target}
          saving={saving}
          setSaving={setSaving}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </AppModal>
  )
}

function NotificationForm({
  editing,
  saving,
  setSaving,
  onClose,
  onSaved,
}: {
  editing: AppNotification | null
  saving: boolean
  setSaving: (saving: boolean) => void
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState(() =>
    editing
      ? {
          title: editing.title,
          body: editing.body,
          titleBn: editing.titleBn ?? '',
          bodyBn: editing.bodyBn ?? '',
          category: editing.category ?? 'general',
          targetYears: editing.targetYears ?? [],
          targetDepartments: editing.targetDepartments ?? [],
        }
      : EMPTY_FORM,
  )

  const set = (key: TextField) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const valid = form.title.trim() !== '' && form.body.trim() !== ''
  const lists = useAcademicLists()
  const who = isTargeted(form) ? 'the selected students' : 'every app user'

  const save = async (publish: boolean) => {
    if (!valid) {
      toast.error('Title and message are required')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const n = await updateAdminNotification(editing.id, {
          title: form.title.trim(),
          body: form.body.trim(),
          // Empty strings clear the Bangla text.
          titleBn: form.titleBn.trim(),
          bodyBn: form.bodyBn.trim(),
          category: form.category,
          targetYears: form.targetYears,
          targetDepartments: form.targetDepartments,
        })
        if (n.status === 'published') reportPush(n, `Updated and resent to ${recipients(n, lists)}`)
        else toast.success('Draft updated')
      } else {
        const n = await createAdminNotification({
          title: form.title.trim(),
          body: form.body.trim(),
          titleBn: form.titleBn.trim() || undefined,
          bodyBn: form.bodyBn.trim() || undefined,
          category: form.category,
          targetYears: form.targetYears,
          targetDepartments: form.targetDepartments,
          publish,
        })
        if (publish) reportPush(n, `Published and sent to ${recipients(n, lists)}`)
        else toast.success('Draft saved')
      }
      onSaved()
    } catch (e: unknown) {
      toast.error('Could not save', { description: errorText(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AppModalHeader>
        <DialogTitle>{editing ? 'Edit notification' : 'Send notification'}</DialogTitle>
        <DialogDescription>
          {editing?.status === 'published'
            ? `Saving resends the push to ${who} and marks it as edited.`
            : `Publishing sends a push to ${who} right away.`}
        </DialogDescription>
      </AppModalHeader>

      <AppModalBody className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="n-category">Category</Label>
          <NativeSelect
            id="n-category"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value as NotificationCategory }))
            }
          >
            <option value="general">{CATEGORY_LABEL.general}</option>
            <option value="nu">{CATEGORY_LABEL.nu}</option>
          </NativeSelect>
          <p className="text-xs text-muted-foreground">
            {form.category === 'nu'
              ? 'Shown under "NU Latest" in the app.'
              : 'Shown under "Recent Notice" in the app.'}
          </p>
        </div>
        <div className="md:col-span-2">
          <AudiencePicker
            value={form}
            onChange={(audience) => setForm((f) => ({ ...f, ...audience }))}
          />
        </div>
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
            className="min-h-[130px] font-sans"
            value={form.body}
            onChange={set('body')}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="n-body-bn">Message (Bangla, optional)</Label>
          <Textarea
            id="n-body-bn"
            maxLength={1000}
            className="min-h-[130px] font-sans"
            value={form.bodyBn}
            onChange={set('bodyBn')}
          />
        </div>
        <p className="text-xs text-muted-foreground md:col-span-2">
          Links: paste a URL like <code>https://example.com</code>, or write{' '}
          <code>[Apply here](https://example.com)</code> to show &quot;Apply here&quot; as the link.
          Users tap it in the notification details.
        </p>
      </AppModalBody>

      <AppModalFooter className="gap-2">
        <Button variant="outline" disabled={saving} onClick={onClose}>
          Cancel
        </Button>
        {editing ? (
          <Button disabled={saving || !valid} onClick={() => void save(false)}>
            {editing.status === 'published' ? (
              <>
                <Send className="size-4" />
                Save &amp; resend
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        ) : (
          <>
            <Button variant="outline" disabled={saving || !valid} onClick={() => void save(false)}>
              Save draft
            </Button>
            <Button disabled={saving || !valid} onClick={() => void save(true)}>
              <Send className="size-4" />
              Publish now
            </Button>
          </>
        )}
      </AppModalFooter>
    </>
  )
}
