import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ChartColumn,
  CheckCircle2,
  Clock,
  Cpu,
  Loader2,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MiniBarChart } from '@/components/MiniBarChart'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { fetchCourses, fetchPapers, fetchStudents } from '@/api'
import { formatCompact, startOfDay } from '@/lib/format'
import type { CourseListItem, Paper, Student } from '@/types'

export function ReportsPage() {
  const [papers, setPapers] = useState<Paper[] | null>(null)
  const [students, setStudents] = useState<Student[] | null>(null)
  const [courses, setCourses] = useState<CourseListItem[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPapers(null)
    setStudents(null)
    setCourses(null)
    setErr(null)
    Promise.all([fetchPapers(), fetchStudents(), fetchCourses()])
      .then(([p, s, c]) => {
        if (cancelled) return
        setPapers(p)
        setStudents(s)
        setCourses(c)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : 'Failed to load analytics')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const total = papers?.length ?? 0
    const pending = papers?.filter((p) => p.status === 'pending_review').length ?? 0
    const processing = papers?.filter((p) => p.status === 'processing').length ?? 0
    const failed = papers?.filter((p) => p.status === 'ai_failed').length ?? 0
    const approved = papers?.filter((p) => p.status === 'approved').length ?? 0
    const successRate =
      total === 0
        ? 0
        : Math.round((approved / Math.max(approved + failed, 1)) * 100)
    return { total, pending, processing, failed, approved, successRate }
  }, [papers])

  const last14 = useMemo(() => {
    const now = startOfDay(new Date())
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (13 - i))
      return d
    })
    const labels = days.map((d) =>
      d.toLocaleDateString(undefined, { day: 'numeric' }),
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

  const statusBreakdown = useMemo(() => {
    const total = stats.total
    const rows = [
      { label: 'Approved', count: stats.approved, color: 'bg-emerald-500' },
      { label: 'Pending review', count: stats.pending, color: 'bg-amber-500' },
      { label: 'Processing', count: stats.processing, color: 'bg-blue-500' },
      { label: 'AI failed', count: stats.failed, color: 'bg-rose-500' },
    ]
    return rows.map((r) => ({
      ...r,
      pct: total === 0 ? 0 : Math.round((r.count / total) * 100),
    }))
  }, [stats])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={ChartColumn}
        title="Reports"
        description="Throughput, AI performance, and roster growth across QuestNU."
      />

      {papers === null && !err ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-brand" />
          Crunching numbers
        </div>
      ) : null}
      {err ? (
        <p className="text-sm font-medium text-destructive">{err}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Papers reviewed"
          value={formatCompact(stats.approved)}
          sublabel={`${stats.successRate}% AI success rate`}
          icon={CheckCircle2}
          accent="brand"
        />
        <StatCard
          title="In queue"
          value={formatCompact(stats.pending + stats.processing)}
          sublabel="Pending + processing"
          icon={Clock}
          accent="amber"
        />
        <StatCard
          title="AI failures"
          value={formatCompact(stats.failed)}
          sublabel="Needs retry or manual"
          icon={AlertTriangle}
          accent="rose"
        />
        <StatCard
          title="Active students"
          value={formatCompact(students?.length ?? 0)}
          sublabel={`${courses?.length ?? 0} courses live`}
          icon={Cpu}
          accent="blue"
        />
      </div>

      <MiniBarChart
        title="Submissions volume"
        subtitle="Last 14 days"
        labels={last14.labels}
        values={last14.values}
        highlightIndex={last14.values.length - 1}
      />

      <Card className="rounded-2xl border-border/70 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05)]">
        <CardHeader>
          <CardTitle className="text-base">Status breakdown</CardTitle>
          <CardDescription>
            Distribution of paper statuses across all submissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {statusBreakdown.map((row) => (
            <div key={row.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{row.label}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {row.count} · {row.pct}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${row.color}`}
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </div>
          ))}
          {stats.total === 0 ? (
            <p className="text-sm text-muted-foreground">
              No papers in the system yet. Charts will populate as students
              start submitting.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
