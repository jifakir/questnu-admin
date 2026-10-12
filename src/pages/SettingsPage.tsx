import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Bell,
  CheckCircle2,
  Keyboard,
  Loader2,
  LogOut,
  Plug,
  RotateCcw,
  Settings,
  Shield,
  SlidersHorizontal,
  UserCog,
  XCircle,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/PageHeader'
import { ShortcutsDialog } from '@/components/ShortcutsDialog'
import { fetchCourses } from '@/api'
import { useAuth } from '@/auth'
import { API_BASE } from '@/config'
import { formatDateTime, formatRelative } from '@/lib/format'
import {
  LANDING_PAGES,
  resetPreferences,
  usePreferences,
  type LandingPage,
} from '@/lib/preferences'
import { cn } from '@/lib/utils'

type SectionId = 'profile' | 'preferences' | 'notifications' | 'security' | 'connection'

const SECTIONS: { id: SectionId; label: string; icon: typeof Bell }[] = [
  { id: 'profile', label: 'Profile', icon: UserCog },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'connection', label: 'Connection', icon: Plug },
]

type TokenClaims = { sub?: string; email?: string; role?: string; iat?: number; exp?: number }

function decodeClaims(token: string | null): TokenClaims {
  if (!token) return {}
  try {
    return JSON.parse(atob(token.split('.')[1] ?? '')) as TokenClaims
  } catch {
    return {}
  }
}

type Probe =
  | { state: 'checking' }
  | { state: 'ok'; ms: number; at: number }
  | { state: 'error'; message: string; at: number }

async function probeApi(): Promise<Probe> {
  const started = performance.now()
  try {
    await fetchCourses()
    return { state: 'ok', ms: Math.round(performance.now() - started), at: Date.now() }
  } catch (e: unknown) {
    return {
      state: 'error',
      message: e instanceof Error ? e.message : 'Request failed',
      at: Date.now(),
    }
  }
}

export function SettingsPage() {
  const { email, token, role, signOut } = useAuth()
  const [prefs, setPrefs] = usePreferences()
  const location = useLocation()
  const navigate = useNavigate()
  const hash = location.hash.replace('#', '')
  const active: SectionId = SECTIONS.some((s) => s.id === hash) ? (hash as SectionId) : 'profile'
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [probe, setProbe] = useState<Probe>({ state: 'checking' })

  const handle = email ? email.split('@')[0] : 'admin'
  const claims = useMemo(() => decodeClaims(token), [token])
  const displayRole = role ?? claims.role ?? 'instructor'
  const landingPages = LANDING_PAGES.filter(
    (page) => role === 'admin' || page.value !== '/academics',
  )
  const issuedAt = claims.iat ? new Date(claims.iat * 1000).toISOString() : null
  const expiresAt = claims.exp ? new Date(claims.exp * 1000).toISOString() : null

  function show(id: SectionId) {
    navigate({ hash: id === 'profile' ? '' : `#${id}` }, { replace: true })
  }

  function testConnection() {
    setProbe({ state: 'checking' })
    void probeApi().then(setProbe)
  }

  useEffect(() => {
    let cancelled = false
    void probeApi().then((result) => {
      if (!cancelled) setProbe(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Settings}
        title="Settings"
        description="Your account, how this console behaves on this device, and how it reaches the API."
      />

      <div className="grid gap-6 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:self-start lg:pb-0"
        >
          {SECTIONS.map((section) => {
            const Icon = section.icon
            const isActive = section.id === active
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => show(section.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-soft text-brand'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <Icon className="size-4" />
                {section.label}
              </button>
            )
          })}
        </nav>

        <div className="flex min-w-0 flex-col gap-6">
          {active === 'profile' ? (
          <SettingsSection
            id="profile"
            icon={UserCog}
            title="Profile"
            description="Shown on your avatar and in the activity trail."
            aside={<Badge variant="approved" className="capitalize">{displayRole}</Badge>}
          >
            <div className="flex flex-wrap items-center gap-4 px-6 py-5">
              <Avatar className="size-16 ring-2 ring-brand/20">
                <AvatarFallback className="bg-brand-gradient text-xl font-bold text-primary-foreground">
                  {handle.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold capitalize tracking-tight">{handle}</p>
                <p className="truncate text-sm text-muted-foreground">{email ?? '—'}</p>
              </div>
            </div>
            <SettingsRow label="Display name" description="Taken from the part of your email before @.">
              <ValueText>{handle}</ValueText>
            </SettingsRow>
            <SettingsRow label="Email" description="Used to sign in to this console.">
              <ValueText>{email ?? '—'}</ValueText>
            </SettingsRow>
            <SettingsRow
              label="Account changes"
              description="Name, email, and role are managed on the API. Ask another administrator to change them."
            />
          </SettingsSection>
          ) : null}

          {active === 'preferences' ? (
          <SettingsSection
            id="preferences"
            icon={SlidersHorizontal}
            title="Preferences"
            description="How the console opens and lays itself out on this device."
            aside={<Badge variant="outline" className="border-border/70 text-muted-foreground">This device</Badge>}
            footer={
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-muted-foreground"
                onClick={() => {
                  resetPreferences()
                  toast.success('Preferences reset')
                }}
              >
                <RotateCcw className="size-3.5" /> Reset to defaults
              </Button>
            }
          >
            <SettingsRow label="Start page" description="Where you land after signing in.">
              <NativeSelect
                aria-label="Start page"
                value={
                  landingPages.some((page) => page.value === prefs.landingPage)
                    ? prefs.landingPage
                    : '/dashboard'
                }
                onChange={(e) => setPrefs({ landingPage: e.target.value as LandingPage })}
                className="w-44"
              >
                {landingPages.map((page) => (
                  <option key={page.value} value={page.value}>
                    {page.label}
                  </option>
                ))}
              </NativeSelect>
            </SettingsRow>
            <SettingsRow
              label="Compact sidebar"
              description="Open the console with the sidebar collapsed to icons."
            >
              <Switch
                aria-label="Compact sidebar"
                checked={prefs.compactSidebar}
                onCheckedChange={(next) => setPrefs({ compactSidebar: next })}
              />
            </SettingsRow>
          </SettingsSection>
          ) : null}

          {active === 'notifications' ? (
          <SettingsSection
            id="notifications"
            icon={Bell}
            title="Notifications"
            description="Which alerts show up in this console."
            aside={<Badge variant="outline" className="border-border/70 text-muted-foreground">This device</Badge>}
          >
            <SettingsRow
              label="Pending review digest"
              description="A summary of papers waiting for approval."
            >
              <Switch
                aria-label="Pending review digest"
                checked={prefs.notifyPendingDigest}
                onCheckedChange={(next) => setPrefs({ notifyPendingDigest: next })}
              />
            </SettingsRow>
            <SettingsRow label="AI failures" description="When a paper fails processing and needs a retry.">
              <Switch
                aria-label="AI failures"
                checked={prefs.notifyAiFailures}
                onCheckedChange={(next) => setPrefs({ notifyAiFailures: next })}
              />
            </SettingsRow>
            <SettingsRow
              label="Course publish alerts"
              description="When a course moves from draft to published."
            >
              <Switch
                aria-label="Course publish alerts"
                checked={prefs.notifyCoursePublish}
                onCheckedChange={(next) => setPrefs({ notifyCoursePublish: next })}
              />
            </SettingsRow>
          </SettingsSection>
          ) : null}

          {active === 'security' ? (
          <SettingsSection
            id="security"
            icon={Shield}
            title="Security"
            description="Your sign-in and the session on this device."
          >
            <SettingsRow label="Sign-in method" description="Email and password against the QuestNU API.">
              <ValueText>Email + password</ValueText>
            </SettingsRow>
            <SettingsRow
              label="Current session"
              description={
                issuedAt
                  ? `Signed in ${formatRelative(issuedAt)} · ${formatDateTime(issuedAt)}`
                  : 'Signed in on this device.'
              }
            >
              <ValueText>
                {expiresAt ? `Expires ${formatDateTime(expiresAt)}` : 'No expiry on token'}
              </ValueText>
            </SettingsRow>
            <SettingsRow label="Two-factor authentication" description="Not offered by the API yet.">
              <Badge variant="outline" className="border-border/70 text-muted-foreground">
                Not available
              </Badge>
            </SettingsRow>
            <SettingsRow
              label="Sign out"
              description="Clears the auth token stored in this browser."
            >
              <Button
                variant="outline"
                className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={signOut}
              >
                <LogOut className="size-4" /> Sign out
              </Button>
            </SettingsRow>
          </SettingsSection>
          ) : null}

          {active === 'connection' ? (
          <SettingsSection
            id="connection"
            icon={Plug}
            title="Connection"
            description="The API this console reads from and writes to."
          >
            <SettingsRow label="API endpoint" description="Set with VITE_API_URL at build time.">
              <code className="rounded-md border border-border/70 bg-muted px-2 py-1 font-mono text-xs">
                {API_BASE}
              </code>
            </SettingsRow>
            <SettingsRow
              label="Status"
              description={
                probe.state === 'ok'
                  ? `Responded in ${probe.ms} ms · checked ${formatRelative(new Date(probe.at).toISOString())}`
                  : probe.state === 'error'
                    ? probe.message
                    : 'Checks the catalog endpoint with your current token.'
              }
            >
              <div className="flex items-center gap-2">
                {probe.state === 'ok' ? (
                  <Badge variant="approved" className="gap-1">
                    <CheckCircle2 className="size-3" /> Connected
                  </Badge>
                ) : probe.state === 'error' ? (
                  <Badge variant="failed" className="gap-1">
                    <XCircle className="size-3" /> Unreachable
                  </Badge>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={probe.state === 'checking'}
                  onClick={testConnection}
                >
                  {probe.state === 'checking' ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Test connection
                </Button>
              </div>
            </SettingsRow>
            <SettingsRow label="Keyboard shortcuts" description="Jump between pages without the mouse.">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShortcutsOpen(true)}>
                <Keyboard className="size-3.5" /> View shortcuts
              </Button>
            </SettingsRow>
            <SettingsRow label="Build" description="Vite mode this bundle was built in.">
              <ValueText className="capitalize">{import.meta.env.MODE}</ValueText>
            </SettingsRow>
          </SettingsSection>
          ) : null}
        </div>
      </div>

      <ShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        hideAdminShortcuts={role !== 'admin'}
      />
    </div>
  )
}

function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  aside,
  footer,
  children,
}: {
  id: SectionId
  icon: typeof Bell
  title: string
  description: string
  aside?: ReactNode
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <Card
      id={`settings-${id}`}
      className="overflow-hidden rounded-2xl border-border/70 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05)]"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 border-b border-border/60 bg-muted/20 px-6 py-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Icon className="size-4" />
          </span>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-0.5">{description}</CardDescription>
          </div>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </CardHeader>
      <CardContent className="divide-y divide-border/60 p-0">{children}</CardContent>
      {footer ? (
        <div className="flex justify-end border-t border-border/60 bg-muted/20 px-4 py-2">{footer}</div>
      ) : null}
    </Card>
  )
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 py-4">
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex shrink-0 items-center">{children}</div> : null}
    </div>
  )
}

function ValueText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('text-sm font-medium text-foreground', className)}>{children}</span>
}
