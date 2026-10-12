import type { LayoutDashboard } from 'lucide-react'
import type { ReactNode } from 'react'

export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon?: typeof LayoutDashboard
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Icon className="size-5" />
          </span>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}
