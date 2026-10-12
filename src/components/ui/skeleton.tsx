import { cn } from '@/lib/utils'

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[linear-gradient(110deg,hsl(var(--muted)),hsl(var(--muted)/0.6),hsl(var(--muted)))] bg-[length:200%_100%]',
        className,
      )}
      {...props}
    />
  )
}
