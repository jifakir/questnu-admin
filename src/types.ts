/* =============================================================
 *  Shared API types — mirrors the NestJS API (api/src/modules/*)
 * ============================================================= */

// --- Auth / users ----------------------------------------------------------

export interface LoginResponse {
  access_token: string
  user: {
    id: string
    email: string
    role: string
    name?: string
    whatsappNumber?: string | null
    avatarUrl?: string | null
    avatarRequiresAuth?: boolean
  }
}

export interface StaffProfile {
  id: string
  email: string
  role: string
  name: string
  whatsappNumber: string | null
}

export interface Student {
  id: string
  email: string
  name?: string
  whatsappNumber?: string | null
  avatarUrl?: string | null
  avatarRequiresAuth?: boolean
  collegeCode?: string | null
  college?: {
    code: string
    name: string
    email?: string | null
    address?: string | null
    upazilla?: string | null
    district?: string | null
    division?: string | null
  } | null
  collegeName?: string | null
  department?: string | null
  currentYear?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Instructor {
  id: string
  email: string
  name?: string
  whatsappNumber?: string | null
  createdAt?: string
  updatedAt?: string
}

// --- Exam Evaluation ------------------------------------------------------

export type PaperStatus =
  | 'processing'
  | 'pending_review'
  | 'ai_failed'
  | 'approved'

export interface Paper {
  _id: string
  studentId: string
  courseId?: string
  moduleId?: string
  lessonId?: string
  imagePaths: string[]
  imageMimeTypes: string[]
  status: PaperStatus
  geminiResponse?: unknown
  instructorFeedback?: unknown
  reviewedBy?: string
  approvedAt?: string
  assignmentKey?: string
  courseTitle?: string
  examTitle?: string
  createdAt?: string
  updatedAt?: string
}

// --- LMS: Courses ---------------------------------------------------------

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'mixed'
export type CourseStatus = 'draft' | 'published'

export interface Course {
  _id: string
  title: string
  code?: string
  subtitle?: string
  description?: string
  coverImageUrl?: string
  learningOutcomes?: string
  prerequisites?: string
  targetAudience?: string
  estimatedHours?: number
  language?: string
  level?: CourseLevel
  tags?: string[]
  status?: CourseStatus
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

/** Course list response also carries aggregated counts. */
export interface CourseListItem extends Course {
  modules?: number
  lessons?: number
  enrollments?: number
}

export type CourseWritePayload = Partial<
  Pick<
    Course,
    | 'title'
    | 'code'
    | 'subtitle'
    | 'description'
    | 'coverImageUrl'
    | 'learningOutcomes'
    | 'prerequisites'
    | 'targetAudience'
    | 'estimatedHours'
    | 'language'
    | 'level'
    | 'tags'
    | 'status'
  >
> & { title: string }

// --- LMS: Modules ---------------------------------------------------------

export interface CourseModule {
  _id: string
  courseId: string
  title: string
  description?: string
  order: number
  createdAt?: string
  updatedAt?: string
}

export type ModuleWritePayload = {
  title: string
  description?: string
  order?: number
}

// --- LMS: Lessons ---------------------------------------------------------

export type LessonKind = 'live_class' | 'video_class' | 'exam'

export interface Lesson {
  _id: string
  courseId: string
  moduleId: string
  kind: LessonKind
  title: string
  description?: string
  order: number

  // live_class
  scheduledAt?: string
  durationMinutes?: number
  meetingUrl?: string
  meetingProvider?: string
  studentPreparation?: string

  // video_class
  videoUrl?: string
  videoThumbnailUrl?: string
  videoDurationSeconds?: number

  // exam
  examInstructions?: string
  examDurationMinutes?: number
  examDueAt?: string
  examAiEvaluation?: boolean

  createdAt?: string
  updatedAt?: string
}

export type LessonWritePayload = {
  kind: LessonKind
  title: string
  description?: string
  order?: number

  scheduledAt?: string | null
  durationMinutes?: number
  meetingUrl?: string
  meetingProvider?: string
  studentPreparation?: string

  videoUrl?: string
  videoThumbnailUrl?: string
  videoDurationSeconds?: number

  examInstructions?: string
  examDurationMinutes?: number
  examDueAt?: string | null
  examAiEvaluation?: boolean
}

// --- LMS: Resources -------------------------------------------------------

export type ResourceKind = 'link' | 'file' | 'note'

export interface Resource {
  _id: string
  courseId: string
  moduleId?: string
  lessonId?: string
  kind: ResourceKind
  title: string
  description?: string
  url?: string
  body?: string
  fileRel?: string
  fileMimeType?: string
  fileOriginalName?: string
  fileSizeBytes?: number
  order: number
  createdAt?: string
  updatedAt?: string
}

// --- LMS: Enrollments ----------------------------------------------------

export type EnrollmentStatus = 'active' | 'completed' | 'dropped'

export interface Enrollment {
  _id: string
  studentId: string
  courseId: string
  status: EnrollmentStatus
  enrolledAt: string
  completedAt?: string
  progressPercent: number
  createdAt?: string
  updatedAt?: string
  student?: { _id: string; email: string; name?: string } | null
  course?: Course | null
}

// --- LMS: Curriculum aggregate (admin) ----------------------------------

export interface CurriculumLesson extends Lesson {
  resources: Resource[]
}
export interface CurriculumModule extends CourseModule {
  lessons: CurriculumLesson[]
  resources: Resource[]
}
export interface CurriculumCourse extends Course {
  modules: CurriculumModule[]
  resources: Resource[]
}

// --- Academics (offline catalog drafts) ----------------------------------

export type AcademicDraftStatus = 'draft' | 'ready'
export type QuestionType = 'mcq' | 'short' | 'broad'

export interface AcademicDepartment {
  _id: string
  slug: string
  name: string
  nameBn?: string
  sortOrder: number
  subjectCount?: number
}

export interface AcademicYear {
  _id: string
  slug: string
  label: string
  labelBn?: string
  sortOrder: number
}

export interface AcademicCollege {
  _id: string
  slug: string
  name: string
  nameBn?: string
  district?: string
  sortOrder: number
}

export interface SubjectOutcome {
  id: string
  text: string
  mappedPlos?: string[]
}

export interface SubjectOutlineUnit {
  unit: string
  topic: string
  hours?: number | null
  teachingStrategies?: string[]
  clos?: string[]
}

export interface AcademicSubjectSummary {
  _id: string
  slug: string
  departmentId: string
  yearId: string
  code: string
  title: string
  titleBn?: string
  marks: number
  credits: number
  classHours?: number | null
  orientation?: string
  status: AcademicDraftStatus
  /** Includes `old` when the course has no syllabus details. */
  tags?: string[]
  updatedAt?: string
}

export interface AcademicSubject extends AcademicSubjectSummary {
  examDuration?: string
  description?: string
  introduction?: string
  objectives?: string[]
  outcomes?: SubjectOutcome[]
  prescribedTexts?: string[]
  outline?: SubjectOutlineUnit[]
  labDetails?: string
  books?: string[]
}

export interface QuestionOption {
  id: string
  text: string
  textBn?: string
}

export interface AcademicQuestion {
  _id: string
  slug: string
  subjectSlug: string
  departmentId: string
  yearId: string
  unit?: string
  type: QuestionType
  prompt: string
  promptBn?: string
  options?: QuestionOption[]
  correctOptionId?: string
  answer?: string
  marks: number
  session?: string
  tags?: string[]
  status: AcademicDraftStatus
  updatedAt?: string
}

export interface AcademicsOverview {
  colleges: number
  departments: number
  years: number
  subjects: number
  questions: number
  draftSubjects: number
  readySubjects: number
  subjectsByYear: { yearId: string; count: number }[]
  departmentCoverage: {
    slug: string
    name: string
    nameBn?: string
    subjects: number
    ready: number
  }[]
  yearCoverage: {
    slug: string
    label: string
    labelBn?: string
    subjects: number
  }[]
  publishing: string
}

export interface AcademicCourse {
  code: string
  title: string
  titleBn?: string
  marks: number
  credits: number
  status: AcademicDraftStatus
  /** Includes `old` when the course has no syllabus details. */
  tags?: string[]
  departments: string[]
  offerings: { departmentId: string; yearId: string; subjectSlugs: string[] }[]
}

export interface AcademicCourseDetail extends AcademicCourse {
  classHours?: number | null
  examDuration?: string
  orientation?: string
  description?: string
  introduction?: string
  objectives?: string[]
  outcomes?: SubjectOutcome[]
  prescribedTexts?: string[]
  outline?: SubjectOutlineUnit[]
  labDetails?: string
  books?: string[]
}

export interface CourseUploadResult {
  courses: number
  created: number
  linked: number
  codes: string[]
}

export interface SubjectImportResult {
  created: number
  updated: number
  failed: number
  departmentsCreated: string[]
  yearsCreated: string[]
  errors: { slug?: string; message: string }[]
}

export interface BootstrapResult {
  departments: { created: number; updated: number; total: number }
  years: { created: number; updated: number; total: number }
  colleges: { created: number; updated: number; total: number }
}

export interface AppCatalogSyncResult {
  structure: {
    departments: { created: number; unchanged: number; total: number }
    years: { created: number; unchanged: number; total: number }
    colleges: { created: number; unchanged: number; total: number }
  }
  syllabusRoot: string | null
  subjects: {
    created: number
    updated: number
    skipped: number
    failed: number
    files: number
    errors?: { slug?: string; message: string }[]
  }
}
