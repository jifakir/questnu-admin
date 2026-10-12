import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Cpu,
  Files,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { MiniBarChart } from '@/components/MiniBarChart'
import { StatCard } from '@/components/StatCard'
import { fetchCourses, fetchPapers } from '@/api'
import { useAuth } from '@/auth'
import { formatCompact, startOfDay, statusBadgeVariant, humanStatus } from '@/lib/format'
import type { CourseListItem, Paper } from '@/types'

export function DashboardPage() {
  const navigate = useNavigate()
  const { email } = useAuth()

  const [papers, setPapers] = useState<Paper[] | null>(null)
  const [papersErr, setPapersErr] = useState<string | null>(null)
  const [courses, setCourses] = useState<CourseListItem[] | null>(null)
  const [coursesErr, setCoursesErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPapers(null)
    setPapersErr(null)
    fetchPapers()
      .then((rows) => {
        if (!cancelled) setPapers(rows)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setPapersErr(e instanceof Error ? e.message : 'Failed to load papers')
      })
    setCourses(null)
    setCoursesErr(null)
    fetchCourses()
      .then((rows) => {
        if (!cancelled) setCourses(rows)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setCoursesErr(
            e instanceof Error ? e.message : 'Failed to load courses',
          )
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const total = papers?.length ?? 0
    const pending =
      papers?.filter((p) => p.status === 'pending_review').length ?? 0
    const processing =
      papers?.filter((p) => p.status === 'processing').length ?? 0
    const failed = papers?.filter((p) => p.status === 'ai_failed').length ?? 0
    const approved = papers?.filter((p) => p.status === 'approved').length ?? 0
    return { total, pending, processing, failed, approved }
  }, [papers])

  const courseMetrics = useMemo(() => {
    const list = courses ?? []
    let modules = 0
    let lessons = 0
    for (const c of list) {
      modules += c.modules ?? 0
      lessons += c.lessons ?? 0
    }
    return { courseCount: list.length, modules, lessons }
  }, [courses])

  const recentCourses = useMemo(() => {
    const list = courses ?? []
    return [...list]
      .sort((a, b) => {
        const ad = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
        const bd = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime()
        return bd - ad
      })
      .slice(0, 4)
  }, [courses])

  const last7 = useMemo(() => {
    const now = startOfDay(new Date())
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (6 - i))
      return d
    })
    const labels = days.map((d) =>
      d.toLocaleDateString(undefined, { weekday: 'short' }),
    )
    const values = days.map(() => 0)
    ;(papers ?? []).forEach((p) => {
      const raw = p.createdAt ?? p.updatedAt
      if (!raw) return
      const d = startOfDay(new Date(raw))
      const idx = days.findIndex((x) => x.getTime() === d.getTime())
      if (idx >= 0) values[idx] += 1
    })
    return { labels, values }
  }, [papers])

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl border border-brand/15 bg-brand-gradient p-6 text-primary-foreground shadow-brand md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-1/4 size-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
              <Sparkles className="size-3.5" />
              QuestNU control room
            </span>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Welcome back
              {email ? `, ${email.split('@')[0]}` : ''}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">
              AI-assisted review, student roster, and curriculum builder all in
              one place. Pick up where you left off or jump straight into the
              review queue.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-10 rounded-xl bg-white px-4 font-semibold text-brand shadow-sm hover:bg-white/90"
              onClick={() => navigate('/papers')}
            >
              <Files className="size-4" />
              Review queue
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-xl border-white/40 bg-white/10 px-4 font-semibold text-white backdrop-blur hover:bg-white/20 hover:text-white"
              onClick={() => navigate('/courses')}
            >
              <BookOpen className="size-4" />
              Manage courses
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total papers"
          value={formatCompact(stats.total)}
          sublabel="All submissions"
          actionLabel="View papers"
          onAction={() => navigate('/papers')}
          icon={Files}
          accent="brand"
        />
        <StatCard
          title="Pending review"
          value={formatCompact(stats.pending)}
          sublabel="Instructor approval"
          trendLabel="Active"
          actionLabel="Open queue"
          onAction={() => navigate('/papers')}
          icon={Clock}
          accent="amber"
        />
        <StatCard
          title="Processing"
          value={formatCompact(stats.processing)}
          sublabel="Gemini in progress"
          icon={Cpu}
          accent="blue"
        />
        <StatCard
          title="AI failed"
          value={formatCompact(stats.failed)}
          sublabel="Needs retry / manual"
          icon={AlertTriangle}
          accent="rose"
        />
      </div>

      <Card className="rounded-2xl border-brand/15 bg-brand-soft/40 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05)]">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-gradient text-primary-foreground shadow-brand">
                <BookOpen className="size-5" />
              </span>
              <div>
                <CardTitle className="text-lg">Curriculum</CardTitle>
                <CardDescription>
                  Courses, modules, and lessons (live, video, exams).
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0 gap-2 rounded-xl bg-brand-gradient font-semibold text-primary-foreground shadow-brand hover:bg-brand-gradient"
              onClick={() => navigate('/courses')}
            >
              <BookOpen className="size-4" />
              Manage courses
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {courses === null && !coursesErr ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-brand" />
              Loading course overview
            </div>
          ) : null}
          {coursesErr ? (
            <p className="text-sm font-medium text-destructive">{coursesErr}</p>
          ) : null}
          {courses !== null ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Courses', value: courseMetrics.courseCount },
                  { label: 'Modules', value: courseMetrics.modules },
                  { label: 'Lessons', value: courseMetrics.lessons },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-border/70 bg-card/90 px-4 py-3 shadow-sm"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                      {formatCompact(stat.value)}
                    </p>
                  </div>
                ))}
              </div>
              {recentCourses.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Recently updated
                  </p>
                  <ul className="flex flex-col gap-2">
                    {recentCourses.map((c) => (
                      <li key={c._id}>
                        <Link
                          to={`/courses/${c._id}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-sm transition-colors hover:border-brand/30 hover:bg-brand-soft/50"
                        >
                          <span className="min-w-0 truncate font-medium text-foreground">
                            {c.title}
                          </span>
                          <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                            {c.lessons ?? 0} lessons
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No courses yet. Open Manage courses to build your first
                  outline.
                </p>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
        <MiniBarChart
          title="Submission volume"
          subtitle="Last 7 days"
          labels={last7.labels}
          values={last7.values}
          highlightIndex={4}
        />
        <div className="flex flex-col gap-4">
          <Card className="rounded-2xl border-border/70 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <div>
                    <CardTitle className="text-base">Review queue</CardTitle>
                    <CardDescription>
                      {stats.pending} pending · {stats.processing} processing
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-2.5 overflow-hidden rounded-full border border-brand/15 bg-brand-soft/60">
                <div
                  className="h-full rounded-full bg-brand-gradient transition-all"
                  style={{
                    width: `${
                      stats.total === 0
                        ? 0
                        : Math.round((stats.approved / stats.total) * 100)
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Approved</span>
                <span className="font-mono font-semibold text-brand">
                  {stats.total === 0
                    ? '0%'
                    : `${Math.round((stats.approved / stats.total) * 100)}%`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="h-9 rounded-xl bg-brand-gradient font-semibold text-primary-foreground shadow-brand hover:bg-brand-gradient"
                  onClick={() => navigate('/papers')}
                >
                  Review papers
                </Button>
                <Button
                  variant="ghost"
                  className="h-9 rounded-xl text-muted-foreground"
                  onClick={() => navigate('/reports')}
                >
                  View analytics
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent papers</CardTitle>
              <CardDescription>Latest updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {papersErr ? (
                <p className="text-sm font-medium text-destructive">
                  {papersErr}
                </p>
              ) : null}
              {(papers ?? [])
                .slice()
                .sort((a, b) => {
                  const ad = new Date(
                    a.updatedAt ?? a.createdAt ?? 0,
                  ).getTime()
                  const bd = new Date(
                    b.updatedAt ?? b.createdAt ?? 0,
                  ).getTime()
                  return bd - ad
                })
                .slice(0, 5)
                .map((p) => (
                  <Link
                    key={p._id}
                    to={`/papers/${p._id}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2 text-left text-sm transition-colors hover:border-brand/30 hover:bg-brand-soft/50"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs">{p._id}</div>
                      <div className="text-xs text-muted-foreground">
                        Student {p.studentId}
                      </div>
                    </div>
                    <Badge variant={statusBadgeVariant(p.status)}>
                      {humanStatus(p.status)}
                    </Badge>
                  </Link>
                ))}
              {papers && papers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No papers yet.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
