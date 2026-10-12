import { useEffect, useState } from 'react'
import {
  Building2,
  FileQuestion,
  GraduationCap,
  Loader2,
  RefreshCw,
  ScrollText,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { fetchAcademicsOverview, syncAppCatalog } from '@/api'
import type { AcademicsOverview } from '@/types'

export function AcademicsHubPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<AcademicsOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function reload() {
    setError(null)
    try {
      setData(await fetchAcademicsOverview())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load academics')
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function sync() {
    setBusy(true)
    try {
      const result = await syncAppCatalog()
      toast.success(
        result.subjects.created
          ? `Added ${result.subjects.created} courses from the app catalog`
          : 'App catalog is already in the admin portal',
      )
      await reload()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not sync the app catalog')
    } finally {
      setBusy(false)
    }
  }

  const covered = data?.departmentCoverage.filter((d) => d.subjects > 0) ?? []
  const empty = data?.departmentCoverage.filter((d) => d.subjects === 0) ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={GraduationCap}
        title="Academics"
        description="The same National University catalog the mobile app keeps offline. Edits here stay on the server until a release is published."
        actions={
          <Button className="rounded-xl" onClick={() => void sync()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Sync app catalog
          </Button>
        }
      />

      {error ? (
        <Card className="rounded-2xl border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Departments"
          value={data ? String(data.departments) : '—'}
          icon={GraduationCap}
          sublabel={`${covered.length} with syllabus`}
          actionLabel="Open structure"
          onAction={() => navigate('/academics/structure')}
        />
        <StatCard
          title="Colleges"
          value={data ? String(data.colleges) : '—'}
          icon={Building2}
          accent="blue"
          sublabel="Affiliated colleges"
        />
        <StatCard
          title="Syllabus"
          value={data ? String(data.subjects) : '—'}
          icon={ScrollText}
          accent="amber"
          sublabel={data ? `${data.readySubjects} from the app` : 'Loading'}
          actionLabel="Browse courses"
          onAction={() => navigate('/academics/syllabus')}
        />
        <StatCard
          title="Question bank"
          value={data ? String(data.questions) : '—'}
          icon={FileQuestion}
          accent="rose"
          sublabel="Not in the app yet"
        />
      </div>

      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Year coverage</CardTitle>
          <CardDescription>How many courses are stored for each honours year.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(data?.yearCoverage ?? []).map((year) => (
            <Link
              key={year.slug}
              to={`/academics/syllabus?year=${year.slug}`}
              className="rounded-2xl border border-border/70 bg-muted/20 p-4 transition hover:border-brand/30 hover:bg-brand-soft/40"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {year.labelBn || `Year ${year.slug}`}
              </p>
              <p className="mt-1 text-lg font-bold tracking-tight">{year.label}</p>
              <p className="mt-3 text-2xl font-bold text-brand">{year.subjects}</p>
              <p className="text-xs text-muted-foreground">courses</p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Departments in the app</h2>
            <p className="text-sm text-muted-foreground">
              Open one to review the syllabus students already have offline.
            </p>
          </div>
        </div>
        {!data ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/50" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {covered.map((dept) => (
              <Link
                key={dept.slug}
                to={`/academics/syllabus?dept=${dept.slug}`}
                className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.04)] transition hover:-translate-y-0.5 hover:border-brand/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{dept.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{dept.nameBn || dept.slug}</p>
                  </div>
                  <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
                    {dept.subjects}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {empty.length > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {empty.length} departments have no syllabus yet ({empty.slice(0, 4).map((d) => d.name).join(', ')}
            {empty.length > 4 ? '…' : ''}).
          </p>
        ) : null}
      </div>
    </div>
  )
}
