import { useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  audienceSummary,
  useAcademicLists,
  type AudienceValue,
} from '@/lib/notificationAudience'
import { cn } from '@/lib/utils'

function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-background text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}

/** Pick which students get a notification. Nothing picked means everyone. */
export function AudiencePicker({
  value,
  onChange,
}: {
  value: AudienceValue
  onChange: (value: AudienceValue) => void
}) {
  const lists = useAcademicLists()
  const [q, setQ] = useState('')

  const departments = useMemo(() => {
    const all = lists?.departments ?? []
    const term = q.trim().toLowerCase()
    if (!term) return all
    return all.filter(
      (d) => d.name.toLowerCase().includes(term) || (d.nameBn ?? '').includes(q.trim()),
    )
  }, [lists, q])

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-3">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">Audience</p>
        <span className="ml-auto text-xs text-muted-foreground">
          {audienceSummary(value, lists)}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Year</Label>
        <div className="flex flex-wrap gap-2">
          <Chip
            active={value.targetYears.length === 0}
            onClick={() => onChange({ ...value, targetYears: [] })}
          >
            All years
          </Chip>
          {(lists?.years ?? []).map((y) => (
            <Chip
              key={y.slug}
              active={value.targetYears.includes(y.slug)}
              onClick={() => onChange({ ...value, targetYears: toggle(value.targetYears, y.slug) })}
            >
              {y.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Department</Label>
          {value.targetDepartments.length > 0 ? (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => onChange({ ...value, targetDepartments: [] })}
            >
              Clear ({value.targetDepartments.length})
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">All departments</span>
          )}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search departments"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="grid max-h-44 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
          {lists === null ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : departments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No departments found.</p>
          ) : (
            departments.map((d) => (
              <label
                key={d.slug}
                className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={value.targetDepartments.includes(d.slug)}
                  onChange={() =>
                    onChange({
                      ...value,
                      targetDepartments: toggle(value.targetDepartments, d.slug),
                    })
                  }
                />
                <span className="truncate">{d.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Only students whose profile matches get the push and see it in the app. Leave both as
        &quot;All&quot; to reach every user. Students who haven&apos;t set their year or
        department only get notifications sent to all.
      </p>
    </div>
  )
}
