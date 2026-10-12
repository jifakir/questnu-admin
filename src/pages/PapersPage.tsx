import { useCallback, useEffect, useMemo, useState } from 'react'
import { Files } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { DataTable, type Column } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { PageToolbar } from '@/components/PageToolbar'
import { PaperReviewDialog } from '@/components/PaperReviewDialog'
import { fetchPapers } from '@/api'
import { exportRowsToCsv } from '@/lib/csv'
import { formatDateTime, humanStatus, statusBadgeVariant } from '@/lib/format'
import { useSearch } from '@/search'
import type { Paper, PaperStatus } from '@/types'

const STATUS_TABS: { id: PaperStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending_review', label: 'Pending review' },
  { id: 'processing', label: 'Processing' },
  { id: 'approved', label: 'Approved' },
  { id: 'ai_failed', label: 'AI failed' },
]

export function PapersPage() {
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id?: string }>()
  const { query } = useSearch()
  const [searchParams, setSearchParams] = useSearchParams()

  const [papers, setPapers] = useState<Paper[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadedAt, setLoadedAt] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const status =
    (searchParams.get('status') as PaperStatus | 'all' | null) ?? 'all'

  const setStatus = (next: PaperStatus | 'all') => {
    const params = new URLSearchParams(searchParams)
    if (next === 'all') params.delete('status')
    else params.set('status', next)
    setSearchParams(params, { replace: true })
  }

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      setErr(null)
      try {
        const rows = await fetchPapers()
        setPapers(rows)
        setLoadedAt(Date.now())
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load papers'
        setErr(msg)
        if (silent) toast.error('Refresh failed', { description: msg })
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void load()
  }, [load])

  const counts = useMemo(() => {
    const base: Record<string, number> = {
      all: papers?.length ?? 0,
      pending_review: 0,
      processing: 0,
      approved: 0,
      ai_failed: 0,
    }
    for (const p of papers ?? []) base[p.status] = (base[p.status] ?? 0) + 1
    return base
  }, [papers])

  const filtered = useMemo(() => {
    if (!papers) return null
    let rows = papers
    if (status !== 'all') rows = rows.filter((p) => p.status === status)
    const q = query.trim().toLowerCase()
    if (q)
      rows = rows.filter(
        (p) =>
          p._id.toLowerCase().includes(q) ||
          p.studentId.toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q),
      )
    return rows
  }, [papers, status, query])

  const activePaper = useMemo(
    () => (routeId ? papers?.find((p) => p._id === routeId) ?? null : null),
    [papers, routeId],
  )

  const columns: Column<Paper>[] = useMemo(
    () => [
      {
        key: 'id',
        header: 'Paper ID',
        sortable: true,
        sortFn: (a, b) => a._id.localeCompare(b._id),
        cell: (p) => (
          <span
            className="block max-w-[220px] truncate font-mono text-xs"
            title={p._id}
          >
            {p._id}
          </span>
        ),
      },
      {
        key: 'student',
        header: 'Student',
        sortable: true,
        sortFn: (a, b) => a.studentId.localeCompare(b.studentId),
        cell: (p) => (
          <span className="text-sm font-medium text-foreground">
            {p.studentId}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        sortFn: (a, b) => a.status.localeCompare(b.status),
        cell: (p) => (
          <Badge variant={statusBadgeVariant(p.status)}>
            {humanStatus(p.status)}
          </Badge>
        ),
      },
      {
        key: 'pages',
        header: 'Pages',
        align: 'right',
        sortable: true,
        sortFn: (a, b) => a.imagePaths.length - b.imagePaths.length,
        cell: (p) => (
          <span className="tabular-nums text-muted-foreground">
            {p.imagePaths.length}
          </span>
        ),
        className: 'text-right',
      },
      {
        key: 'updatedAt',
        header: 'Updated',
        sortable: true,
        sortFn: (a, b) =>
          new Date(a.updatedAt ?? 0).getTime() -
          new Date(b.updatedAt ?? 0).getTime(),
        cell: (p) => (
          <span className="font-mono text-xs text-muted-foreground">
            {formatDateTime(p.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  )

  function handleExport() {
    if (!filtered || filtered.length === 0) return
    exportRowsToCsv({
      filename: `questnu-papers-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { key: 'id', label: 'Paper ID' },
        { key: 'studentId', label: 'Student' },
        { key: 'status', label: 'Status' },
        { key: 'pages', label: 'Pages' },
        { key: 'createdAt', label: 'Created' },
        { key: 'updatedAt', label: 'Updated' },
        { key: 'approvedAt', label: 'Approved' },
      ],
      rows: filtered.map((p) => ({
        id: p._id,
        studentId: p.studentId,
        status: p.status,
        pages: p.imagePaths.length,
        createdAt: p.createdAt ?? '',
        updatedAt: p.updatedAt ?? '',
        approvedAt: p.approvedAt ?? '',
      })),
    })
    toast.success('Exported papers', {
      description: `${filtered.length} row${filtered.length === 1 ? '' : 's'}`,
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Files}
        title="Papers"
        description="Open a row to review scanned pages and approve instructor feedback. Only papers in pending review can be approved."
      />

      <Tabs value={status} onValueChange={(v) => setStatus(v as PaperStatus | 'all')}>
        <PageToolbar
          left={
            <TabsList className="max-w-full overflow-x-auto">
              {STATUS_TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id}>
                  {t.label}
                  <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold tabular-nums text-muted-foreground data-[active]:bg-brand-soft data-[active]:text-brand">
                    {counts[t.id] ?? 0}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          }
          loadedAt={loadedAt}
          loading={loading}
          onRefresh={() => void load(true)}
          onExport={handleExport}
          exportDisabled={!filtered || filtered.length === 0}
        />

        <TabsContent value={status} className="mt-4">
          {err ? (
            <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
              {err}
            </p>
          ) : null}

          <DataTable<Paper>
            data={filtered}
            loading={loading && !papers}
            columns={columns}
            onRowClick={(p) => navigate(`/papers/${p._id}`)}
            rowKey={(p) => p._id}
            pageSize={12}
            emptyState={
              papers && papers.length === 0 ? (
                <EmptyState
                  icon={Files}
                  title="No papers yet"
                  description="Submissions will appear here as students upload. Pending reviews surface at the top."
                />
              ) : (
                <EmptyState
                  icon={Files}
                  title="No matches"
                  description="No papers match your filters. Try a different status tab or clear the search bar."
                />
              )
            }
          />
        </TabsContent>
      </Tabs>

      <PaperReviewDialog
        paper={activePaper}
        open={Boolean(routeId)}
        onClose={() => navigate('/papers')}
        onUpdated={() => void load(true)}
      />
    </div>
  )
}
