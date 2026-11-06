import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Handshake, Loader2, Pencil, PlusCircle, Trash2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
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
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import {
  blogImageUrl,
  createBlogAuthor,
  deleteBlogAuthor,
  fetchBlogAuthors,
  updateBlogAuthor,
} from '@/api'
import { useSearch } from '@/search'
import type { BlogAuthor, BlogAuthorWritePayload } from '@/types'
import { BlogAuthorFormDialog } from './BlogAuthorFormDialog'
import { authorInitials } from './blogUtils'

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function BlogAuthorsPage() {
  const { query } = useSearch()
  const [authors, setAuthors] = useState<BlogAuthor[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BlogAuthor | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [removing, setRemoving] = useState<BlogAuthor | null>(null)
  const [deleting, setDeleting] = useState(false)

  const reload = useCallback(async () => {
    try {
      setAuthors(await fetchBlogAuthors())
      setError(null)
    } catch (e: unknown) {
      setError(errMsg(e) || 'Failed to load authors')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchBlogAuthors()
      .then((data) => {
        if (!cancelled) setAuthors(data)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errMsg(e) || 'Failed to load authors')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!authors) return null
    const q = query.trim().toLowerCase()
    if (!q) return authors
    return authors.filter((a) =>
      [a.name, a.designation, a.ellc ? 'ELLC' : null].some((v) =>
        (v ?? '').toLowerCase().includes(q),
      ),
    )
  }, [authors, query])

  function openCreate() {
    setEditing(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }

  function openEdit(a: BlogAuthor) {
    setEditing(a)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }

  async function submit(payload: BlogAuthorWritePayload) {
    if (editing) {
      await updateBlogAuthor(editing.id, payload)
      toast.success(`Saved "${payload.name}"`)
    } else {
      await createBlogAuthor(payload)
      toast.success(`Added "${payload.name}"`)
    }
    await reload()
  }

  async function confirmRemove() {
    if (!removing) return
    setDeleting(true)
    try {
      await deleteBlogAuthor(removing.id)
      toast.success(`Deleted "${removing.name}"`)
      setRemoving(null)
      await reload()
    } catch (e: unknown) {
      // 409 when posts still use this author — the server message says how many.
      toast.error('Could not delete author', { description: errMsg(e) })
    } finally {
      setDeleting(false)
    }
  }

  const newButton = (
    <Button className="rounded-xl" onClick={openCreate}>
      <PlusCircle className="size-4" />
      New author
    </Button>
  )

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/blog"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-brand"
      >
        <ArrowLeft className="size-4" />
        All posts
      </Link>
      <PageHeader
        icon={Users}
        title="Blog authors"
        description="Writer profiles shown on blog posts. Posts without an author are credited to the QuestNU Academic Team."
        actions={newButton}
      />

      {error ? (
        <Card className="rounded-2xl border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {!filtered ? (
        error ? null : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-brand" />
            Loading authors…
          </div>
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? 'No authors match your search' : 'No authors yet'}
          description={
            query
              ? 'Try a different keyword.'
              : 'Add writer profiles, then pick one on each post. Until then posts show "QuestNU Academic Team".'
          }
          action={!query ? newButton : null}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <AuthorCard
              key={a.id}
              author={a}
              onEdit={() => openEdit(a)}
              onDelete={() => setRemoving(a)}
            />
          ))}
        </div>
      )}

      <BlogAuthorFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        author={editing}
        onSubmit={submit}
      />

      <AppModal
        open={!!removing}
        onOpenChange={(v) => !v && !deleting && setRemoving(null)}
        size="md"
      >
        <AppModalHeader>
          <DialogTitle>Delete author?</DialogTitle>
          <DialogDescription>
            {removing
              ? removing.postCount > 0
                ? `"${removing.name}" is credited on ${removing.postCount} post${removing.postCount === 1 ? '' : 's'}. Assign those posts to another author (or the default team) first — deleting will be refused while posts use it.`
                : `"${removing.name}" will be permanently removed. This cannot be undone.`
              : null}
          </DialogDescription>
        </AppModalHeader>
        <AppModalFooter>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => setRemoving(null)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="rounded-xl"
            onClick={() => void confirmRemove()}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete
          </Button>
        </AppModalFooter>
      </AppModal>
    </div>
  )
}

function AuthorCard({
  author: a,
  onEdit,
  onDelete,
}: {
  author: BlogAuthor
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-start gap-3 py-4">
        {a.avatar ? (
          <img
            src={blogImageUrl(a.avatar)}
            alt={a.name}
            className="size-12 shrink-0 rounded-full border border-border/70 object-cover"
          />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
            {authorInitials(a)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="line-clamp-1 font-semibold">{a.name}</p>
            {a.ellc ? (
              <Badge variant="processing" className="gap-1 px-1.5 py-0 text-[10px]">
                <Handshake className="size-3" />
                ELLC
              </Badge>
            ) : null}
          </div>
          {a.designation ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.designation}</p>
          ) : null}
          <p className="mt-1.5 text-xs font-medium text-muted-foreground">
            {a.postCount} post{a.postCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-8 rounded-lg"
            onClick={onEdit}
            aria-label={`Edit ${a.name}`}
            title="Edit"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            aria-label={`Delete ${a.name}`}
            title="Delete"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
