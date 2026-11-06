import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ExternalLink,
  EyeOff,
  ImagePlus,
  Loader2,
  Newspaper,
  Save,
  Send,
  X,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  blogImageUrl,
  createAdminBlogPost,
  fetchAdminBlogPost,
  publishAdminBlogPost,
  unpublishAdminBlogPost,
  updateAdminBlogPost,
  uploadBlogImage,
} from '@/api'
import { SITE_URL } from '@/config'
import { formatDateTime } from '@/lib/format'
import type { AdminBlogPost, BlogPostWritePayload } from '@/types'
import { MarkdownEditor } from './MarkdownEditor'
import {
  EMPTY_LOCALE,
  LIMITS,
  SLUG_RE,
  formToLocale,
  localeToForm,
  slugify,
  validateBlogImage,
  validateLocale,
  type LocaleForm,
} from './blogUtils'

type FormState = {
  slug: string
  coverImage: string | null
  bn: LocaleForm
  enEnabled: boolean
  en: LocaleForm
}

const EMPTY_FORM: FormState = {
  slug: '',
  coverImage: null,
  bn: { ...EMPTY_LOCALE },
  enEnabled: false,
  en: { ...EMPTY_LOCALE },
}

function postToForm(p: AdminBlogPost): FormState {
  return {
    slug: p.slug,
    coverImage: p.coverImage,
    bn: localeToForm(p.bn),
    enEnabled: !!p.en,
    en: localeToForm(p.en),
  }
}

/** What would actually be saved — used for dirty tracking. */
function snapshot(f: FormState): string {
  return JSON.stringify({
    slug: f.slug.trim(),
    coverImage: f.coverImage,
    bn: formToLocale(f.bn),
    en: f.enEnabled ? formToLocale(f.en) : null,
  })
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

const labelCls = 'text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground'

export function BlogEditorPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()

  const [post, setPost] = useState<AdminBlogPost | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saved, setSaved] = useState(() => snapshot(EMPTY_FORM))
  // Existing posts keep their slug unless edited by hand.
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [busy, setBusy] = useState<null | 'draft' | 'publish' | 'unpublish'>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [tab, setTab] = useState<'bn' | 'en'>('bn')
  const coverInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetchAdminBlogPost(id)
      .then((p) => {
        if (cancelled) return
        const f = postToForm(p)
        setPost(p)
        setForm(f)
        setSaved(snapshot(f))
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(errMsg(e) || 'Failed to load post')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const dirty = useMemo(() => snapshot(form) !== saved, [form, saved])

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const status = post?.status ?? 'draft'
  const isPublished = status === 'published'

  function setLocale(lang: 'bn' | 'en', patch: Partial<LocaleForm>) {
    setForm((f) => {
      const next = { ...f, [lang]: { ...f[lang], ...patch } }
      if (lang === 'en' && patch.title !== undefined && !slugTouched) {
        next.slug = slugify(patch.title)
      }
      return next
    })
  }

  function setEnEnabled(on: boolean) {
    setForm((f) => ({
      ...f,
      enEnabled: on,
      slug: !slugTouched ? (on ? slugify(f.en.title) : '') : f.slug,
    }))
    if (on) setTab('en')
    else setTab('bn')
  }

  function validate(): string | null {
    const slug = form.slug.trim()
    const hasEnTitle = form.enEnabled && !!form.en.title.trim()
    if (!slug && (!isNew || !hasEnTitle))
      return 'Slug is required (add an English title to auto-generate one)'
    if (slug && slug.length > LIMITS.slug) return `Slug must be ${LIMITS.slug} characters or fewer`
    if (slug && !SLUG_RE.test(slug))
      return 'Slug can only contain lowercase letters, numbers and single hyphens (e.g. my-first-post)'
    const bnErr = validateLocale(form.bn, 'Bangla')
    if (bnErr) return bnErr
    if (form.enEnabled) {
      const enErr = validateLocale(form.en, 'English')
      if (enErr) return enErr
    }
    return null
  }

  function buildPayload(): BlogPostWritePayload {
    const slug = form.slug.trim()
    const payload: BlogPostWritePayload = {
      bn: formToLocale(form.bn),
      en: form.enEnabled ? formToLocale(form.en) : null,
      coverImage: form.coverImage,
    }
    if (slug) payload.slug = slug
    return payload
  }

  function applySaved(p: AdminBlogPost) {
    const f = postToForm(p)
    setPost(p)
    setForm(f)
    setSaved(snapshot(f))
    setSlugTouched(true)
  }

  async function save(publish: boolean) {
    const problem = validate()
    if (problem) {
      toast.error(problem)
      return
    }
    setBusy(publish ? 'publish' : 'draft')
    try {
      const payload = buildPayload()
      if (!id) {
        const created = await createAdminBlogPost({ ...payload, publish })
        setSaved(snapshot(form)) // avoid a stale dirty flag during navigation
        toast.success(publish ? 'Published — live on the website' : 'Draft saved')
        navigate(`/blog/${created.id}/edit`, { replace: true })
        return
      }
      let p = await updateAdminBlogPost(id, payload)
      if (publish && p.status !== 'published') p = await publishAdminBlogPost(id)
      applySaved(p)
      toast.success(
        publish
          ? isPublished
            ? 'Updated — changes are live'
            : 'Published — live on the website'
          : 'Draft saved',
      )
    } catch (e: unknown) {
      const msg = errMsg(e)
      toast.error('Could not save', {
        description: /slug/i.test(msg) && /taken|exist|use|conflict/i.test(msg)
          ? 'That slug is already used by another post — pick a different one.'
          : msg,
      })
    } finally {
      setBusy(null)
    }
  }

  async function unpublish() {
    if (!id) return
    setBusy('unpublish')
    try {
      const p = await unpublishAdminBlogPost(id)
      // Keep any unsaved edits; only refresh status.
      setPost(p)
      toast.success('Unpublished — removed from the website')
    } catch (e: unknown) {
      toast.error('Unpublish failed', { description: errMsg(e) })
    } finally {
      setBusy(null)
    }
  }

  async function onCoverPicked(file: File | undefined) {
    if (!file) return
    const problem = validateBlogImage(file)
    if (problem) {
      toast.error(problem)
      return
    }
    setUploadingCover(true)
    try {
      const res = await uploadBlogImage(file)
      setForm((f) => ({ ...f, coverImage: res.file }))
    } catch (e: unknown) {
      toast.error('Cover upload failed', { description: errMsg(e) })
    } finally {
      setUploadingCover(false)
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <Card className="rounded-2xl border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">{loadError}</CardContent>
        </Card>
      </div>
    )
  }

  if (!isNew && !post) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-brand" />
        Loading post…
      </div>
    )
  }

  const savingAny = busy !== null

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <PageHeader
        icon={Newspaper}
        title={isNew ? 'New blog post' : form.bn.title || post?.bn.title || 'Edit post'}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge variant={isPublished ? 'approved' : 'pending'}>
              {isPublished ? 'Published' : 'Draft'}
            </Badge>
            {post?.publishedAt && isPublished ? (
              <span>since {formatDateTime(post.publishedAt)}</span>
            ) : null}
            {dirty ? <span className="text-amber-600 dark:text-amber-400">· Unsaved changes</span> : null}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isPublished && post ? (
              <Button asChild variant="ghost" className="rounded-xl">
                <a href={`${SITE_URL}/blog/${post.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  View on site
                </a>
              </Button>
            ) : null}
            {isPublished ? (
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={savingAny}
                onClick={() => void unpublish()}
              >
                {busy === 'unpublish' ? <Loader2 className="size-4 animate-spin" /> : <EyeOff className="size-4" />}
                Unpublish
              </Button>
            ) : (
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={savingAny}
                onClick={() => void save(false)}
              >
                {busy === 'draft' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save draft
              </Button>
            )}
            <Button className="rounded-xl" disabled={savingAny} onClick={() => void save(true)}>
              {busy === 'publish' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {isPublished ? 'Update' : 'Publish'}
            </Button>
          </div>
        }
      />

      <Card className="rounded-2xl">
        <CardContent className="grid gap-5 py-5 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="blog-slug" className={labelCls}>
                Slug
                {!(isNew && form.enEnabled && form.en.title.trim()) ? (
                  <span className="ml-1 text-destructive">*</span>
                ) : null}
              </Label>
              <div className="mt-1 flex items-center rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                <span className="hidden select-none pl-3 text-sm text-muted-foreground sm:inline">
                  /blog/
                </span>
                <Input
                  id="blog-slug"
                  value={form.slug}
                  maxLength={LIMITS.slug}
                  placeholder="my-first-post"
                  className="h-10 border-0 font-mono shadow-none focus-visible:ring-0 sm:pl-1"
                  onChange={(e) => {
                    setSlugTouched(true)
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }}
                  onBlur={() =>
                    setForm((f) => ({ ...f, slug: f.slug.trim().toLowerCase() }))
                  }
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Lowercase letters, numbers and hyphens.
                {isNew && !slugTouched ? ' Auto-filled from the English title.' : ''}
                {isPublished ? ' Changing it breaks existing links to this post.' : ''}
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-3">
              <Switch
                id="blog-en"
                checked={form.enEnabled}
                onCheckedChange={setEnEnabled}
                aria-label="Add English version"
              />
              <div>
                <Label htmlFor="blog-en" className="text-sm font-semibold">
                  Add English version
                </Label>
                <p className="text-xs text-muted-foreground">
                  {form.enEnabled
                    ? 'The post will also appear on the English site.'
                    : 'Without English, the post only appears on the Bangla site.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:w-64">
            <span className={labelCls}>Cover image</span>
            {form.coverImage ? (
              <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-muted">
                <img
                  src={blogImageUrl(form.coverImage)}
                  alt="Cover"
                  className="aspect-[16/9] w-full object-cover"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute right-2 top-2 size-7 rounded-full shadow"
                  onClick={() => setForm((f) => ({ ...f, coverImage: null }))}
                  aria-label="Remove cover image"
                  title="Remove"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 text-xs text-muted-foreground">
                No cover image
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={uploadingCover}
              onClick={() => coverInput.current?.click()}
            >
              {uploadingCover ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              {form.coverImage ? 'Replace' : 'Upload'}
            </Button>
            <input
              ref={coverInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                void onCoverPicked(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <p className="text-[11px] text-muted-foreground">JPEG, PNG, WebP or GIF · max 5 MB</p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'bn' | 'en')}>
        <TabsList>
          <TabsTrigger value="bn">বাংলা (required)</TabsTrigger>
          <TabsTrigger value="en" disabled={!form.enEnabled}>
            English (optional)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bn">
          <LocaleFields
            lang="bn"
            value={form.bn}
            onChange={(patch) => setLocale('bn', patch)}
          />
        </TabsContent>
        <TabsContent value="en">
          {form.enEnabled ? (
            <LocaleFields
              lang="en"
              value={form.en}
              onChange={(patch) => setLocale('en', patch)}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/blog"
      className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-brand"
    >
      <ArrowLeft className="size-4" />
      All posts
    </Link>
  )
}

function LocaleFields({
  lang,
  value,
  onChange,
}: {
  lang: 'bn' | 'en'
  value: LocaleForm
  onChange: (patch: Partial<LocaleForm>) => void
}) {
  const p = `blog-${lang}`
  const descLen = value.description.trim().length
  return (
    <Card className="rounded-2xl">
      <CardContent className="grid gap-4 py-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor={`${p}-title`} className={labelCls}>
            Title<span className="ml-1 text-destructive">*</span>
          </Label>
          <Input
            id={`${p}-title`}
            lang={lang}
            value={value.title}
            maxLength={LIMITS.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="mt-1 h-10 rounded-xl text-base"
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor={`${p}-excerpt`} className={labelCls}>
            Excerpt
          </Label>
          <Textarea
            id={`${p}-excerpt`}
            lang={lang}
            value={value.excerpt}
            maxLength={LIMITS.excerpt}
            onChange={(e) => onChange({ excerpt: e.target.value })}
            placeholder="Short summary shown on the blog listing"
            className="mt-1 min-h-[72px] rounded-xl font-sans"
          />
        </div>
        <div className="md:col-span-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor={`${p}-desc`} className={labelCls}>
              SEO description
            </Label>
            <span
              className={
                descLen > LIMITS.description
                  ? 'text-xs text-destructive tabular-nums'
                  : 'text-xs text-muted-foreground tabular-nums'
              }
            >
              {descLen}/{LIMITS.description}
            </span>
          </div>
          <Textarea
            id={`${p}-desc`}
            lang={lang}
            value={value.description}
            maxLength={LIMITS.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Meta description for search engines"
            className="mt-1 min-h-[72px] rounded-xl font-sans"
          />
        </div>
        <div>
          <Label htmlFor={`${p}-cat`} className={labelCls}>
            Category
          </Label>
          <Input
            id={`${p}-cat`}
            lang={lang}
            value={value.category}
            maxLength={LIMITS.category}
            onChange={(e) => onChange({ category: e.target.value })}
            className="mt-1 h-10 rounded-xl"
          />
        </div>
        <div>
          <Label htmlFor={`${p}-kw`} className={labelCls}>
            Keywords
          </Label>
          <Input
            id={`${p}-kw`}
            lang={lang}
            value={value.keywords}
            onChange={(e) => onChange({ keywords: e.target.value })}
            placeholder="Comma-separated, e.g. exam, honours, tips"
            className="mt-1 h-10 rounded-xl"
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor={`${p}-body`} className={labelCls}>
            Body (Markdown)<span className="ml-1 text-destructive">*</span>
          </Label>
          <div className="mt-1">
            <MarkdownEditor
              id={`${p}-body`}
              value={value.body}
              onChange={(body) => onChange({ body })}
              placeholder={lang === 'bn' ? 'এখানে লিখুন… (Markdown supported)' : 'Write your post… (Markdown supported)'}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
