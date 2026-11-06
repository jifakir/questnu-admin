import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Handshake,
  ImagePlus,
  Loader2,
  PlusCircle,
  Save,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  blogImageUrl,
  fetchBlogAuthors,
  fetchEllcProfile,
  updateEllcProfile,
  uploadBlogImage,
} from '@/api'
import { SITE_URL } from '@/config'
import type { BlogAuthor, EllcProfile, EllcWritePayload } from '@/types'
import {
  ELLC_LIMITS,
  authorInitials,
  isHttpUrl,
  splitLines,
  validateBlogImage,
} from './blogUtils'

type FaqRow = { key: number; question: string; answer: string }

type FormState = {
  name: string
  tagline: string
  description: string
  /** One subject per line. */
  subjects: string
  faqs: FaqRow[]
  logo: string | null
  facebookPageUrl: string
  facebookGroupUrl: string
  youtubeUrl: string
  websiteUrl: string
  showOnHomepage: boolean
}

type UrlKey = 'facebookPageUrl' | 'facebookGroupUrl' | 'youtubeUrl' | 'websiteUrl'
type TextKey = 'name' | 'tagline' | 'description' | 'subjects' | UrlKey

const URL_LABELS: Record<UrlKey, string> = {
  facebookPageUrl: 'Facebook Page URL',
  facebookGroupUrl: 'Facebook Group URL',
  youtubeUrl: 'YouTube channel URL',
  websiteUrl: 'Website URL',
}

const PAYLOAD_KEYS: (keyof EllcWritePayload)[] = [
  'name',
  'tagline',
  'description',
  'subjects',
  'faqs',
  'logo',
  'facebookPageUrl',
  'facebookGroupUrl',
  'youtubeUrl',
  'websiteUrl',
  'showOnHomepage',
]

let faqSeq = 0
function faqRow(question = '', answer = ''): FaqRow {
  faqSeq += 1
  return { key: faqSeq, question, answer }
}

const EMPTY_FORM: FormState = {
  name: '',
  tagline: '',
  description: '',
  subjects: '',
  faqs: [],
  logo: null,
  facebookPageUrl: '',
  facebookGroupUrl: '',
  youtubeUrl: '',
  websiteUrl: '',
  showOnHomepage: false,
}

function profileToForm(p: EllcProfile): FormState {
  return {
    name: p.name ?? '',
    tagline: p.tagline ?? '',
    description: p.description ?? '',
    subjects: (p.subjects ?? []).join('\n'),
    faqs: (p.faqs ?? []).map((f) => faqRow(f.question, f.answer)),
    logo: p.logo ?? null,
    facebookPageUrl: p.facebookPageUrl ?? '',
    facebookGroupUrl: p.facebookGroupUrl ?? '',
    youtubeUrl: p.youtubeUrl ?? '',
    websiteUrl: p.websiteUrl ?? '',
    showOnHomepage: !!p.showOnHomepage,
  }
}

/** Normalised API shape: trimmed text, fully empty FAQ rows dropped. */
function toPayload(s: FormState): EllcWritePayload {
  return {
    name: s.name.trim(),
    tagline: s.tagline.trim(),
    description: s.description.trim(),
    subjects: splitLines(s.subjects),
    faqs: s.faqs
      .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
      .filter((f) => f.question || f.answer),
    logo: s.logo,
    facebookPageUrl: s.facebookPageUrl.trim(),
    facebookGroupUrl: s.facebookGroupUrl.trim(),
    youtubeUrl: s.youtubeUrl.trim(),
    websiteUrl: s.websiteUrl.trim(),
    showOnHomepage: s.showOnHomepage,
  }
}

/** Only the keys whose value differs from what is saved. */
function diffPayload(
  next: EllcWritePayload,
  saved: EllcWritePayload | null,
): Partial<EllcWritePayload> {
  if (!saved) return next
  const out: Partial<EllcWritePayload> = {}
  for (const key of PAYLOAD_KEYS) {
    if (JSON.stringify(next[key]) !== JSON.stringify(saved[key])) {
      ;(out as Record<string, unknown>)[key] = next[key]
    }
  }
  return out
}

/** Mirrors server-side validation. Returns a friendly message or null. */
function validate(p: EllcWritePayload): string | null {
  if (!p.name) return 'Name is required'
  if (p.name.length > ELLC_LIMITS.name)
    return `Name must be ${ELLC_LIMITS.name} characters or fewer`
  if (!p.tagline) return 'Tagline is required — it is the one-liner on the ELLC badge and card'
  if (p.tagline.length > ELLC_LIMITS.tagline)
    return `Tagline must be ${ELLC_LIMITS.tagline} characters or fewer`
  if (p.description.length > ELLC_LIMITS.description)
    return `Description must be ${ELLC_LIMITS.description} characters or fewer`
  for (const key of Object.keys(URL_LABELS) as UrlKey[]) {
    const v = p[key]
    if (!v) continue
    if (!isHttpUrl(v)) return `${URL_LABELS[key]} must start with http:// or https://`
    if (v.length > ELLC_LIMITS.url)
      return `${URL_LABELS[key]} must be ${ELLC_LIMITS.url} characters or fewer`
  }
  if (p.subjects.length > ELLC_LIMITS.subjects)
    return `At most ${ELLC_LIMITS.subjects} subjects (you have ${p.subjects.length})`
  const longSubject = p.subjects.find((v) => v.length > ELLC_LIMITS.subject)
  if (longSubject)
    return `Each subject must be ${ELLC_LIMITS.subject} characters or fewer ("${longSubject.slice(0, 30)}…")`
  if (p.faqs.length > ELLC_LIMITS.faqs) return `At most ${ELLC_LIMITS.faqs} FAQs`
  for (const [i, f] of p.faqs.entries()) {
    const n = i + 1
    if (!f.question) return `FAQ ${n} needs a question (or clear its answer to remove it)`
    if (!f.answer) return `FAQ ${n} needs an answer (or clear its question to remove it)`
    if (f.question.length > ELLC_LIMITS.question)
      return `FAQ ${n}: question must be ${ELLC_LIMITS.question} characters or fewer`
    if (f.answer.length > ELLC_LIMITS.answer)
      return `FAQ ${n}: answer must be ${ELLC_LIMITS.answer} characters or fewer`
  }
  return null
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

const labelCls = 'text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground'

export function BlogEllcPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saved, setSaved] = useState<EllcWritePayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [writers, setWriters] = useState<BlogAuthor[] | null>(null)
  const [writersError, setWritersError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    fetchEllcProfile()
      .then((p) => {
        if (cancelled) return
        const f = profileToForm(p)
        setForm(f)
        setSaved(toPayload(f))
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(errMsg(e) || 'Failed to load the ELLC profile')
      })
    fetchBlogAuthors()
      .then((data) => {
        if (!cancelled) setWriters(data.filter((a) => a.ellc))
      })
      .catch((e: unknown) => {
        if (!cancelled) setWritersError(errMsg(e) || 'Failed to load authors')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const payload = useMemo(() => toPayload(form), [form])
  const changes = useMemo(() => diffPayload(payload, saved), [payload, saved])
  const loaded = saved !== null
  const dirty = loaded && Object.keys(changes).length > 0

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  function update(key: TextKey, value: string) {
    setForm((s) => ({ ...s, [key]: value }))
  }

  function updateFaq(key: number, patch: Partial<Omit<FaqRow, 'key'>>) {
    setForm((s) => ({
      ...s,
      faqs: s.faqs.map((f) => (f.key === key ? { ...f, ...patch } : f)),
    }))
  }

  function addFaq() {
    if (form.faqs.length >= ELLC_LIMITS.faqs) {
      toast.error(`At most ${ELLC_LIMITS.faqs} FAQs`)
      return
    }
    setForm((s) => ({ ...s, faqs: [...s.faqs, faqRow()] }))
  }

  function removeFaq(key: number) {
    setForm((s) => ({ ...s, faqs: s.faqs.filter((f) => f.key !== key) }))
  }

  function moveFaq(index: number, delta: -1 | 1) {
    setForm((s) => {
      const to = index + delta
      if (to < 0 || to >= s.faqs.length) return s
      const faqs = [...s.faqs]
      ;[faqs[index], faqs[to]] = [faqs[to], faqs[index]]
      return { ...s, faqs }
    })
  }

  async function onLogoPicked(file: File | undefined) {
    if (!file) return
    const problem = validateBlogImage(file)
    if (problem) {
      toast.error(problem)
      return
    }
    setUploading(true)
    try {
      const res = await uploadBlogImage(file)
      setForm((s) => ({ ...s, logo: res.file }))
    } catch (e: unknown) {
      toast.error('Logo upload failed', { description: errMsg(e) })
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    if (!dirty || saving) return
    const problem = validate(payload)
    if (problem) {
      toast.error(problem)
      return
    }
    setSaving(true)
    try {
      const p = await updateEllcProfile(changes)
      const f = profileToForm(p)
      setForm(f)
      setSaved(toPayload(f))
      toast.success('ELLC profile saved')
    } catch (e: unknown) {
      toast.error('Could not save the ELLC profile', { description: errMsg(e) })
    } finally {
      setSaving(false)
    }
  }

  const subjectCount = payload.subjects.length

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" className="rounded-xl">
        <a href={`${SITE_URL}/english-department`} target="_blank" rel="noreferrer">
          <ExternalLink className="size-4" />
          View on site
        </a>
      </Button>
      <Button
        className="rounded-xl"
        onClick={() => void save()}
        disabled={!dirty || saving || uploading}
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save changes
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/blog"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-brand"
      >
        <ArrowLeft className="size-4" />
        All posts
      </Link>
      <PageHeader
        icon={Handshake}
        title="ELLC"
        description="QuestNU's partner for NU English Department subjects. This information powers the English Department page on the website, the ELLC badge and the card after ELLC writers' posts."
        actions={actions}
      />

      {loadError ? (
        <Card className="rounded-2xl border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">{loadError}</CardContent>
        </Card>
      ) : !loaded ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-brand" />
          Loading ELLC profile…
        </div>
      ) : (
        <>
          <Section title="Profile" description="Shown on the ELLC badge, the card after ELLC writers' posts and the English Department page.">
            <div className="flex items-center gap-4">
              {form.logo ? (
                <div className="relative">
                  <img
                    src={blogImageUrl(form.logo)}
                    alt="ELLC logo"
                    className="size-20 rounded-2xl border border-border/70 bg-background object-contain"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute -right-1 -top-1 size-6 rounded-full shadow"
                    onClick={() => setForm((s) => ({ ...s, logo: null }))}
                    aria-label="Remove logo"
                    title="Remove logo"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <span className="flex size-20 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/40 text-lg font-semibold text-muted-foreground">
                  {form.name.trim() ? authorInitials({ name: form.name }) : '?'}
                </span>
              )}
              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit rounded-xl"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                  {form.logo ? 'Replace logo' : 'Upload logo'}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Square image works best · JPEG, PNG, WebP or GIF · max 5 MB
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    void onLogoPicked(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ellc-name" className={labelCls}>
                Name<span className="ml-1 text-destructive">*</span>
              </Label>
              <Input
                id="ellc-name"
                value={form.name}
                maxLength={ELLC_LIMITS.name}
                onChange={(e) => update('name', e.target.value)}
                className="mt-1 h-10 rounded-xl"
                placeholder="ELLC"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="ellc-tagline" className={labelCls}>
                  Tagline<span className="ml-1 text-destructive">*</span>
                </Label>
                <Counter len={payload.tagline.length} max={ELLC_LIMITS.tagline} />
              </div>
              <Input
                id="ellc-tagline"
                value={form.tagline}
                maxLength={ELLC_LIMITS.tagline}
                onChange={(e) => update('tagline', e.target.value)}
                className="mt-1 h-10 rounded-xl"
                placeholder="e.g. Courses for every NU English Department subject"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The one-liner on the ELLC badge and card.
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="ellc-description" className={labelCls}>
                  Description
                </Label>
                <Counter len={payload.description.length} max={ELLC_LIMITS.description} />
              </div>
              <Textarea
                id="ellc-description"
                value={form.description}
                maxLength={ELLC_LIMITS.description}
                onChange={(e) => update('description', e.target.value)}
                rows={7}
                placeholder="Who ELLC is, what it teaches and how students can join…"
                className="mt-1 rounded-xl font-sans"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Blank line = new paragraph. Mention the subjects and years you cover — this text
                helps Google match 'NU English Department' searches.
              </p>
            </div>
          </Section>

          <Section title="Links" description="ELLC's Facebook Page, Group and YouTube channel. They appear as buttons on the site and tell Google these profiles belong to ELLC.">
            <div className="grid gap-3 md:grid-cols-2">
              <UrlField
                id="ellc-fb-page"
                label={URL_LABELS.facebookPageUrl}
                value={form.facebookPageUrl}
                onChange={(v) => update('facebookPageUrl', v)}
                placeholder="https://www.facebook.com/…"
              />
              <UrlField
                id="ellc-fb-group"
                label={URL_LABELS.facebookGroupUrl}
                value={form.facebookGroupUrl}
                onChange={(v) => update('facebookGroupUrl', v)}
                placeholder="https://www.facebook.com/groups/…"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <UrlField
                id="ellc-youtube"
                label={URL_LABELS.youtubeUrl}
                value={form.youtubeUrl}
                onChange={(v) => update('youtubeUrl', v)}
                placeholder="https://www.youtube.com/@ellccourses"
              />
              <UrlField
                id="ellc-website"
                label={`${URL_LABELS.websiteUrl} (optional)`}
                value={form.websiteUrl}
                onChange={(v) => update('websiteUrl', v)}
                placeholder="https://…"
              />
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-3">
              <Switch
                id="ellc-homepage"
                checked={form.showOnHomepage}
                onCheckedChange={(v) => setForm((s) => ({ ...s, showOnHomepage: v }))}
                aria-label="Show ELLC on the homepage"
              />
              <div>
                <Label htmlFor="ellc-homepage" className="text-sm font-semibold">
                  Show ELLC on the homepage
                </Label>
                <p className="text-xs text-muted-foreground">
                  {form.showOnHomepage
                    ? 'ELLC is featured on the website homepage.'
                    : 'Only shown on the English Department page and ELLC writers’ posts.'}
                </p>
              </div>
            </div>
          </Section>

          <Section title="Subjects" description="The NU English Department subjects ELLC teaches.">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="ellc-subjects" className={labelCls}>
                  One per line
                </Label>
                <span
                  className={
                    subjectCount > ELLC_LIMITS.subjects
                      ? 'text-xs text-destructive tabular-nums'
                      : 'text-xs text-muted-foreground tabular-nums'
                  }
                >
                  {subjectCount}/{ELLC_LIMITS.subjects}
                </span>
              </div>
              <Textarea
                id="ellc-subjects"
                value={form.subjects}
                onChange={(e) => update('subjects', e.target.value)}
                rows={10}
                placeholder={
                  'Introduction to Poetry (Honours 1st Year)\nIntroduction to Prose (Honours 1st Year)\nHistory of English Literature (Honours 1st Year)'
                }
                className="mt-1 rounded-xl font-sans"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                e.g. Introduction to Poetry (Honours 1st Year)
              </p>
            </div>
          </Section>

          <Section
            title="FAQs"
            description="Shown on the English Department page and eligible for Google FAQ results."
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={addFaq}
                disabled={form.faqs.length >= ELLC_LIMITS.faqs}
              >
                <PlusCircle className="size-4" />
                Add FAQ
              </Button>
            }
          >
            {form.faqs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                No FAQs yet. Add common questions students ask about ELLC.
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {form.faqs.map((f, i) => (
                  <li
                    key={f.key}
                    className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        FAQ {i + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7 rounded-lg"
                          onClick={() => moveFaq(i, -1)}
                          disabled={i === 0}
                          aria-label={`Move FAQ ${i + 1} up`}
                          title="Move up"
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7 rounded-lg"
                          onClick={() => moveFaq(i, 1)}
                          disabled={i === form.faqs.length - 1}
                          aria-label={`Move FAQ ${i + 1} down`}
                          title="Move down"
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeFaq(f.key)}
                          aria-label={`Remove FAQ ${i + 1}`}
                          title="Remove"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      aria-label={`FAQ ${i + 1} question`}
                      value={f.question}
                      maxLength={ELLC_LIMITS.question}
                      onChange={(e) => updateFaq(f.key, { question: e.target.value })}
                      className="h-10 rounded-xl bg-background"
                      placeholder="ELLC কোন কোন বিষয়ে ক্লাস নেয়?"
                    />
                    <Textarea
                      aria-label={`FAQ ${i + 1} answer`}
                      value={f.answer}
                      maxLength={ELLC_LIMITS.answer}
                      onChange={(e) => updateFaq(f.key, { answer: e.target.value })}
                      rows={3}
                      className="rounded-xl bg-background font-sans"
                      placeholder="NU English Department-এর অনার্স ১ম থেকে ৪র্থ বর্ষের সব বিষয়ে…"
                    />
                  </li>
                ))}
              </ol>
            )}
            <p className="text-xs text-muted-foreground">
              {form.faqs.length}/{ELLC_LIMITS.faqs} · rows left completely empty are ignored.
            </p>
          </Section>

          <Section
            title="Writers"
            description="Authors with “Writes for ELLC” turned on. Their posts get the ELLC badge and card."
            action={
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link to="/blog/authors">
                  <Users className="size-4" />
                  Manage authors
                </Link>
              </Button>
            }
          >
            {writersError ? (
              <p className="text-sm text-destructive">{writersError}</p>
            ) : !writers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-brand" />
                Loading writers…
              </div>
            ) : writers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                No ELLC writers yet — turn on 'Writes for ELLC' on an author.
              </p>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {writers.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border border-border/70 p-3"
                  >
                    {a.avatar ? (
                      <img
                        src={blogImageUrl(a.avatar)}
                        alt={a.name}
                        className="size-10 shrink-0 rounded-full border border-border/70 object-cover"
                      />
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                        {authorInitials(a)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-semibold">{a.name}</p>
                      {a.designation ? (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {a.designation}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </div>
  )
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}

function Counter({ len, max }: { len: number; max: number }) {
  return (
    <span
      className={
        len > max
          ? 'text-xs text-destructive tabular-nums'
          : 'text-xs text-muted-foreground tabular-nums'
      }
    >
      {len}/{max}
    </span>
  )
}

function UrlField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <Label htmlFor={id} className={labelCls}>
        {label}
      </Label>
      <Input
        id={id}
        type="url"
        value={value}
        maxLength={ELLC_LIMITS.url}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 rounded-xl"
        placeholder={placeholder}
      />
    </div>
  )
}
