import { Download, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatRelative } from '@/lib/format'

export function PageToolbar({
  left,
  right,
  loadedAt,
  loading,
  onRefresh,
  onExport,
  exportDisabled,
}: {
  left?: ReactNode
  right?: ReactNode
  loadedAt: number | null
  loading?: boolean
  onRefresh?: () => void
  onExport?: () => void
  exportDisabled?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/60 px-3 py-2 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.04)] backdrop-blur-sm">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        {left}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {right}
        {loadedAt ? (
          <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
            Updated {formatRelative(new Date(loadedAt).toISOString())}
          </span>
        ) : null}
        {onExport ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                disabled={exportDisabled}
                className="rounded-full text-muted-foreground hover:bg-brand-soft hover:text-brand"
                onClick={onExport}
              >
                <Download className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export CSV</TooltipContent>
          </Tooltip>
        ) : null}
        {onRefresh ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                disabled={loading}
                className="rounded-full text-muted-foreground hover:bg-brand-soft hover:text-brand"
                onClick={onRefresh}
              >
                <RefreshCw
                  className={cn('size-4', loading && 'animate-spin text-brand')}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}
