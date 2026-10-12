import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity,
  Bell,
  BookOpen,
  Library,
  ChartColumn,
  ChevronUp,
  Building2,
  FileQuestion,
  Files,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Search,
  Settings,
  Sparkles,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CommandPalette } from '@/components/CommandPalette'
import { ShortcutsDialog } from '@/components/ShortcutsDialog'
import { getPreferences } from '@/lib/preferences'
import { cn } from '@/lib/utils'
import { isAdminOnlyPath, useAuth } from '@/auth'
import { SearchProvider, useSearch } from '@/search'

const NAV_ITEMS: {
  group: string
  adminOnly?: boolean
  items: {
    to: string
    label: string
    icon: typeof LayoutDashboard
    end?: boolean
    adminOnly?: boolean
  }[]
}[] = [
  {
    group: 'General',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/papers', label: 'Papers', icon: Files },
      { to: '/courses', label: 'Courses', icon: BookOpen },
      { to: '/students', label: 'Students', icon: Users },
      { to: '/instructors', label: 'Instructors', icon: UserCog, adminOnly: true },
    ],
  },
  {
    group: 'Academics',
    adminOnly: true,
    items: [
      { to: '/academics', label: 'Overview', icon: GraduationCap, end: true },
      { to: '/academics/structure', label: 'Structure', icon: Building2 },
      { to: '/academics/courses', label: 'Courses', icon: Library },
      { to: '/academics/syllabus', label: 'Syllabus', icon: ScrollText },
      { to: '/academics/question-bank', label: 'Question Bank', icon: FileQuestion },
    ],
  },
  {
    group: 'Insights',
    items: [
      { to: '/reports', label: 'Reports', icon: ChartColumn },
      { to: '/activity', label: 'Activity', icon: Activity },
    ],
  },
  {
    group: 'Workspace',
    adminOnly: true,
    items: [{ to: '/settings', label: 'Settings', icon: Settings }],
  },
]

const BREADCRUMBS: Record<string, string> = {
  dashboard: 'Dashboard',
  papers: 'Papers',
  courses: 'Courses',
  students: 'Students',
  instructors: 'Instructors',
  academics: 'Academics',
  structure: 'Structure',
  syllabus: 'Syllabus',
  'question-bank': 'Question Bank',
  reports: 'Reports',
  activity: 'Activity',
  settings: 'Settings',
  profile: 'Profile',
  new: 'New',
  edit: 'Edit',
}

const LIST_SEARCH_ROUTES: Record<
  string,
  { placeholder: string }
> = {
  '/papers': { placeholder: 'Search papers by ID, student, status…' },
  '/courses': { placeholder: 'Search courses by title, module, or lesson…' },
  '/students': { placeholder: 'Search students by email or ID…' },
  '/instructors': { placeholder: 'Search instructors by name, email, or ID…' },
  '/academics/structure': { placeholder: 'Search departments, years, or colleges…' },
  '/academics/courses': { placeholder: 'Search courses by code or title…' },
  '/academics/syllabus': { placeholder: 'Search courses by code, title, or slug…' },
  '/academics/question-bank': { placeholder: 'Search questions by prompt or course…' },
}

function getSearchConfig(path: string): {
  placeholder: string
  enabled: boolean
} {
  const listCfg = LIST_SEARCH_ROUTES[path]
  if (listCfg) {
    return { placeholder: listCfg.placeholder, enabled: true }
  }
  return {
    placeholder: 'Search or jump to…',
    enabled: false,
  }
}

function Breadcrumbs() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null
  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex"
    >
      <Link to="/dashboard" className="hover:text-brand">
        Home
      </Link>
      {segments.map((seg, idx) => {
        const path = '/' + segments.slice(0, idx + 1).join('/')
        const label =
          BREADCRUMBS[seg] ??
          (seg.length > 10 ? `${seg.slice(0, 6)}…${seg.slice(-3)}` : seg)
        const isLast = idx === segments.length - 1
        return (
          <span key={path} className="flex items-center gap-1.5">
            <span className="text-muted-foreground/50">/</span>
            {isLast ? (
              <span className="font-semibold text-foreground">{label}</span>
            ) : (
              <Link to={path} className="hover:text-brand">
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}

function CommandKHint({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'pointer-events-none inline-flex items-center gap-0.5 rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground',
        className,
      )}
    >
      <span>⌘</span>
      <span>K</span>
    </span>
  )
}

function TopHeader({
  searchRef,
  onOpenPalette,
  onOpenMobileNav,
  onOpenShortcuts,
}: {
  searchRef: React.RefObject<HTMLInputElement | null>
  onOpenPalette: () => void
  onOpenMobileNav: () => void
  onOpenShortcuts: () => void
}) {
  const location = useLocation()
  const { query, setQuery } = useSearch()
  const cfg = getSearchConfig(location.pathname)

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-card/80 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-4 md:gap-3 md:px-6">
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
        >
          <Menu className="size-4" />
        </Button>

        <Breadcrumbs />

        <div className="min-w-0 flex-1" />

        {cfg.enabled ? (
          <div className="group relative flex h-9 min-w-0 w-full max-w-md flex-1 items-center rounded-lg border border-border/70 bg-background shadow-sm transition-colors focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10">
            <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground transition-colors group-focus-within:text-brand" />
            <Input
              ref={searchRef}
              className="h-9 border-0 bg-transparent pl-9 pr-[4.5rem] text-sm shadow-none focus-visible:ring-0"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={cfg.placeholder}
              aria-label="Filter current page"
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              <kbd className="hidden rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
                /
              </kbd>
              <button
                type="button"
                onClick={onOpenPalette}
                className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Open command palette"
              >
                <CommandKHint />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenPalette}
            className="group hidden h-9 min-w-0 w-full max-w-md flex-1 items-center gap-2 rounded-lg border border-border/70 bg-background px-3 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-brand/30 hover:bg-muted/30 sm:flex"
            aria-label="Open command palette"
          >
            <Search className="size-4 shrink-0 text-muted-foreground group-hover:text-brand" />
            <span className="min-w-0 flex-1 truncate">{cfg.placeholder}</span>
            <CommandKHint />
          </button>
        )}

        <div className="flex shrink-0 items-center gap-0.5 border-l border-border/60 pl-2 md:pl-3">
          {!cfg.enabled ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground sm:hidden"
                  onClick={onOpenPalette}
                  aria-label="Open command palette"
                >
                  <Search className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Command palette (⌘K)</TooltipContent>
            </Tooltip>
          ) : null}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={onOpenShortcuts}
                aria-label="Keyboard shortcuts"
              >
                <HelpCircle className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Shortcuts (?)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                disabled
                aria-label="Notifications"
              >
                <Bell className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications (coming soon)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  )
}

function SideNavItem({
  to,
  label,
  icon: Icon,
  collapsed,
  onNavigate,
  end,
}: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  collapsed: boolean
  onNavigate?: () => void
  end?: boolean
}) {
  const link = (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground',
          collapsed && 'justify-center px-0',
          isActive &&
            'border border-brand/15 bg-brand-soft text-brand shadow-[inset_2px_0_0_0_hsl(var(--brand))] hover:bg-brand-soft hover:text-brand',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'size-4 shrink-0 transition-colors',
              isActive
                ? 'text-brand'
                : 'text-muted-foreground group-hover:text-foreground',
            )}
          />
          {!collapsed ? <span className="truncate">{label}</span> : null}
        </>
      )}
    </NavLink>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function AccountMenu({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  const { email, role, signOut } = useAuth()
  const navigate = useNavigate()
  const initial = email?.slice(0, 1)?.toUpperCase() ?? 'A'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-3 rounded-2xl border border-transparent p-2 text-left transition-colors hover:border-brand/15 hover:bg-brand-soft/60 data-[state=open]:border-brand/15 data-[state=open]:bg-brand-soft/60',
            collapsed && 'justify-center',
          )}
          aria-label="Account menu"
        >
          <Avatar className="size-10 ring-2 ring-brand/20">
            <AvatarFallback className="bg-brand-gradient text-sm font-semibold text-primary-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-sm font-semibold text-foreground"
                  title={email ?? undefined}
                >
                  {email ?? 'Account'}
                </span>
                <span className="block text-xs capitalize text-muted-foreground">
                  {role ?? 'Account'}
                </span>
              </span>
              <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
            </>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={collapsed ? 'right' : 'top'}
        align={collapsed ? 'end' : 'start'}
        className="w-56"
      >
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {email ?? 'Account'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            onNavigate?.()
            navigate('/profile')
          }}
        >
          <UserCog className="size-4" /> Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            onNavigate?.()
            signOut()
          }}
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Sidebar({
  collapsed,
  onToggle,
  onItemClick,
}: {
  collapsed: boolean
  onToggle?: () => void
  onItemClick?: () => void
}) {
  const { role } = useAuth()
  const navItems = NAV_ITEMS.filter((group) => role === 'admin' || !group.adminOnly)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => role === 'admin' || !item.adminOnly),
    }))
    .filter((group) => group.items.length > 0)
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'relative flex items-center gap-3 border-b border-sidebar-border px-4 py-5',
          collapsed && 'justify-center px-2',
        )}
      >
        <Link
          to="/dashboard"
          onClick={onItemClick}
          className="flex min-w-0 flex-1 items-center gap-3 outline-none"
        >
          <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-gradient shadow-brand ring-1 ring-white/30">
            <img
              src="/brand/logo.png"
              alt="QuestNU"
              className="size-7 object-contain drop-shadow-sm"
            />
          </span>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-base font-bold leading-tight tracking-tight">
                Quest<span className="text-brand">NU</span>
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Admin console
              </p>
            </div>
          ) : null}
        </Link>
        {onToggle ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  'shrink-0 rounded-full text-muted-foreground hover:bg-brand-soft hover:text-brand',
                  collapsed && 'absolute right-2 top-4',
                )}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                onClick={onToggle}
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-4" />
                ) : (
                  <PanelLeftClose className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      <nav
        className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4"
        aria-label="Admin navigation"
      >
        {navItems.map((group) => (
          <div key={group.group} className="space-y-1">
            {!collapsed ? (
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                {group.group}
              </p>
            ) : null}
            {group.items.map((item) => (
              <SideNavItem
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                collapsed={collapsed}
                onNavigate={onItemClick}
                end={'end' in item ? item.end : false}
              />
            ))}
          </div>
        ))}

        {!collapsed ? (
          <div className="mt-auto rounded-2xl border border-brand/15 bg-brand-soft/70 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-brand">
              <Sparkles className="size-4" />
              Need a hand?
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Press <kbd className="rounded border bg-background/80 px-1 font-mono text-[10px]">?</kbd>{' '}
              to see shortcuts, or{' '}
              <kbd className="rounded border bg-background/80 px-1 font-mono text-[10px]">
                ⌘K
              </kbd>{' '}
              for the command palette.
            </p>
          </div>
        ) : null}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <AccountMenu collapsed={collapsed} onNavigate={onItemClick} />
      </div>
    </div>
  )
}

const NAV_HOTKEYS: Record<string, string> = {
  d: '/dashboard',
  p: '/papers',
  c: '/courses',
  s: '/students',
  i: '/instructors',
  y: '/academics',
  r: '/reports',
  a: '/activity',
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

function AppShellInner() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => getPreferences().compactSidebar,
  )
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const navigate = useNavigate()
  const { role } = useAuth()
  const searchRef = useRef<HTMLInputElement>(null)
  const gPressedRef = useRef<{ at: number } | null>(null)

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey

      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setPaletteOpen((v) => !v)
        return
      }

      if (isTypingTarget(e.target)) return

      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }

      if (e.key === '?') {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }

      if (e.key === 'g' || e.key === 'G') {
        gPressedRef.current = { at: Date.now() }
        return
      }

      const recentG = gPressedRef.current
      if (recentG && Date.now() - recentG.at < 1200) {
        const key = e.key.toLowerCase()
        const target = NAV_HOTKEYS[key]
        if (target && (role === 'admin' || !isAdminOnlyPath(target))) {
          e.preventDefault()
          gPressedRef.current = null
          navigate(target)
          return
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, role])

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <aside
        className={cn(
          'fixed bottom-0 left-0 top-0 z-20 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[0_0_0_1px_hsl(var(--border)/0.5)] transition-[width] duration-200 md:flex',
          sidebarCollapsed ? 'w-[76px]' : 'w-[280px]',
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
      </aside>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={closeMobileNav}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl animate-in slide-in-from-left">
            <div className="absolute right-2 top-3 z-10">
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full text-muted-foreground hover:bg-brand-soft hover:text-brand"
                onClick={closeMobileNav}
                aria-label="Close navigation"
              >
                <X className="size-4" />
              </Button>
            </div>
            <Sidebar collapsed={false} onItemClick={closeMobileNav} />
          </aside>
        </div>
      ) : null}

      <div
        className={cn(
          'flex min-h-screen flex-col overflow-x-hidden',
          'md:ml-[280px] md:w-[calc(100%-280px)]',
          sidebarCollapsed && 'md:ml-[76px] md:w-[calc(100%-76px)]',
        )}
      >
        <TopHeader
          searchRef={searchRef}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />

        <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden p-4 md:p-6">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-4 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05),0_24px_60px_-30px_hsl(var(--brand-shadow)/0.2)] backdrop-blur-sm md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />
      <ShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        hideAdminShortcuts={role !== 'admin'}
      />
    </div>
  )
}

export function AppShell() {
  return (
    <SearchProvider>
      <AppShellInner />
    </SearchProvider>
  )
}
