import { useMemo } from 'react'
import { ListTree, TriangleAlert } from 'lucide-react'

import { extractHeadings, extractSidebarHeadings } from './blogUtils'

/**
 * Live preview of the public article's "এই গাইডে / In this guide" sidebar,
 * which is built only from level-2 (`## Heading`) headings.
 */
export function SidebarHeadingsHint({ body, title }: { body: string; title: string }) {
  const { h2, hasDeeper } = useMemo(
    () => ({
      h2: extractSidebarHeadings(body),
      hasDeeper: extractHeadings(body).some((h) => h.level === 3 || h.level === 4),
    }),
    [body],
  )

  const normTitle = title.trim().toLowerCase()
  const repeatsTitle = !!normTitle && h2.some((t) => t.trim().toLowerCase() === normTitle)
  const deeperOnly = h2.length <= 1 && hasDeeper

  return (
    <div className="mt-2 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        <ListTree className="size-3.5" />
        In this guide (sidebar preview)
      </p>
      {h2.length === 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          No ## headings yet — each <code className="font-mono">## Heading</code> becomes a sidebar link.
        </p>
      ) : (
        <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-sm">
          {h2.map((t, i) => (
            <li key={`${i}-${t}`} className="line-clamp-1">
              {t}
            </li>
          ))}
        </ol>
      )}
      {repeatsTitle ? (
        <Warning>
          This heading repeats the title — the page already shows the title, so start sections with ## below it.
        </Warning>
      ) : null}
      {deeperOnly ? (
        <Warning>Your sections use ### / #### — only ## headings appear in the sidebar.</Warning>
      ) : null}
    </div>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
      <TriangleAlert className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
