import * as React from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface NativeSelectProps extends React.ComponentProps<'select'> {
  /** `pill` matches the rounded filter controls; `default` matches `Input`. */
  shape?: 'default' | 'pill'
}

/**
 * A native <select> that matches the rest of the form controls. Use this
 * instead of a bare <select> so the border, height, and chevron stay the same
 * across pages.
 */
const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, shape = 'default', children, ...props }, ref) => (
    <span className={cn('relative inline-flex', shape === 'default' && 'w-full')}>
      <select
        ref={ref}
        className={cn(
          'h-9 w-full cursor-pointer appearance-none bg-transparent pl-3 pr-8 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          shape === 'default'
            ? 'rounded-md border border-input shadow-sm'
            : 'min-w-44 max-w-64 truncate rounded-full border border-border/70 bg-card text-xs font-semibold',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </span>
  ),
)
NativeSelect.displayName = 'NativeSelect'

export { NativeSelect }
