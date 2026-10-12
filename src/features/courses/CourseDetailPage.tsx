import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Layers,
  Loader2,
  Pencil,
  PlayCircle,
  PlusCircle,
  Settings2,
  Sparkles,
  Trash2,
  Users,
  Video,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/EmptyState'
import {
  createLesson,
  createModule,
  createResource,
  deleteLesson,
  deleteModule,
  deleteResource,
  fetchCourseEnrollments,
  fetchCurriculum,
  resourceFileUrl,
  updateCourse,
  updateLesson,
  updateModule,
  uploadResource,
  removeEnrollment,
} from '@/api'
import { formatRelative } from '@/lib/format'
import type {
  CurriculumCourse,
  CurriculumLesson,
  CurriculumModule,
  Enrollment,
  Lesson,
  LessonKind,
  Resource,
} from '@/types'
import { CourseFormDialog } from './CourseFormDialog'
import { LessonFormDialog } from './LessonFormDialog'
import { ModuleFormDialog } from './ModuleFormDialog'
import { ResourceFormDialog } from './ResourceFormDialog'

const LESSON_ICONS: Record<LessonKind, typeof BookOpen> = {
  live_class: PlayCircle,
  video_class: Video,
  exam: ClipboardCheck,
}

const LESSON_LABELS: Record<LessonKind, string> = {
  live_class: 'Live class',
  video_class: 'Video class',
  exam: 'Exam',
}

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [curriculum, setCurriculum] = useState<CurriculumCourse | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editCourse, setEditCourse] = useState(false)
  const [editModule, setEditModule] = useState<CurriculumModule | null>(null)
  const [newModuleOpen, setNewModuleOpen] = useState(false)
  const [editLesson, setEditLesson] = useState<{
    moduleId: string
    lesson?: CurriculumLesson
  } | null>(null)
  const [resourceDialog, setResourceDialog] = useState<{
    courseId: string
    moduleId?: string
    lessonId?: string
  } | null>(null)

  const reload = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      const [c, e] = await Promise.all([
        fetchCurriculum(id),
        fetchCourseEnrollments(id).catch(() => [] as Enrollment[]),
      ])
      setCurriculum(c)
      setEnrollments(e)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load course')
    }
  }, [id])

  useEffect(() => {
    reload()
  }, [reload])

  if (!id) return null
  if (error) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Could not load course"
        description={error}
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/courses">
              <ArrowLeft className="size-4" />
              Back to courses
            </Link>
          </Button>
        }
      />
    )
  }
  if (!curriculum) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-brand" />
        Loading course…
      </div>
    )
  }

  const totalLessons = curriculum.modules.reduce(
    (n, m) => n + m.lessons.length,
    0,
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2 gap-1.5 rounded-lg text-muted-foreground hover:text-brand"
        >
          <Link to="/courses">
            <ArrowLeft className="size-4" />
            Courses
          </Link>
        </Button>

        <div className="relative overflow-hidden rounded-2xl border border-brand/15 bg-brand-gradient p-6 text-primary-foreground shadow-brand md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                  <BookOpen className="size-3.5" />
                  Course
                </span>
                {curriculum.code ? (
                  <span className="rounded-md border border-white/30 bg-white/10 px-2 py-0.5 font-mono text-[11px] text-white/90">
                    {curriculum.code}
                  </span>
                ) : null}
                <Badge
                  variant={
                    curriculum.status === 'published' ? 'default' : 'secondary'
                  }
                  className="bg-white/90 text-[10px] uppercase tracking-wide text-brand"
                >
                  {curriculum.status === 'published' ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
                {curriculum.title}
              </h1>
              {curriculum.subtitle ? (
                <p className="mt-2 text-sm leading-relaxed text-white/90">
                  {curriculum.subtitle}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="h-10 rounded-xl bg-white px-4 font-semibold text-brand shadow-sm hover:bg-white/90"
                onClick={() => setEditCourse(true)}
              >
                <Pencil className="size-4" />
                Edit course
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-xl border-white/40 bg-white/10 text-white hover:bg-white/20"
                onClick={async () => {
                  const newStatus =
                    curriculum.status === 'published' ? 'draft' : 'published'
                  try {
                    await updateCourse(id, { status: newStatus })
                    toast.success(
                      newStatus === 'published'
                        ? 'Course published'
                        : 'Reverted to draft',
                    )
                    reload()
                  } catch (e: unknown) {
                    toast.error(
                      e instanceof Error ? e.message : 'Failed to change status',
                    )
                  }
                }}
              >
                <Sparkles className="size-4" />
                {curriculum.status === 'published' ? 'Unpublish' : 'Publish'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Modules" value={curriculum.modules.length} icon={Layers} />
        <Stat label="Lessons" value={totalLessons} icon={BookOpen} />
        <Stat
          label="Resources"
          value={
            curriculum.resources.length +
            curriculum.modules.reduce(
              (n, m) =>
                n +
                m.resources.length +
                m.lessons.reduce((nn, l) => nn + l.resources.length, 0),
              0,
            )
          }
          icon={Settings2}
        />
        <Stat
          label="Enrolled"
          value={enrollments?.length ?? 0}
          icon={Users}
        />
      </div>

      <Tabs defaultValue="curriculum" className="flex flex-col gap-4">
        <TabsList className="self-start">
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="enrollments">
            Enrollments
            {enrollments?.length ? (
              <span className="ml-1.5 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                {enrollments.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="curriculum">
          <CurriculumPane
            curriculum={curriculum}
            onAddModule={() => setNewModuleOpen(true)}
            onEditModule={(m) => setEditModule(m)}
            onDeleteModule={async (m) => {
              if (
                !window.confirm(
                  `Delete module "${m.title}" and all its lessons & resources?`,
                )
              )
                return
              try {
                await deleteModule(m._id)
                toast.success('Module deleted')
                reload()
              } catch (e: unknown) {
                toast.error(
                  e instanceof Error ? e.message : 'Failed to delete module',
                )
              }
            }}
            onAddLesson={(moduleId) =>
              setEditLesson({ moduleId, lesson: undefined })
            }
            onEditLesson={(moduleId, lesson) =>
              setEditLesson({ moduleId, lesson })
            }
            onDeleteLesson={async (l) => {
              if (!window.confirm(`Delete lesson "${l.title}"?`)) return
              try {
                await deleteLesson(l._id)
                toast.success('Lesson deleted')
                reload()
              } catch (e: unknown) {
                toast.error(
                  e instanceof Error ? e.message : 'Failed to delete lesson',
                )
              }
            }}
            onAddResource={(scope) => setResourceDialog(scope)}
            onDeleteResource={async (r) => {
              if (!window.confirm(`Delete resource "${r.title}"?`)) return
              try {
                await deleteResource(r._id)
                toast.success('Resource deleted')
                reload()
              } catch (e: unknown) {
                toast.error(
                  e instanceof Error ? e.message : 'Failed to delete resource',
                )
              }
            }}
          />
        </TabsContent>

        <TabsContent value="enrollments">
          <EnrollmentsPane
            enrollments={enrollments ?? []}
            onRemove={async (e) => {
              if (
                !window.confirm(
                  `Remove ${e.student?.email ?? 'this student'} from the course?`,
                )
              )
                return
              try {
                await removeEnrollment(e._id)
                toast.success('Enrollment removed')
                reload()
              } catch (err: unknown) {
                toast.error(
                  err instanceof Error ? err.message : 'Failed to remove',
                )
              }
            }}
          />
        </TabsContent>

        <TabsContent value="overview">
          <OverviewPane course={curriculum} />
        </TabsContent>
      </Tabs>

      <CourseFormDialog
        open={editCourse}
        onOpenChange={(v) => setEditCourse(v)}
        title="Edit course"
        submitLabel="Save changes"
        initial={curriculum}
        onSubmit={async (payload) => {
          await updateCourse(id, payload)
          toast.success('Course saved')
          reload()
        }}
      />

      <ModuleFormDialog
        open={newModuleOpen || !!editModule}
        onOpenChange={(v) => {
          if (!v) {
            setNewModuleOpen(false)
            setEditModule(null)
          }
        }}
        initial={editModule ?? undefined}
        onSubmit={async (data) => {
          if (editModule) {
            await updateModule(editModule._id, data)
            toast.success('Module saved')
          } else {
            await createModule(id, data)
            toast.success('Module added')
          }
          setEditModule(null)
          setNewModuleOpen(false)
          reload()
        }}
      />

      <LessonFormDialog
        open={!!editLesson}
        onOpenChange={(v) => {
          if (!v) setEditLesson(null)
        }}
        initial={editLesson?.lesson}
        onSubmit={async (data) => {
          if (!editLesson) return
          if (editLesson.lesson) {
            const { kind: _omitKind, ...rest } = data
            void _omitKind
            await updateLesson(editLesson.lesson._id, rest)
            toast.success('Lesson saved')
          } else {
            await createLesson(editLesson.moduleId, data)
            toast.success('Lesson added')
          }
          setEditLesson(null)
          reload()
        }}
      />

      <ResourceFormDialog
        open={!!resourceDialog}
        onOpenChange={(v) => {
          if (!v) setResourceDialog(null)
        }}
        scope={
          resourceDialog ?? {
            courseId: id,
          }
        }
        onSubmitLink={async (payload) => {
          await createResource(payload)
          toast.success('Resource added')
          setResourceDialog(null)
          reload()
        }}
        onSubmitFile={async (payload) => {
          await uploadResource(payload)
          toast.success('File uploaded')
          setResourceDialog(null)
          reload()
        }}
      />
    </div>
  )
}

function CurriculumPane(props: {
  curriculum: CurriculumCourse
  onAddModule: () => void
  onEditModule: (m: CurriculumModule) => void
  onDeleteModule: (m: CurriculumModule) => void
  onAddLesson: (moduleId: string) => void
  onEditLesson: (moduleId: string, lesson: CurriculumLesson) => void
  onDeleteLesson: (l: Lesson) => void
  onAddResource: (scope: {
    courseId: string
    moduleId?: string
    lessonId?: string
  }) => void
  onDeleteResource: (r: Resource) => void
}) {
  const c = props.curriculum
  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-2xl border-border/70">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Course-wide resources</CardTitle>
            <CardDescription>
              Notes, links and files available across the whole course.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={() => props.onAddResource({ courseId: c._id })}
          >
            <PlusCircle className="size-4" />
            Add resource
          </Button>
        </CardHeader>
        <CardContent>
          {c.resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No course-wide resources yet.</p>
          ) : (
            <ul className="space-y-2">
              {c.resources.map((r) => (
                <ResourceRow
                  key={r._id}
                  resource={r}
                  onDelete={() => props.onDeleteResource(r)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Modules & lessons</CardTitle>
            <CardDescription>
              Break the course into chapters, each with live classes, videos, or exams.
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="rounded-xl"
            onClick={props.onAddModule}
          >
            <PlusCircle className="size-4" />
            Add module
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {c.modules.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No modules yet"
              description="Add your first module — for example a chapter, week, or unit."
            />
          ) : null}

          {c.modules.map((m, mi) => (
            <div
              key={m._id}
              className="rounded-2xl border border-border/70 bg-muted/30 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
                    <span className="inline-flex size-6 items-center justify-center rounded-md bg-brand-gradient text-[11px] font-bold text-primary-foreground shadow-sm">
                      {mi + 1}
                    </span>
                    {m.title}
                  </h3>
                  {m.description ? (
                    <p className="mt-1.5 max-w-prose text-xs leading-relaxed text-muted-foreground">
                      {m.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg"
                    onClick={() => props.onAddLesson(m._id)}
                  >
                    <PlusCircle className="size-3.5" />
                    Lesson
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg"
                    onClick={() =>
                      props.onAddResource({ courseId: c._id, moduleId: m._id })
                    }
                  >
                    <PlusCircle className="size-3.5" />
                    Resource
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-lg"
                    onClick={() => props.onEditModule(m)}
                    aria-label="Edit module"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => props.onDeleteModule(m)}
                    aria-label="Delete module"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {m.resources.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {m.resources.map((r) => (
                    <ResourceRow
                      key={r._id}
                      resource={r}
                      onDelete={() => props.onDeleteResource(r)}
                    />
                  ))}
                </ul>
              ) : null}

              <ul className="mt-3 space-y-2">
                {m.lessons.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-border/70 bg-card/50 px-3 py-2.5 text-xs text-muted-foreground">
                    No lessons in this module yet.
                  </li>
                ) : null}
                {m.lessons.map((les, li) => {
                  const Icon = LESSON_ICONS[les.kind]
                  return (
                    <li
                      key={les._id}
                      className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3"
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">
                              {li + 1}. {les.title}
                            </p>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {LESSON_LABELS[les.kind]}
                            </span>
                            {les.durationMinutes ? (
                              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand">
                                {les.durationMinutes} min
                              </span>
                            ) : null}
                            {les.kind === 'live_class' && les.scheduledAt ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                                {new Date(les.scheduledAt).toLocaleString()}
                              </span>
                            ) : null}
                          </div>
                          {les.description ? (
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {les.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-lg"
                            onClick={() =>
                              props.onAddResource({
                                courseId: c._id,
                                moduleId: m._id,
                                lessonId: les._id,
                              })
                            }
                          >
                            <PlusCircle className="size-3.5" />
                            Resource
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 rounded-lg"
                            onClick={() => props.onEditLesson(m._id, les)}
                            aria-label="Edit lesson"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => props.onDeleteLesson(les)}
                            aria-label="Delete lesson"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      {les.resources.length > 0 ? (
                        <ul className="ml-11 space-y-1.5">
                          {les.resources.map((r) => (
                            <ResourceRow
                              key={r._id}
                              resource={r}
                              onDelete={() => props.onDeleteResource(r)}
                              small
                            />
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function ResourceRow({
  resource,
  onDelete,
  small,
}: {
  resource: Resource
  onDelete: () => void
  small?: boolean
}) {
  const sizeKb =
    typeof resource.fileSizeBytes === 'number'
      ? Math.max(1, Math.round(resource.fileSizeBytes / 1024))
      : null
  const href =
    resource.kind === 'link'
      ? resource.url
      : resource.kind === 'file'
        ? resourceFileUrl(resource._id)
        : undefined
  return (
    <li
      className={`flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card ${
        small ? 'px-2 py-1.5' : 'px-3 py-2'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase">
            {resource.kind}
          </Badge>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-medium text-foreground hover:text-brand hover:underline"
            >
              {resource.title}
            </a>
          ) : (
            <span className="truncate text-sm font-medium">{resource.title}</span>
          )}
          {sizeKb ? (
            <span className="text-[10px] text-muted-foreground">
              {sizeKb} KB
            </span>
          ) : null}
        </div>
        {resource.description ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {resource.description}
          </p>
        ) : null}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="size-7 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        aria-label="Delete resource"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  )
}

function EnrollmentsPane({
  enrollments,
  onRemove,
}: {
  enrollments: Enrollment[]
  onRemove: (e: Enrollment) => void
}) {
  if (!enrollments.length) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No enrollments yet"
        description="Once students enroll from the mobile app, they'll appear here."
      />
    )
  }
  return (
    <Card className="rounded-2xl border-border/70">
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Enrolled</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e) => (
              <tr key={e._id} className="border-b border-border/40">
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {e.student?.name?.trim() || e.student?.email || 'Student'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {e.student?.email}
                  </div>
                </td>
                <td className="px-4 py-3 capitalize">{e.status}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-brand"
                        style={{ width: `${e.progressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {e.progressPercent}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatRelative(e.enrolledAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onRemove(e)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function OverviewPane({ course }: { course: CurriculumCourse }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle className="text-base">About this course</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-foreground">
          {course.description || (
            <span className="text-muted-foreground">No description yet.</span>
          )}
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Learning outcomes</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-line text-sm leading-relaxed">
          {course.learningOutcomes || (
            <span className="text-muted-foreground">No outcomes listed.</span>
          )}
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Prerequisites</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-line text-sm leading-relaxed">
          {course.prerequisites || (
            <span className="text-muted-foreground">No prerequisites listed.</span>
          )}
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Target audience</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-line text-sm leading-relaxed">
          {course.targetAudience || (
            <span className="text-muted-foreground">No audience listed.</span>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof BookOpen
}) {
  return (
    <Card className="rounded-2xl border-border/70">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

