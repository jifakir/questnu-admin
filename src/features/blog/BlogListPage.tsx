import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  EyeOff,
  Loader2,
  Newspaper,
  Pencil,
  PlusCircle,
  Send,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AppModal,
  AppModalFooter,
  AppModalHeader,
} from '@/components/ui/app-modal'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import {
  deleteAdminBlogPost,
  fetchAdminBlogPosts,
  publishAdminBlogPost,
  unpublishAdminBlogPost,
} from '@/api'
import { formatDateTime, formatRelative } from '@/lib/format'
import { useSearch } from '@/search'
import type { AdminBlogPost } from '@/types'

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function BlogListPage() {
  const { query } = useSearch()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<AdminBlogPost[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<AdminBlogPost | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setPosts(await fetchAdminBlogPosts())
      setError(null)
    } catch (e: unknown) {
      setError(errMsg(e) || 'Failed to load posts')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchAdminBlogPosts()
      .then((data) => {
        if (!cancelled) setPosts(data)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errMsg(e) || 'Failed to load posts')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!posts) return null
    const q = query.trim().toLowerCase()
    if (!q) return posts
    return posts.filter(
      (p) =>
        p.slug.toLowerCase().includes(q) ||
        p.bn.title.toLowerCase().includes(q) ||
        (p.en?.title ?? '').toLowerCase().includes(q),
    )
  }, [posts, query])

  const togglePublish = useCallback(
    async (p: AdminBlogPost) => {
      setBusyId(p.id)
      try {
        if (p.status === 'published') {
          await unpublishAdminBlogPost(p.id)
          toast.success('Unpublished — removed from the website')
        } else {
          await publishAdminBlogPost(p.id)
          toast.success('Published — live on the website')
        }
        await reload()
      } catch (e: unknown) {
        toast.error('Could not update status', { description: errMsg(e) })
      } finally {
        setBusyId(null)
      }
    },
    [reload],
  )

  async function confirmRemove() {
    if (!removing) return
    setBusyId(removing.id)
    try {
      await deleteAdminBlogPost(removing.id)
      toast.success(`Deleted "${removing.bn.title}"`)
      setRemoving(null)
      await reload()
    } catch (e: unknown) {
      toast.error('Delete failed', { description: errMsg(e) })
    } finally {
      setBusyId(null)
    }
  }

  const columns = useMemo<Column<AdminBlogPost>[]>(
    () => [
      {
        key: 'title',
        header: 'Title',
        sortable: true,
        sortFn: (a, b) => a.bn.title.localeCompare(b.bn.title),
        cell: (p) => (
          <div className="min-w-0 max-w-[28rem]">
            <Link
              to={`/blog/${p.id}/edit`}
              onClick={(e) => e.stopPropagation()}
              className="line-clamp-1 font-semibold hover:text-brand hover:underline underline-offset-4"
            >
              {p.bn.title || 'Untitled'}
            </Link>
            {p.en?.title ? (
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {p.en.title}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'slug',
        header: 'Slug',
        cell: (p) => (
          <span className="font-mono text-xs text-muted-foreground">{p.slug}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        sortFn: (a, b) => a.status.localeCompare(b.status),
        cell: (p) => (
          <Badge variant={p.status === 'published' ? 'approved' : 'pending'}>
            {p.status === 'published' ? 'Published' : 'Draft'}
          </Badge>
        ),
      },
      {
        key: 'langs',
        header: 'Languages',
        cell: (p) => (
          <div className="flex gap-1">
            <LangChip>BN</LangChip>
            {p.en ? <LangChip>EN</LangChip> : null}
          </div>
        ),
      },
      {
        key: 'published',
        header: 'Published',
        sortable: true,
        sortFn: (a, b) =>
          (a.publishedAt ?? '').localeCompare(b.publishedAt ?? ''),
        cell: (p) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {p.publishedAt ? formatDateTime(p.publishedAt) : '—'}
          </span>
        ),
      },
      {
        key: 'updated',
        header: 'Updated',
        sortable: true,
        sortFn: (a, b) => (a.updatedAt ?? '').localeCompare(b.updatedAt ?? ''),
        cell: (p) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatRelative(p.updatedAt)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        align: 'right',
        cell: (p) => (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="icon"
              variant="ghost"
              className="size-8 rounded-lg"
              onClick={() => navigate(`/blog/${p.id}/edit`)}
              aria-label="Edit post"
              title="Edit"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 rounded-lg"
              disabled={busyId === p.id}
              onClick={() => void togglePublish(p)}
              aria-label={p.status === 'published' ? 'Unpublish post' : 'Publish post'}
              title={p.status === 'published' ? 'Unpublish' : 'Publish'}
            >
              {busyId === p.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : p.status === 'published' ? (
                <EyeOff className="size-3.5" />
              ) : (
                <Send className="size-3.5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setRemoving(p)}
              aria-label="Delete post"
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [busyId, navigate, togglePublish],
  )

  const newButton = (
    <Button asChild className="rounded-xl">
      <Link to="/blog/new">
        <PlusCircle className="size-4" />
        New post
      </Link>
    </Button>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Newspaper}
        title="Blog"
        description="Write articles for the public website. Bangla is required; add an English version to also show the post on the English site."
        actions={newButton}
      />

      {error ? (
        <Card className="rounded-2xl border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {!posts ? (
        error ? null : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-brand" />
            Loading posts…
          </div>
        )
      ) : filtered && filtered.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title={query ? 'No posts match your search' : 'No blog posts yet'}
          description={
            query
              ? 'Try a different keyword.'
              : 'Write your first article — it goes live on the website as soon as you publish it.'
          }
          action={!query ? newButton : null}
        />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          pageSize={15}
          onRowClick={(p) => navigate(`/blog/${p.id}/edit`)}
        />
      )}

      <AppModal
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        size="md"
      >
        <AppModalHeader>
          <DialogTitle>Delete post?</DialogTitle>
          <DialogDescription>
            {removing
              ? `"${removing.bn.title}" will be permanently removed${removing.status === 'published' ? ' from the website' : ''}. This cannot be undone.`
              : null}
          </DialogDescription>
        </AppModalHeader>
        <AppModalFooter>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => setRemoving(null)}
            disabled={!!busyId}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="rounded-xl"
            onClick={() => void confirmRemove()}
            disabled={!!busyId}
          >
            {busyId && removing && busyId === removing.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Delete
          </Button>
        </AppModalFooter>
      </AppModal>
    </div>
  )
}

function LangChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-border/70 bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  )
}
