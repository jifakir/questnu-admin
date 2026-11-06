import type { BlogLocaleContent } from '@/types'

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const LIMITS = {
  slug: 120,
  title: 200,
  excerpt: 400,
  description: 300,
  category: 80,
  keywords: 20,
  keyword: 80,
} as const

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Returns an error message, or null when the file can be uploaded. */
export function validateBlogImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Images must be JPEG, PNG, WebP or GIF'
  if (file.size > MAX_IMAGE_BYTES) return 'Images must be 5 MB or smaller'
  return null
}

/** Best-effort slug from a (Latin-script) title. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, LIMITS.slug)
    .replace(/-+$/g, '')
}

/** Editable form shape for one language (keywords as a comma-separated string). */
export type LocaleForm = {
  title: string
  excerpt: string
  description: string
  category: string
  keywords: string
  body: string
}

export const EMPTY_LOCALE: LocaleForm = {
  title: '',
  excerpt: '',
  description: '',
  category: '',
  keywords: '',
  body: '',
}

export function localeToForm(c: BlogLocaleContent | null | undefined): LocaleForm {
  if (!c) return { ...EMPTY_LOCALE }
  return {
    title: c.title ?? '',
    excerpt: c.excerpt ?? '',
    description: c.description ?? '',
    category: c.category ?? '',
    keywords: (c.keywords ?? []).join(', '),
    body: c.body ?? '',
  }
}

export function splitKeywords(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(/[,،\n]/)) {
    const k = part.trim()
    if (!k || seen.has(k.toLowerCase())) continue
    seen.add(k.toLowerCase())
    out.push(k)
  }
  return out
}

export function formToLocale(f: LocaleForm): BlogLocaleContent {
  return {
    title: f.title.trim(),
    excerpt: f.excerpt.trim(),
    description: f.description.trim(),
    category: f.category.trim(),
    keywords: splitKeywords(f.keywords),
    body: f.body,
  }
}

/** Mirrors server-side validation. Returns a friendly message or null. */
export function validateLocale(f: LocaleForm, label: string): string | null {
  const c = formToLocale(f)
  if (!c.title) return `${label}: title is required`
  if (c.title.length > LIMITS.title) return `${label}: title must be ${LIMITS.title} characters or fewer`
  if (!c.excerpt) return `${label}: excerpt is required`
  if (c.excerpt.length > LIMITS.excerpt) return `${label}: excerpt must be ${LIMITS.excerpt} characters or fewer`
  if (!c.description) return `${label}: SEO description is required`
  if (c.description.length > LIMITS.description)
    return `${label}: SEO description must be ${LIMITS.description} characters or fewer`
  if (c.category.length > LIMITS.category) return `${label}: category must be ${LIMITS.category} characters or fewer`
  if (c.keywords.length > LIMITS.keywords) return `${label}: at most ${LIMITS.keywords} keywords`
  if (c.keywords.some((k) => k.length > LIMITS.keyword))
    return `${label}: each keyword must be ${LIMITS.keyword} characters or fewer`
  if (!c.body.trim()) return `${label}: body is required`
  return null
}
