import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Files, Loader2, Mail, MessageCircle, RefreshCw, User } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/EmptyState'
import { fetchPapers, fetchStudent, fetchStudentAvatar } from '@/api'
import { formatDateTime, humanStatus, statusBadgeVariant } from '@/lib/format'
import { toast } from 'sonner'
import type { Paper, Student } from '@/types'

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [student, setStudent] = useState<Student | null>(null)
  const [papers, setPapers] = useState<Paper[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  async function loadStudent(mode: 'initial' | 'refresh') {
    if (!id) return
    if (mode === 'initial') setLoading(true)
    else setRefreshing(true)
    setErr(null)
    try {
      const [s, all] = await Promise.all([fetchStudent(id), fetchPapers()])
      setStudent(s)
      setPapers(all.filter((p) => p.studentId === id))
      setReloadKey((key) => key + 1)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load student'
      if (mode === 'refresh') toast.error(message)
      else setErr(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadStudent('initial')
    // Reload when the student id changes; manual reload calls loadStudent directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const stats = useMemo(() => {
    const list = papers ?? []
    return {
      total: list.length,
      pending: list.filter((p) => p.status === 'pending_review').length,
      approved: list.filter((p) => p.status === 'approved').length,
    }
  }, [papers])

  if (loading && !student) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-brand" />
        Loading student
      </div>
    )
  }

  if ((err && !student) || !student) {
    return (
      <EmptyState
        icon={User}
        title={err ?? 'Student not found'}
        description="The student may have been removed or the link is incorrect."
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/students">
              <ArrowLeft className="size-4" />
              Back to students
            </Link>
          </Button>
        }
      />
    )
  }

  const displayName = student.name?.trim() || student.email.split('@')[0]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit gap-1.5 rounded-lg text-muted-foreground hover:text-brand"
        >
          <Link to="/students">
            <ArrowLeft className="size-4" />
            Students
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-lg"
          disabled={refreshing}
          onClick={() => void loadStudent('refresh')}
        >
          <RefreshCw className={refreshing ? 'size-4 animate-spin' : 'size-4'} />
          Reload
        </Button>
      </div>

      <Card className="rounded-2xl border-border/70 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05)]">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <StudentAvatar
                student={student}
                name={displayName}
                reloadKey={reloadKey}
              />
              <div>
                <CardTitle className="text-2xl tracking-tight">
                  {displayName}
                </CardTitle>
                <CardDescription className="mt-1 font-mono text-xs">
                  {student.id}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-lg"
              >
                <a href={`mailto:${student.email}`}>
                  <Mail className="size-4" />
                  Email
                </a>
              </Button>
              {student.whatsappNumber?.trim() ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-lg"
                >
                  <a
                    href={`https://wa.me/${student.whatsappNumber.replace(/\D+/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ProfileField label="Email" value={student.email} mono />
            <ProfileField
              label="Name"
              value={student.name?.trim() ? student.name : '—'}
            />
            <ProfileField
              label="College"
              value={
                student.college?.name ||
                student.collegeName?.trim() ||
                '—'
              }
            />
            {student.college ? (
              <ProfileField
                label="College code"
                value={student.college.code}
                mono
              />
            ) : null}
            {student.college?.address ? (
              <ProfileField label="College address" value={student.college.address} />
            ) : null}
            {student.college ? (
              <ProfileField
                label="College location"
                value={
                  [student.college.upazilla, displayDistrict(student.college.district), student.college.division]
                    .filter(Boolean)
                    .join(', ') || '—'
                }
              />
            ) : null}
            <ProfileField
              label="Department"
              value={student.department?.trim() || '—'}
            />
            <ProfileField
              label="Current year"
              value={student.currentYear?.trim() || '—'}
            />
            <ProfileField
              label="WhatsApp"
              value={
                student.whatsappNumber?.trim() ? student.whatsappNumber : '—'
              }
            />
            <ProfileField
              label="Joined"
              value={formatDateTime(student.createdAt)}
              mono
            />
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniMeta label="Total papers" value={stats.total} />
        <MiniMeta label="Pending review" value={stats.pending} />
        <MiniMeta label="Approved" value={stats.approved} />
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/70 py-0 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05)]">
        <CardHeader className="border-b bg-muted/40">
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <Files className="size-4 text-brand" />
            Papers
          </CardTitle>
          <CardDescription>Submissions for this student</CardDescription>
        </CardHeader>
        {(papers ?? []).length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No papers for this student yet.
            </p>
          </CardContent>
        ) : (
          <ScrollArea className="max-h-[min(60vh,520px)]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Paper ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Pages</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(papers ?? []).map((p) => (
                  <TableRow
                    key={p._id}
                    className="cursor-pointer"
                    tabIndex={0}
                    role="button"
                    onClick={() => navigate(`/papers/${p._id}`)}
                    onKeyDown={(e) =>
                      e.key === 'Enter'
                        ? navigate(`/papers/${p._id}`)
                        : undefined
                    }
                  >
                    <TableCell className="max-w-[220px] truncate font-mono text-xs">
                      <span title={p._id}>{p._id}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(p.status)}>
                        {humanStatus(p.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {p.imagePaths.length}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatDateTime(p.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>
    </div>
  )
}

function StudentAvatar({
  student,
  name,
  reloadKey,
}: {
  student: Student
  name: string
  reloadKey: number
}) {
  const [src, setSrc] = useState<string | null>(student.avatarUrl ?? null)

  useEffect(() => {
    if (student.avatarUrl) {
      setSrc(student.avatarUrl)
      return
    }
    if (!student.avatarRequiresAuth) {
      setSrc(null)
      return
    }
    let cancelled = false
    let objectUrl = ''
    void fetchStudentAvatar(student.id).then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setSrc(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [student.id, student.avatarUrl, student.avatarRequiresAuth, reloadKey])

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="size-14 rounded-2xl object-cover shadow-brand ring-1 ring-border/70"
      />
    )
  }

  return (
    <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-gradient text-2xl font-bold uppercase text-primary-foreground shadow-brand">
      {name.slice(0, 1)}
    </span>
  )
}

function displayDistrict(value?: string | null) {
  const text = (value ?? '').trim()
  if (!text) return ''
  const letters = text.replace(/[^A-Za-z]/g, '')
  if (!letters || letters !== letters.toUpperCase()) return text
  return text
    .toLowerCase()
    .replace(/(^|[\s'’-])([a-z])/g, (_, boundary: string, letter: string) => boundary + letter.toUpperCase())
}

function ProfileField({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className={mono ? 'mt-1 font-mono text-sm' : 'mt-1 text-sm'}>
        {value}
      </dd>
    </div>
  )
}

function MiniMeta({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  )
}
