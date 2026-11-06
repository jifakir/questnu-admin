import { useRef, useState } from 'react'
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { uploadBlogImage } from '@/api'
import { API_BASE } from '@/config'
import { cn } from '@/lib/utils'
import { validateBlogImage } from './blogUtils'

type Edit = { value: string; selStart: number; selEnd: number }

function wrap(v: string, s: number, e: number, before: string, after: string, placeholder: string): Edit {
  const selected = v.slice(s, e) || placeholder
  const value = v.slice(0, s) + before + selected + after + v.slice(e)
  return { value, selStart: s + before.length, selEnd: s + before.length + selected.length }
}

function prefixLines(v: string, s: number, e: number, prefix: (i: number) => string): Edit {
  const lineStart = v.lastIndexOf('\n', s - 1) + 1
  const nl = v.indexOf('\n', e)
  const lineEnd = nl === -1 ? v.length : nl
  const lines = v.slice(lineStart, lineEnd).split('\n')
  const replaced = lines.map((l, i) => prefix(i) + l.replace(/^(#{1,6} |> |- |\d+\. )/, '')).join('\n')
  const value = v.slice(0, lineStart) + replaced + v.slice(lineEnd)
  return { value, selStart: lineStart, selEnd: lineStart + replaced.length }
}

function insertAt(v: string, s: number, e: number, text: string): Edit {
  const needsBreakBefore = s > 0 && v[s - 1] !== '\n'
  const insert = (needsBreakBefore ? '\n' : '') + text + '\n'
  const value = v.slice(0, s) + insert + v.slice(e)
  const pos = s + insert.length
  return { value, selStart: pos, selEnd: pos }
}

const TOOLS: {
  label: string
  /** Tooltip; defaults to the label. */
  hint?: string
  icon: typeof Bold
  fn: (v: string, s: number, e: number) => Edit
}[] = [
  { label: 'Heading 2', hint: 'H2 — section heading (shows in sidebar)', icon: Heading2, fn: (v, s, e) => prefixLines(v, s, e, () => '## ') },
  { label: 'Heading 3', hint: 'H3 — sub-heading (not shown in sidebar)', icon: Heading3, fn: (v, s, e) => prefixLines(v, s, e, () => '### ') },
  { label: 'Bold', icon: Bold, fn: (v, s, e) => wrap(v, s, e, '**', '**', 'bold text') },
  { label: 'Italic', icon: Italic, fn: (v, s, e) => wrap(v, s, e, '_', '_', 'italic text') },
  { label: 'Link', icon: Link2, fn: (v, s, e) => wrap(v, s, e, '[', '](https://)', 'link text') },
  { label: 'Bullet list', icon: List, fn: (v, s, e) => prefixLines(v, s, e, () => '- ') },
  { label: 'Numbered list', icon: ListOrdered, fn: (v, s, e) => prefixLines(v, s, e, (i) => `${i + 1}. `) },
  { label: 'Quote', icon: Quote, fn: (v, s, e) => prefixLines(v, s, e, () => '> ') },
]

export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cursorRef = useRef<{ s: number; e: number } | null>(null)
  const [pane, setPane] = useState<'write' | 'preview'>('write')
  const [uploading, setUploading] = useState(false)

  function apply(fn: (v: string, s: number, e: number) => Edit) {
    const el = ref.current
    const s = el?.selectionStart ?? value.length
    const e = el?.selectionEnd ?? value.length
    const next = fn(el?.value ?? value, s, e)
    onChange(next.value)
    requestAnimationFrame(() => {
      const t = ref.current
      if (!t) return
      t.focus()
      t.setSelectionRange(next.selStart, next.selEnd)
    })
  }

  async function onImagePicked(file: File | undefined) {
    if (!file) return
    const problem = validateBlogImage(file)
    if (problem) {
      toast.error(problem)
      return
    }
    setUploading(true)
    try {
      const res = await uploadBlogImage(file)
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[[\]]/g, '')
      const md = `![${alt}](${API_BASE}${res.path})`
      const pos = cursorRef.current
      const el = ref.current
      const s = pos?.s ?? el?.selectionStart ?? value.length
      const e = pos?.e ?? el?.selectionEnd ?? value.length
      apply((v) => insertAt(v, s, e, md))
      toast.success('Image uploaded')
    } catch (err: unknown) {
      toast.error('Image upload failed', {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setUploading(false)
      cursorRef.current = null
    }
  }


  return (
    <div className="overflow-hidden rounded-xl border border-input">
      <div className="flex flex-wrap items-center gap-1 border-b border-border/70 bg-muted/40 px-2 py-1.5">
        {TOOLS.map((t) => (
          <Button
            key={t.label}
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 rounded-lg"
            title={t.hint ?? t.label}
            aria-label={t.label}
            onClick={() => apply(t.fn)}
          >
            <t.icon className="size-4" />
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 rounded-lg"
          disabled={uploading}
          onClick={() => {
            const el = ref.current
            cursorRef.current = el
              ? { s: el.selectionStart, e: el.selectionEnd }
              : null
            fileRef.current?.click()
          }}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          Insert image
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            void onImagePicked(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <div className="ml-auto flex rounded-full border border-border/70 bg-background p-0.5 lg:hidden">
          {(['write', 'preview'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPane(p)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold capitalize',
                pane === p ? 'bg-brand-soft text-brand' : 'text-muted-foreground',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="grid lg:grid-cols-2">
        <Textarea
          id={id}
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck
          className={cn(
            'min-h-[480px] resize-y rounded-none border-0 shadow-none focus-visible:ring-0 lg:border-r lg:border-border/70',
            pane === 'write' ? 'flex' : 'hidden lg:flex',
          )}
        />
        <div
          className={cn(
            'min-h-[480px] overflow-auto bg-card px-5 py-4',
            pane === 'preview' ? 'block' : 'hidden lg:block',
          )}
        >
          {value.trim() ? (
            <article className="prose prose-sm max-w-none dark:prose-invert prose-img:rounded-lg prose-a:text-brand">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </article>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
