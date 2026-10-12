import type { ComponentProps } from 'react'
import type { Badge } from '@/components/ui/badge'
import type { Paper } from '@/types'

export function formatCompact(n: number): string {
  return Intl.NumberFormat(undefined, { notation: 'compact' }).format(n)
}

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function formatDateTime(value: string | undefined | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

export function formatRelative(value: string | undefined | null): string {
  if (!value) return '—'
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Date.now() - then
  const m = Math.round(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(value).toLocaleDateString()
}

export function statusBadgeVariant(
  status: Paper['status'],
): ComponentProps<typeof Badge>['variant'] {
  switch (status) {
    case 'processing':
      return 'processing'
    case 'pending_review':
      return 'pending'
    case 'ai_failed':
      return 'failed'
    case 'approved':
      return 'approved'
    default:
      return 'secondary'
  }
}

export function humanStatus(status: Paper['status']): string {
  return status.replace('_', ' ')
}
