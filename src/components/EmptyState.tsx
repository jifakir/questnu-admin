import type { LayoutDashboard } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: typeof LayoutDashboard
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <Card className="rounded-2xl border-dashed border-border/70 bg-card/40 py-12 text-center shadow-none">
      <CardContent className="flex flex-col items-center gap-3">
        {Icon ? (
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Icon className="size-7" />
          </span>
        ) : null}
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </CardContent>
    </Card>
  )
}
