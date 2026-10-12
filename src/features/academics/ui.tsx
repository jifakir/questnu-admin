import { ScrollText } from 'lucide-react'

import { NativeSelect } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'

export function hasSyllabusBody(row: {
  introduction?: string | null
  description?: string | null
  labDetails?: string | null
  objectives?: unknown[] | null
  outcomes?: unknown[] | null
  prescribedTexts?: unknown[] | null
  outline?: unknown[] | null
  books?: unknown[] | null
}) {
  const text = [row.introduction, row.description, row.labDetails].some(
    (value) => typeof value === 'string' && value.trim().length > 0,
  )
  const lists = [row.objectives, row.outcomes, row.prescribedTexts, row.outline, row.books].some(
    (value) => Array.isArray(value) && value.length > 0,
  )
  return text || lists
}

export function OldSyllabusNotice() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-8 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <ScrollText className="size-7" />
      </span>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">Syllabus is not available</h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
        This course is from the old syllabus, so it does not have a detailed syllabus.
      </p>
    </div>
  )
}

export function FilterPills({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string; count?: number }[]
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value || 'all'}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
              active
                ? 'border-brand/20 bg-brand-soft text-brand shadow-sm'
                : 'border-border/70 bg-card text-muted-foreground hover:border-brand/20 hover:text-foreground',
            )}
          >
            {option.label}
            {typeof option.count === 'number' ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px]',
                  active ? 'bg-background/80' : 'bg-muted',
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function DepartmentSelect({
  value,
  departments,
  onChange,
  counts,
}: {
  value: string
  departments: { slug: string; name: string }[]
  onChange: (value: string) => void
  counts?: Map<string, number>
}) {
  return (
    <NativeSelect
      shape="pill"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Filter by department"
    >
      <option value="">All departments</option>
      {departments.map((dept) => {
        const count = counts?.get(dept.slug)
        return (
          <option key={dept.slug} value={dept.slug}>
            {count == null ? dept.name : `${dept.name} (${count})`}
          </option>
        )
      })}
    </NativeSelect>
  )
}

export function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-2xl border border-border/60 bg-muted/40"
        />
      ))}
    </div>
  )
}
