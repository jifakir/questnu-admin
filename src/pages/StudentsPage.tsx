import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { DataTable, type Column } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { PageToolbar } from '@/components/PageToolbar'
import { fetchStudents } from '@/api'
import { exportRowsToCsv } from '@/lib/csv'
import { formatDateTime } from '@/lib/format'
import { useSearch } from '@/search'
import type { Student } from '@/types'

export function StudentsPage() {
  const navigate = useNavigate()
  const { query } = useSearch()

  const [students, setStudents] = useState<Student[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadedAt, setLoadedAt] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setErr(null)
    try {
      const rows = await fetchStudents()
      setStudents(rows)
      setLoadedAt(Date.now())
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load students'
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
    if (!students) return null
    const q = query.trim().toLowerCase()
    if (!q) return students
    return students.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.name ?? '').toLowerCase().includes(q),
    )
  }, [students, query])

  const columns: Column<Student>[] = useMemo(
    () => [
      {
        key: 'id',
        header: 'Student ID',
        sortable: true,
        sortFn: (a, b) => a.id.localeCompare(b.id),
        cell: (s) => (
          <span
            className="block max-w-[200px] truncate font-mono text-xs"
            title={s.id}
          >
            {s.id}
          </span>
        ),
      },
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        sortFn: (a, b) => (a.name ?? '').localeCompare(b.name ?? ''),
        cell: (s) => (
          <span className="text-sm font-medium text-foreground">
            {s.name?.trim() ? s.name : '—'}
          </span>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        sortable: true,
        sortFn: (a, b) => a.email.localeCompare(b.email),
        cell: (s) => (
          <span className="text-sm text-muted-foreground" title={s.email}>
            {s.email}
          </span>
        ),
      },
      {
        key: 'whatsapp',
        header: 'WhatsApp',
        cell: (s) => (
          <span className="text-sm text-muted-foreground">
            {s.whatsappNumber?.trim() ? s.whatsappNumber : '—'}
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
        cell: (s) => (
          <span className="font-mono text-xs text-muted-foreground">
            {formatDateTime(s.createdAt)}
          </span>
        ),
      },
    ],
    [],
  )

  function handleExport() {
    if (!filtered || filtered.length === 0) return
    exportRowsToCsv({
      filename: `questnu-students-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { key: 'id', label: 'Student ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'whatsappNumber', label: 'WhatsApp' },
        { key: 'createdAt', label: 'Created' },
      ],
      rows: filtered.map((s) => ({
        id: s.id,
        name: s.name ?? '',
        email: s.email,
        whatsappNumber: s.whatsappNumber ?? '',
        createdAt: s.createdAt ?? '',
      })),
    })
    toast.success('Exported students', {
      description: `${filtered.length} row${filtered.length === 1 ? '' : 's'}`,
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Users}
        title="Students"
        description="Students registered in the system. Open a student to view their profile and related papers."
      />

      <PageToolbar
        left={
          students ? (
            <p className="text-xs font-medium text-muted-foreground">
              <span className="text-sm font-semibold text-foreground">
                {filtered?.length ?? 0}
              </span>{' '}
              {filtered?.length === 1 ? 'student' : 'students'}
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

      <DataTable<Student>
        data={filtered}
        loading={loading && !students}
        columns={columns}
        rowKey={(s) => s.id}
        onRowClick={(s) => navigate(`/students/${s.id}`)}
        pageSize={12}
        emptyState={
          students && students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No students yet"
              description="Students will appear here as they register. You can search by email or ID once they do."
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No matches"
              description="No students match your search. Try a shorter query or clear the search bar."
            />
          )
        }
      />
    </div>
  )
}
