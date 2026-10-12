import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function MiniBarChart({
  title,
  subtitle,
  labels,
  values,
  highlightIndex,
}: {
  title: string
  subtitle?: string
  labels: string[]
  values: number[]
  highlightIndex?: number
}) {
  const max = Math.max(1, ...values)
  return (
    <Card className="rounded-2xl border-border/70 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05)]">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle ? (
            <CardDescription className="mt-1">{subtitle}</CardDescription>
          ) : null}
        </div>
        <div className="inline-flex rounded-full border border-border/70 bg-muted/40 p-0.5">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 rounded-full bg-card px-3 text-xs font-semibold text-brand shadow-sm"
          >
            Daily
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-full px-3 text-xs text-muted-foreground"
            disabled
          >
            Weekly
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-full px-3 text-xs text-muted-foreground"
            disabled
          >
            Monthly
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="flex h-[220px] items-end gap-2 px-1 pt-2"
          role="img"
          aria-label={`${title} bar chart`}
        >
          {values.map((v, i) => {
            const pct = Math.max(0.08, v / max)
            const highlighted = highlightIndex === i
            return (
              <div key={labels[i]} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className={cn(
                    'w-full max-w-[56px] rounded-xl border transition-all hover:translate-y-[-2px]',
                    highlighted
                      ? 'border-brand/30 bg-brand-gradient shadow-brand'
                      : 'border-border/70 bg-[linear-gradient(to_top,hsl(var(--brand)/0.16),hsl(var(--brand)/0.04))]',
                  )}
                  style={{ height: `${pct * 100}%`, minHeight: '12%' }}
                  title={`${labels[i]}: ${v}`}
                />
                <span
                  className={cn(
                    'text-xs',
                    highlighted ? 'font-semibold text-brand' : 'text-muted-foreground',
                  )}
                >
                  {labels[i]}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
