import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowRight,
  BookOpenCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/api'
import { isAdminOnlyPath, useAuth } from '@/auth'
import { getPreferences } from '@/lib/preferences'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()
  const from =
    (location.state as { from?: string } | null)?.from ??
    getPreferences().landingPage

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const res = await login(email.trim(), password)
      if (res.user.role !== 'instructor' && res.user.role !== 'admin') {
        throw new Error('Sign in requires an instructor or admin account.')
      }
      signIn(res.access_token, res.user.email)
      toast.success('Welcome back', { description: res.user.email })
      const dest =
        res.user.role === 'admin' || !isAdminOnlyPath(from) ? from : '/dashboard'
      navigate(dest, { replace: true })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed'
      setErr(msg)
      toast.error('Sign in failed', { description: msg })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-background grid h-screen w-full overflow-hidden lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      <div className="relative flex h-full flex-col px-5 py-6 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="bg-brand-gradient shadow-brand flex size-9 items-center justify-center rounded-xl ring-1 ring-white/30">
              <img
                src="/brand/logo.png"
                alt="QuestNU"
                className="size-6 object-contain drop-shadow-sm"
              />
            </span>
            <p className="text-base font-bold tracking-tight">
              Quest<span className="text-brand">NU</span>
            </p>
          </div>
          <a
            href="mailto:hello@questnu.bd"
            className="text-muted-foreground hover:text-brand ml-auto text-xs font-medium transition-colors"
          >
            Need access? Contact IT →
          </a>
        </header>

        <main className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <div className="border-brand/15 bg-brand/5 text-brand mb-5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
              <Sparkles className="size-3" />
              Admin console
            </div>

            <h1 className="text-foreground text-3xl font-bold tracking-tight">
              Welcome back
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Sign in to manage courses and review exam evaluations.
            </p>

            <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
                >
                  Work email
                </Label>
                <div className="group relative">
                  <Mail className="text-muted-foreground group-focus-within:text-brand pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="you@institution.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-border/70 bg-card/80 focus-visible:ring-brand/40 focus-visible:border-brand/40 h-11 rounded-xl pl-10 text-sm shadow-sm transition-shadow focus-visible:ring-4"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide"
                  >
                    Password
                  </Label>
                  <button
                    type="button"
                    className="text-brand hover:text-brand-hover text-[11px] font-semibold transition-colors"
                    onClick={() =>
                      toast.info('Password reset', {
                        description:
                          'Contact IT to reset your admin password.',
                      })
                    }
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="group relative">
                  <Lock className="text-muted-foreground group-focus-within:text-brand pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-border/70 bg-card/80 focus-visible:ring-brand/40 focus-visible:border-brand/40 h-11 rounded-xl pl-10 pr-11 text-sm shadow-sm transition-shadow focus-visible:ring-4"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {err ? (
                <div
                  role="alert"
                  className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 rounded-xl border px-3 py-2 text-xs"
                >
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                  <span className="font-medium leading-snug">{err}</span>
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={busy}
                className="bg-brand-gradient shadow-brand hover:bg-brand-gradient group h-11 w-full rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-80"
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2 animate-pulse rounded-full bg-white/80" />
                    Signing in…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Sign in securely
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        </main>

        <footer className="text-muted-foreground flex items-center justify-between gap-3 text-[11px]">
          <span>© {new Date().getFullYear()} QuestNU</span>
          <span>Powered by FakirSoft</span>
        </footer>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Brand panel — compact, single-viewport                                     */
/* -------------------------------------------------------------------------- */

function BrandPanel() {
  return (
    <aside className="relative hidden h-full overflow-hidden text-white lg:block">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(135deg, hsl(160 70% 18%) 0%, hsl(158 68% 24%) 38%, hsl(150 62% 36%) 72%, hsl(145 65% 46%) 100%)',
        }}
      />
      <div className="pointer-events-none absolute -left-32 -top-32 size-[460px] rounded-full bg-[radial-gradient(closest-side,hsl(150_85%_60%/0.45),transparent)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 size-[520px] rounded-full bg-[radial-gradient(closest-side,hsl(170_70%_55%/0.35),transparent)] blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/15 to-transparent" />

      <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/30 backdrop-blur">
            <img
              src="/brand/logo.png"
              alt="QuestNU"
              className="size-7 object-contain"
            />
          </span>
          <div className="leading-tight">
            <p className="text-lg font-bold tracking-tight">QuestNU LMS</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/65">
              Enterprise edition
            </p>
          </div>
        </div>

        <div className="max-w-lg">
          <h2 className="text-[2.25rem] font-bold leading-[1.08] tracking-tight xl:text-[2.6rem]">
            Education,{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, #ECFFF5 0%, #BFFFE0 60%, #7AF0C1 100%)',
              }}
            >
              elevated.
            </span>
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
            One secure console for course design, classes, and AI-assisted
            exam evaluation.
          </p>

          <ul className="mt-7 grid max-w-md gap-2.5">
            <FeaturePill
              icon={<BookOpenCheck className="size-4" />}
              text="Courses, modules & lessons (live, video, exam)"
            />
            <FeaturePill
              icon={<Sparkles className="size-4" />}
              text="Gemini-powered grading with instructor sign-off"
            />
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] uppercase tracking-[0.18em] text-white/55">
          <ShieldCheck className="size-3.5 text-white/70" />
          <span>ISO 27001</span>
          <span className="text-white/30">·</span>
          <span>SOC 2</span>
          <span className="text-white/30">·</span>
          <span>FERPA-ready</span>
          <span className="text-white/30">·</span>
          <span>GDPR</span>
        </div>
      </div>
    </aside>
  )
}

function FeaturePill({
  icon,
  text,
}: {
  icon: React.ReactNode
  text: string
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/[0.06] px-3.5 py-2.5 backdrop-blur-sm">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/20">
        {icon}
      </span>
      <p className="text-xs font-medium leading-snug text-white/90">{text}</p>
    </li>
  )
}
