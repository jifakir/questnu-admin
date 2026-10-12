import { ChevronRight, LayoutDashboard } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type StatAccent = 'brand' | 'amber' | 'blue' | 'rose'

const ACCENT_MAP: Record<StatAccent, string> = {
  brand: 'bg-brand-soft text-brand',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  rose: 'bg-rose-100 text-rose-700',
}

export function StatCard({
  title,
  value,
  sublabel,
  trendLabel,
  actionLabel,
  onAction,
  icon: Icon,
  accent = 'brand',
}: {
  title: string
  value: string
  sublabel?: string
  trendLabel?: string
  actionLabel?: string
  onAction?: () => void
  icon?: typeof LayoutDashboard
  accent?: StatAccent
}) {
  return (
    <Card className="group relative overflow-hidden rounded-2xl border-border/70 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05),0_20px_40px_-20px_hsl(var(--brand-shadow)/0.25)]">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {trendLabel ? (
            <Badge
              variant="outline"
              className="border-brand/20 bg-brand-soft text-[10px] font-semibold uppercase tracking-wide text-brand"
            >
              {trendLabel}
            </Badge>
          ) : null}
          {Icon ? (
            <span
              className={cn(
                'flex size-9 items-center justify-center rounded-xl',
                ACCENT_MAP[accent],
              )}
            >
              <Icon className="size-4" />
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight text-foreground">
          {value}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{sublabel ?? '\u00A0'}</p>
          {actionLabel ? (
            <Button
              variant="link"
              className="h-auto p-0 text-xs font-semibold text-brand hover:text-brand-hover"
              onClick={onAction}
            >
              {actionLabel}
              <ChevronRight className="size-3" />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
