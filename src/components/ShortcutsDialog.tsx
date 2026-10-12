import {
  AppModal,
  AppModalBody,
  AppModalHeader,
} from '@/components/ui/app-modal'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'

type Shortcut = { keys: string[]; label: string; adminOnly?: boolean }

const GROUPS: { title: string; items: Shortcut[] }[] = [
  {
    title: 'Global',
    items: [
      { keys: ['⌘', 'K'], label: 'Open command palette' },
      { keys: ['Ctrl', 'K'], label: 'Open command palette (Windows / Linux)' },
      { keys: ['/'], label: 'Focus the search bar' },
      { keys: ['?'], label: 'Show keyboard shortcuts' },
      { keys: ['Esc'], label: 'Close dialog / palette' },
    ],
  },
  {
    title: 'Navigation',
    items: [
      { keys: ['G', 'D'], label: 'Go to Dashboard' },
      { keys: ['G', 'P'], label: 'Go to Papers' },
      { keys: ['G', 'C'], label: 'Go to Courses' },
      { keys: ['G', 'S'], label: 'Go to Students' },
      { keys: ['G', 'I'], label: 'Go to Instructors', adminOnly: true },
      { keys: ['G', 'Y'], label: 'Go to Academics', adminOnly: true },
      { keys: ['G', 'R'], label: 'Go to Reports' },
      { keys: ['G', 'A'], label: 'Go to Activity' },
    ],
  },
]

function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-border/80 bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground shadow-[inset_0_-1px_0_hsl(var(--border))]">
      {children}
    </kbd>
  )
}

export function ShortcutsDialog({
  open,
  onOpenChange,
  hideAdminShortcuts = false,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  hideAdminShortcuts?: boolean
}) {
  return (
    <AppModal open={open} onOpenChange={onOpenChange} size="md">
      <AppModalHeader>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription>
          Speed through the console without touching the mouse.
        </DialogDescription>
      </AppModalHeader>
      <AppModalBody className="space-y-5">
        {GROUPS.map((group) => {
          const items = group.items.filter((shortcut) => !hideAdminShortcuts || !shortcut.adminOnly)
          return (
          <section key={group.title}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {group.title}
            </p>
            <ul className="space-y-1.5">
              {items.map((shortcut) => (
                <li
                  key={shortcut.label}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="text-foreground">{shortcut.label}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((k, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            then
                          </span>
                        ) : null}
                        <KeyBadge>{k}</KeyBadge>
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          )
        })}
      </AppModalBody>
    </AppModal>
  )
}
