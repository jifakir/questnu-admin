import { useEffect, useMemo, useState } from 'react'
import {
  Activity as ActivityIcon,
  BookOpen,
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  PlayCircle,
  Plus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { PageToolbar } from '@/components/PageToolbar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { fetchCourses, fetchPapers } from '@/api'
import {
  formatDateTime,
  formatRelative,
  humanStatus,
  statusBadgeVariant,
} from '@/lib/format'
import type { CourseListItem, Paper } from '@/types'
import { cn } from '@/lib/utils'

type ActivityKind = 'paper' | 'course'
type ActivityBadgeVariant =
  | 'pending'
  | 'approved'
  | 'failed'
  | 'processing'
  | 'secondary'
type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  description: string
  at: number
  link: string
  badge?: { label: string; variant: ActivityBadgeVariant }
  icon: typeof ActivityIcon
}

function paperEvents(paper: Paper): ActivityItem[] {
  const items: ActivityItem[] = []
  if (paper.createdAt) {
    items.push({
      id: `${paper._id}:submitted`,
      kind: 'paper',
      title: `Submission received`,
      description: `Student ${paper.studentId} · ${paper.imagePaths.length} page${
        paper.imagePaths.length === 1 ? '' : 's'
      }`,
      at: new Date(paper.createdAt).getTime(),
      link: `/papers/${paper._id}`,
      icon: FileText,
      badge: {
        label: humanStatus(paper.status),
        variant: statusBadgeVariant(paper.status) as ActivityBadgeVariant,
      },
    })
  }
  if (paper.approvedAt) {
    items.push({
      id: `${paper._id}:approved`,
      kind: 'paper',
      title: `Paper approved`,
      description: `${paper.reviewedBy ?? 'Reviewer'} signed off · student ${paper.studentId}`,
      at: new Date(paper.approvedAt).getTime(),
      link: `/papers/${paper._id}`,
      icon: CheckCircle2,
      badge: { label: 'approved', variant: 'approved' },
    })
  }
  return items
}

function courseEvents(course: CourseListItem): ActivityItem[] {
  const items: ActivityItem[] = []
  if (course.createdAt) {
    items.push({
      id: `${course._id}:created`,
      kind: 'course',
      title: `Course created`,
      description: course.title,
      at: new Date(course.createdAt).getTime(),
      link: `/courses/${course._id}`,
      icon: Plus,
    })
  }
  if (course.updatedAt && course.createdAt && course.updatedAt !== course.createdAt) {
    items.push({
      id: `${course._id}:updated`,
      kind: 'course',
      title:
        course.status === 'published'
          ? `Course published`
          : `Course updated`,
      description: course.title,
      at: new Date(course.updatedAt).getTime(),
      link: `/courses/${course._id}`,
      icon: course.status === 'published' ? PlayCircle : Pencil,
      badge:
        course.status === 'published'
          ? { label: 'published', variant: 'approved' }
          : undefined,
    })
  }
  return items
}

export function ActivityPage() {
  const [papers, setPapers] = useState<Paper[] | null>(null)
  const [courses, setCourses] = useState<CourseListItem[] | null>(null)
  const [loadedAt, setLoadedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'paper' | 'course'>('all')

  async function load() {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([fetchPapers(), fetchCourses()])
      setPapers(p)
      setCourses(c)
      setLoadedAt(Date.now())
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load activity'
      toast.error('Could not load activity', { description: msg })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const events = useMemo<ActivityItem[]>(() => {
    if (!papers || !courses) return []
    return [
      ...papers.flatMap(paperEvents),
      ...courses.flatMap(courseEvents),
    ].sort((a, b) => b.at - a.at)
  }, [papers, courses])

  const filtered = useMemo(
    () => (tab === 'all' ? events : events.filter((e) => e.kind === tab)),
    [events, tab],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityItem[]>()
    const fmt = (ts: number) => {
      const d = new Date(ts)
      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)
      const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
      if (sameDay(d, today)) return 'Today'
      if (sameDay(d, yesterday)) return 'Yesterday'
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year:
          d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
      })
    }
    for (const item of filtered) {
      const key = fmt(item.at)
      const arr = map.get(key) ?? []
      arr.push(item)
      map.set(key, arr)
    }
    return Array.from(map.entries())
  }, [filtered])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={ActivityIcon}
        title="Activity"
        description="A unified, time-ordered feed of submissions, approvals, and course changes across the workspace."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <PageToolbar
          left={
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="paper" className="gap-1.5">
                <FileText className="size-3.5" /> Papers
              </TabsTrigger>
              <TabsTrigger value="course" className="gap-1.5">
                <BookOpen className="size-3.5" /> Courses
              </TabsTrigger>
            </TabsList>
          }
          loadedAt={loadedAt}
          loading={loading}
          onRefresh={() => void load()}
        />

        <TabsContent value={tab} className="mt-4">
          {loading && filtered.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4"
                >
                  <Skeleton className="size-9 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ActivityIcon}
              title="No activity yet"
              description="Activity will populate as students submit papers and instructors edit courses."
            />
          ) : (
            <div className="relative space-y-6">
              {grouped.map(([day, items]) => (
                <section key={day}>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {day}
                  </h3>
                  <ol className="relative space-y-2 border-l border-border/70 pl-5">
                    {items.map((event) => {
                      const Icon = event.icon
                      return (
                        <li
                          key={event.id}
                          className="relative rounded-2xl border border-border/70 bg-card p-3 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.04)] transition-colors hover:border-brand/30 hover:bg-brand-soft/30"
                        >
                          <span
                            className={cn(
                              'absolute -left-[34px] top-4 flex size-7 items-center justify-center rounded-full border border-border/70 bg-card shadow-sm',
                              event.kind === 'paper'
                                ? 'text-brand'
                                : 'text-foreground',
                            )}
                            aria-hidden
                          >
                            <Icon className="size-3.5" />
                          </span>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <Link
                                to={event.link}
                                className="text-sm font-semibold text-foreground hover:text-brand"
                              >
                                {event.title}
                              </Link>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {event.description}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {event.badge ? (
                                <Badge variant={event.badge.variant}>
                                  {event.badge.label}
                                </Badge>
                              ) : null}
                              <time
                                className="text-[11px] font-medium text-muted-foreground"
                                title={formatDateTime(
                                  new Date(event.at).toISOString(),
                                )}
                              >
                                {formatRelative(
                                  new Date(event.at).toISOString(),
                                )}
                              </time>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </section>
              ))}
              {loading ? (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Refreshing…
                </div>
              ) : null}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
