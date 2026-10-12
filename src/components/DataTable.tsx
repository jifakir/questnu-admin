import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type Column<T> = {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  sortable?: boolean
  sortFn?: (a: T, b: T) => number
  className?: string
  headClassName?: string
  align?: 'left' | 'right' | 'center'
}

export function DataTable<T extends { id?: string; _id?: string }>({
  data,
  columns,
  loading = false,
  pageSize = 10,
  onRowClick,
  emptyState,
  rowKey,
}: {
  data: T[] | null
  columns: Column<T>[]
  loading?: boolean
  pageSize?: number
  onRowClick?: (row: T) => void
  emptyState?: ReactNode
  rowKey?: (row: T) => string
}) {
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const sorted = useMemo(() => {
    if (!data) return null
    if (!sortBy) return data
    const col = columns.find((c) => c.key === sortBy)
    if (!col?.sortFn) return data
    const copy = [...data].sort(col.sortFn)
    return sortDir === 'asc' ? copy : copy.reverse()
  }, [data, sortBy, sortDir, columns])

  const totalPages = sorted ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  const safePage = Math.min(page, totalPages)
  const pageRows = useMemo(() => {
    if (!sorted) return []
    const start = (safePage - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, safePage, pageSize])

  function toggleSort(key: string) {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDir('desc')
    }
  }

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05)]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead key={c.key} className={c.headClassName}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {columns.map((c) => (
                  <TableCell key={c.key}>
                    <Skeleton className="h-4 w-3/4" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (!sorted || sorted.length === 0) {
    return <>{emptyState}</>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05)]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((c) => {
              const active = sortBy === c.key
              const Icon = active
                ? sortDir === 'asc'
                  ? ArrowUp
                  : ArrowDown
                : ArrowUpDown
              return (
                <TableHead
                  key={c.key}
                  className={cn(
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                    c.headClassName,
                  )}
                >
                  {c.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:text-foreground',
                        active ? 'text-brand' : 'text-muted-foreground',
                      )}
                    >
                      {c.header}
                      <Icon
                        className={cn(
                          'size-3.5 transition-opacity',
                          active ? 'opacity-100' : 'opacity-50',
                        )}
                      />
                    </button>
                  ) : (
                    c.header
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((row, i) => (
            <TableRow
              key={rowKey ? rowKey(row) : row._id ?? row.id ?? i}
              className={cn(onRowClick && 'cursor-pointer')}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={(e) =>
                onRowClick && e.key === 'Enter' ? onRowClick(row) : undefined
              }
            >
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  className={cn(
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                    c.className,
                  )}
                >
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-border/70 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
          <span className="font-medium">
            Page {safePage} of {totalPages} ·{' '}
            <span className="text-foreground">{sorted.length}</span> rows
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-7 rounded-md"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 rounded-md"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
