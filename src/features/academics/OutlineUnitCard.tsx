import { Clock } from 'lucide-react'
import type { SubjectOutlineUnit } from '@/types'

/** Words NU syllabi use in front of a unit number: "Unit 1", "Week 3-4", "Group-A". */
const LABEL_WORD = '(unit|units|week|weeks|chapter|module|part|section|lecture|class|group|paper|topic)'
/** "Unit 1: Title", "Group-A: General Zoology - 1", "Week 1-2 - Title" */
const LABEL_WITH_TITLE = new RegExp(`^${LABEL_WORD}[\\s-]*([\\w.–-]*)\\s*[:.–-]\\s+(.+)$`, 'i')
/** "Unit 1", "Week 1-2", "Group B" */
const LABEL_ONLY = new RegExp(`^${LABEL_WORD}[\\s-]*([\\w.–-]*)$`, 'i')
/** "1", "1-2", "3, 4", "IV" */
const NUMBER_ONLY = /^(?:[\d\s,–-]+|[ivxlc]+)$/i
/** "Fundamentals of Accounting: Concept of ..." — a short heading before the first colon. */
const TOPIC_HEADING = /^([^:;]{3,90}?):\s+([\s\S]+)$/

export type ParsedUnit = {
  label: string
  title: string
  body: string
}

function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

function labelFrom(word: string, value: string) {
  let name = capitalize(word)
  if (name === 'Week' && /[–-]/.test(value)) name = 'Weeks'
  return value ? `${name} ${value.replace(/-/g, '–')}` : name
}

/** Drop a repeated "Title:" or "Unit 1:" from the start of the topic text. */
function stripLeading(body: string, title: string, label: string) {
  let text = body.trim()
  for (const prefix of [title, label]) {
    if (!prefix) continue
    const lower = text.toLowerCase()
    const p = prefix.toLowerCase()
    // Only a real heading: the prefix must be followed by ":", "." or a dash.
    const after = text.slice(prefix.length)
    if (lower.startsWith(p) && /^\s*[:.–-]\s/.test(after)) {
      const rest = after.replace(/^\s*[:.–-]\s*/, '')
      if (rest.length > 0) text = rest
    }
  }
  return text
}

/**
 * Split an outline row into a short label, a title and the topic text,
 * whichever field the source put the title in.
 */
export function parseOutlineUnit(unit: SubjectOutlineUnit, index: number): ParsedUnit {
  const raw = (unit.unit ?? '').trim()
  const topic = (unit.topic ?? '').trim()
  let label = ''
  let title = ''

  const withTitle = raw.match(LABEL_WITH_TITLE)
  const labelOnly = raw.match(LABEL_ONLY)
  if (withTitle) {
    label = labelFrom(withTitle[1], withTitle[2])
    const rest = withTitle[3].trim()
    // "Group-A: 1" or "Section-I: Module 1" is a second label, not a title.
    const subLabel = rest.match(LABEL_ONLY)
    if (subLabel) label = `${label} · ${labelFrom(subLabel[1], subLabel[2])}`
    else if (NUMBER_ONLY.test(rest)) label = `${label} · ${rest}`
    else title = rest
  } else if (labelOnly) {
    label = labelFrom(labelOnly[1], labelOnly[2])
  } else if (raw && NUMBER_ONLY.test(raw)) {
    label = /[–,-]/.test(raw) ? raw.replace(/-/g, '–') : `Unit ${raw}`
  } else if (raw) {
    // A name with no number, such as "Viva and Presentation".
    label = `Unit ${index + 1}`
    title = raw
  } else {
    label = `Unit ${index + 1}`
  }

  let body = stripLeading(topic, title, label)
  if (!title) {
    const heading = body.match(TOPIC_HEADING)
    if (heading) {
      title = heading[1].trim()
      body = heading[2].trim()
    }
  }
  return { label, title, body }
}

/** Split "a; b; c" into items, ignoring semicolons inside brackets. */
function topicItems(body: string) {
  const items: string[] = []
  let depth = 0
  let current = ''
  for (const ch of body) {
    if (ch === '(' || ch === '[') depth += 1
    if ((ch === ')' || ch === ']') && depth > 0) depth -= 1
    if (ch === ';' && depth === 0) {
      if (current.trim()) items.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) items.push(current.trim().replace(/\.$/, ''))
  return items
}

export function OutlineUnitCard({ unit, index }: { unit: SubjectOutlineUnit; index: number }) {
  const { label, title, body } = parseOutlineUnit(unit, index)
  const items = topicItems(body)
  const asList = items.length >= 3 && items.every((item) => item.length <= 220)
  const strategies = unit.teachingStrategies?.filter(Boolean) ?? []
  const clos = unit.clos?.filter(Boolean) ?? []

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
      <header className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <span className="shrink-0 whitespace-nowrap rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
          {label}
        </span>
        <h3 className="min-w-0 flex-1 basis-48 break-words pt-0.5 text-sm font-semibold leading-snug text-foreground">
          {title || <span className="font-medium text-muted-foreground">Topics</span>}
        </h3>
        {unit.hours != null || clos.length ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {unit.hours != null ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5">
                <Clock className="size-3" aria-hidden />
                {unit.hours} {unit.hours === 1 ? 'hour' : 'hours'}
              </span>
            ) : null}
            {clos.map((clo) => (
              <span key={clo} className="rounded-full border border-border/70 px-2 py-0.5 font-medium">
                {clo}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {body ? (
        asList ? (
          <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm leading-relaxed text-foreground/90 md:grid-cols-2">
            {items.map((item, i) => (
              <li key={`${i}-${item}`} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand/60" aria-hidden />
                <span className="min-w-0 break-words">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">{body}</p>
        )
      ) : null}

      {strategies.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/50 pt-3">
          {strategies.map((item) => (
            <span key={item} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}
