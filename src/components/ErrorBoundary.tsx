import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'

type ErrorBoundaryState = { error: Error | null }

export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info)
    }
  }

  private handleReset = () => {
    this.setState({ error: null })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight">
            Something went wrong
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            We hit an unexpected error while rendering this page. The team has
            been notified — try again, or reload if the problem persists.
          </p>
        </div>
        <pre className="max-w-xl overflow-x-auto rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-left text-[11px] leading-relaxed text-muted-foreground">
          {this.state.error.message}
        </pre>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={this.handleReset} variant="outline">
            Try again
          </Button>
          <Button
            onClick={this.handleReload}
            className="bg-brand-gradient text-primary-foreground shadow-brand hover:bg-brand-gradient"
          >
            <RefreshCw className="mr-1.5 size-4" /> Reload page
          </Button>
        </div>
      </div>
    )
  }
}
