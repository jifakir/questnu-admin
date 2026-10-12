import { useCallback, useEffect, useMemo, useState } from 'react'
import { UserCog } from 'lucide-react'
import { toast } from 'sonner'

import { DataTable, type Column } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { PageToolbar } from '@/components/PageToolbar'
import { fetchInstructors } from '@/api'
import { exportRowsToCsv } from '@/lib/csv'
import { formatDateTime } from '@/lib/format'
import { useSearch } from '@/search'
import type { Instructor } from '@/types'

export function InstructorsPage() {
  const { query } = useSearch()

  const [instructors, setInstructors] = useState<Instructor[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadedAt, setLoadedAt] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setErr(null)
    try {
      const rows = await fetchInstructors()
      setInstructors(rows)
      setLoadedAt(Date.now())
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load instructors'
      setErr(msg)
      if (silent) toast.error('Refresh failed', { description: msg })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (!instructors) return null
    const q = query.trim().toLowerCase()
    if (!q) return instructors
    return instructors.filter(
      (i) =>
        i.id.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        (i.name ?? '').toLowerCase().includes(q),
    )
  }, [instructors, query])

  const columns: Column<Instructor>[] = useMemo(
    () => [
      {
        key: 'id',
        header: 'Instructor ID',
        sortable: true,
        sortFn: (a, b) => a.id.localeCompare(b.id),
        cell: (i) => (
          <span
            className="block max-w-[200px] truncate font-mono text-xs"
            title={i.id}
          >
            {i.id}
          </span>
        ),
      },
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        sortFn: (a, b) => (a.name ?? '').localeCompare(b.name ?? ''),
        cell: (i) => (
          <span className="text-sm font-medium text-foreground">
            {i.name?.trim() ? i.name : '—'}
          </span>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        sortable: true,
        sortFn: (a, b) => a.email.localeCompare(b.email),
        cell: (i) => (
          <span className="text-sm text-muted-foreground" title={i.email}>
            {i.email}
          </span>
        ),
      },
      {
        key: 'whatsapp',
        header: 'WhatsApp',
        cell: (i) => (
          <span className="text-sm text-muted-foreground">
            {i.whatsappNumber?.trim() ? i.whatsappNumber : '—'}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        sortable: true,
        sortFn: (a, b) =>
          new Date(a.createdAt ?? 0).getTime() -
          new Date(b.createdAt ?? 0).getTime(),
        cell: (i) => (
          <span className="font-mono text-xs text-muted-foreground">
            {formatDateTime(i.createdAt)}
          </span>
        ),
      },
    ],
    [],
  )

  function handleExport() {
    if (!filtered || filtered.length === 0) return
    exportRowsToCsv({
      filename: `questnu-instructors-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { key: 'id', label: 'Instructor ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'whatsappNumber', label: 'WhatsApp' },
        { key: 'createdAt', label: 'Created' },
      ],
      rows: filtered.map((i) => ({
        id: i.id,
        name: i.name ?? '',
        email: i.email,
        whatsappNumber: i.whatsappNumber ?? '',
        createdAt: i.createdAt ?? '',
      })),
    })
    toast.success('Exported instructors', {
      description: `${filtered.length} row${filtered.length === 1 ? '' : 's'}`,
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={UserCog}
        title="Instructors"
        description="Instructors with access to review papers and manage courses in the workspace."
      />

      <PageToolbar
        left={
          instructors ? (
            <p className="text-xs font-medium text-muted-foreground">
              <span className="text-sm font-semibold text-foreground">
                {filtered?.length ?? 0}
              </span>{' '}
              {filtered?.length === 1 ? 'instructor' : 'instructors'}
              {query.trim() ? ` matching "${query.trim()}"` : ''}
            </p>
          ) : null
        }
        loadedAt={loadedAt}
        loading={loading}
        onRefresh={() => void load(true)}
        onExport={handleExport}
        exportDisabled={!filtered || filtered.length === 0}
      />

      {err ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
          {err}
        </p>
      ) : null}

      <DataTable<Instructor>
        data={filtered}
        loading={loading && !instructors}
        columns={columns}
        rowKey={(i) => i.id}
        pageSize={12}
        emptyState={
          instructors && instructors.length === 0 ? (
            <EmptyState
              icon={UserCog}
              title="No instructors yet"
              description="Instructor accounts will appear here once they are created."
            />
          ) : (
            <EmptyState
              icon={UserCog}
              title="No matches"
              description="No instructors match your search. Try a shorter query or clear the search bar."
            />
          )
        }
      />
    </div>
  )
}
