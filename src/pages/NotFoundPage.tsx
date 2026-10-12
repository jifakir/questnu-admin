import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-brand-gradient text-primary-foreground shadow-brand">
        <Compass className="size-8" />
      </span>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
          404 · Page not found
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          We couldn’t find that page.
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          The link may be broken or the page may have been moved. Head back to
          the dashboard or use the sidebar to navigate.
        </p>
      </div>
      <Button
        asChild
        className="gap-2 rounded-xl bg-brand-gradient font-semibold text-primary-foreground shadow-brand hover:bg-brand-gradient"
      >
        <Link to="/dashboard">
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
      </Button>
    </div>
  )
}
