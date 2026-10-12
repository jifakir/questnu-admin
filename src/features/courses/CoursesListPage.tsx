import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Loader2,
  Pencil,
  PlusCircle,
  Trash2,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AppModal,
  AppModalFooter,
  AppModalHeader,
} from '@/components/ui/app-modal'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { createCourse, deleteCourse, fetchCourses, updateCourse } from '@/api'
import { formatRelative } from '@/lib/format'
import { useSearch } from '@/search'
import type { CourseListItem } from '@/types'
import { CourseFormDialog } from './CourseFormDialog'

export function CoursesListPage() {
  const { query } = useSearch()
  const [courses, setCourses] = useState<CourseListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CourseListItem | null>(null)
  const [removing, setRemoving] = useState<CourseListItem | null>(null)
  const [busy, setBusy] = useState(false)

  async function reload() {
    setError(null)
    try {
      const data = await fetchCourses()
      setCourses(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load courses')
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!courses) return null
    if (!q) return courses
    return courses.filter((c) => {
      return (
        c.title.toLowerCase().includes(q) ||
        (c.code ?? '').toLowerCase().includes(q) ||
        (c.subtitle ?? '').toLowerCase().includes(q) ||
        (c.tags ?? []).some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [courses, query])

  async function confirmRemove() {
    if (!removing) return
    setBusy(true)
    try {
      await deleteCourse(removing._id)
      toast.success(`Deleted "${removing.title}"`)
      setRemoving(null)
      await reload()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={BookOpen}
        title="Courses"
        description="Create and manage the live & on-demand courses your students can enroll in."
        actions={
          <Button
            className="rounded-xl"
            onClick={() => setCreating(true)}
          >
            <PlusCircle className="size-4" />
            New course
          </Button>
        }
      />

      {error ? (
        <Card className="rounded-2xl border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {!courses ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-brand" />
          Loading courses…
        </div>
      ) : filtered && filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={query ? 'No courses match your search' : 'No courses yet'}
          description={
            query
              ? 'Try a different keyword.'
              : 'Create your first course to start building modules, lessons, and resources.'
          }
          action={
            !query ? (
              <Button
                className="rounded-xl"
                onClick={() => setCreating(true)}
              >
                <PlusCircle className="size-4" />
                New course
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(filtered ?? []).map((c) => (
            <Card
              key={c._id}
              className="group flex h-full flex-col rounded-2xl border-border/70 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05)] transition hover:border-brand/30 hover:shadow-[0_8px_30px_-12px_hsl(var(--brand-shadow)/0.2)]"
            >
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  {c.code ? (
                    <span className="rounded-md border border-border/70 bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      {c.code}
                    </span>
                  ) : null}
                  <Badge
                    variant={c.status === 'published' ? 'default' : 'secondary'}
                    className="text-[10px] uppercase tracking-wide"
                  >
                    {c.status === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                  {c.level ? (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {c.level}
                    </Badge>
                  ) : null}
                </div>
                <CardTitle className="text-lg leading-tight">
                  <Link
                    to={`/courses/${c._id}`}
                    className="hover:text-brand hover:underline underline-offset-4"
                  >
                    {c.title}
                  </Link>
                </CardTitle>
                {c.subtitle ? (
                  <CardDescription className="line-clamp-2">
                    {c.subtitle}
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="mt-auto flex flex-col gap-3 text-sm">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Modules" value={c.modules ?? 0} />
                  <Stat label="Lessons" value={c.lessons ?? 0} />
                  <Stat
                    label="Enrolled"
                    value={c.enrollments ?? 0}
                    icon={Users}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span>Updated {formatRelative(c.updatedAt)}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 rounded-lg"
                      onClick={() => setEditing(c)}
                      aria-label="Edit course"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setRemoving(c)}
                      aria-label="Delete course"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CourseFormDialog
        open={creating}
        onOpenChange={(v) => setCreating(v)}
        title="Create course"
        submitLabel="Create"
        onSubmit={async (payload) => {
          const created = await createCourse(payload)
          toast.success(`Created "${created.title}"`)
          await reload()
        }}
      />

      <CourseFormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title="Edit course"
        submitLabel="Save changes"
        initial={editing ?? undefined}
        onSubmit={async (payload) => {
          if (!editing) return
          await updateCourse(editing._id, payload)
          toast.success('Course saved')
          setEditing(null)
          await reload()
        }}
      />

      <AppModal
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        size="md"
      >
        <AppModalHeader>
          <DialogTitle>Delete course?</DialogTitle>
          <DialogDescription>
            {removing
              ? `"${removing.title}" and all its modules, lessons, resources, enrollments, and student progress will be permanently removed.`
              : null}
          </DialogDescription>
        </AppModalHeader>
        <AppModalFooter>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => setRemoving(null)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="rounded-xl"
            onClick={confirmRemove}
            disabled={busy}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete
          </Button>
        </AppModalFooter>
      </AppModal>
    </div>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon?: typeof Users
}) {
  return (
    <div className="rounded-xl bg-muted/40 px-2 py-2">
      <div className="text-base font-bold tabular-nums text-foreground">
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {Icon ? (
          <span className="inline-flex items-center gap-1">
            <Icon className="size-3" />
            {label}
          </span>
        ) : (
          label
        )}
      </div>
    </div>
  )
}
